import { ISSUE_PRIORITY, ISSUE_STATUS } from "../core/config.js";
import { normalizeWhitespace } from "../core/utils.js";

const VALID_STATUSES = new Set(Object.values(ISSUE_STATUS));
const VALID_PRIORITIES = new Set(Object.values(ISSUE_PRIORITY));

export class IssueService {
  constructor(repository) {
    this.repository = repository;
  }

  list() {
    return this.repository.listIssues();
  }

  get(id) {
    return this.repository.getIssue(id);
  }

  getUsers() {
    return this.repository.getUsers();
  }

  getTags() {
    return this.repository.getTags();
  }

  async save(formValue) {
    const issue = this.#normalize(formValue);
    this.#validate(issue);
    return this.repository.saveIssue(issue);
  }

  delete(id) {
    return this.repository.deleteIssue(id);
  }

  exportData() {
    return this.repository.exportData();
  }

  importData(snapshot) {
    return this.repository.importData(this.#normalizeSnapshot(snapshot));
  }

  reset() {
    return this.repository.reset();
  }

  #normalizeSnapshot(snapshot) {
    if (!snapshot?.data || !Array.isArray(snapshot.data.issues)) {
      throw new Error(
        "The import file does not contain valid IssueFlow data.",
      );
    }

    const users = (snapshot.data.users ?? []).map((user) => ({
      id: Number(user.id),
      name: normalizeWhitespace(user.name),
      email: String(user.email ?? "").trim(),
    }));

    const tags = (snapshot.data.tags ?? []).map((tag) => ({
      id: Number(tag.id),
      name: normalizeWhitespace(tag.name),
    }));

    if (
      users.some(
        (user) => !Number.isInteger(user.id) || !user.name || !user.email,
      )
    ) {
      throw new Error("The import contains an invalid user record.");
    }

    if (tags.some((tag) => !Number.isInteger(tag.id) || !tag.name)) {
      throw new Error("The import contains an invalid tag record.");
    }

    const userIds = new Set(users.map((user) => user.id));
    const tagIds = new Set(tags.map((tag) => tag.id));

    const issues = snapshot.data.issues.map((rawIssue) => {
      const normalized = this.#normalize(rawIssue);
      this.#validate(normalized);

      const id = Number(rawIssue.id);
      if (!Number.isInteger(id)) {
        throw new Error("The import contains an issue with an invalid id.");
      }

      if (!userIds.has(normalized.assigneeId)) {
        throw new Error(`Issue #${id} references an unknown assignee.`);
      }

      if (normalized.tagIds.some((tagId) => !tagIds.has(tagId))) {
        throw new Error(`Issue #${id} references an unknown tag.`);
      }

      return {
        ...normalized,
        id,
        createdAt: String(rawIssue.createdAt ?? new Date().toISOString()),
        updatedAt: String(
          rawIssue.updatedAt ??
            rawIssue.createdAt ??
            new Date().toISOString(),
        ),
      };
    });

    const activity = Array.isArray(snapshot.data.activity)
      ? snapshot.data.activity.filter((entry) =>
          Number.isInteger(Number(entry.id)),
        )
      : [];

    return {
      ...snapshot,
      data: { issues, users, tags, activity },
    };
  }

  #normalize(value) {
    const numericId = value.id ? Number(value.id) : null;

    return {
      ...(Number.isInteger(numericId) ? { id: numericId } : {}),
      ...(value.createdAt ? { createdAt: value.createdAt } : {}),
      title: normalizeWhitespace(value.title),
      description: String(value.description ?? "").trim(),
      status: String(value.status ?? ""),
      priority: String(value.priority ?? ""),
      assigneeId: value.assigneeId ? Number(value.assigneeId) : null,
      tagIds: [
        ...new Set((value.tagIds ?? []).map(Number).filter(Number.isInteger)),
      ],
      dueDate: String(value.dueDate ?? ""),
    };
  }

  #validate(issue) {
    const errors = [];

    if (issue.title.length < 5 || issue.title.length > 120) {
      errors.push("Title must contain between 5 and 120 characters.");
    }

    if (!VALID_STATUSES.has(issue.status)) {
      errors.push("Select a valid status.");
    }

    if (!VALID_PRIORITIES.has(issue.priority)) {
      errors.push("Select a valid priority.");
    }

    if (!Number.isInteger(issue.assigneeId)) {
      errors.push("Select an assignee.");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(issue.dueDate)) {
      errors.push("Choose a valid due date.");
    }

    if (issue.description.length > 3000) {
      errors.push("Description cannot exceed 3000 characters.");
    }

    if (errors.length) {
      throw new Error(errors.join(" "));
    }
  }
}
