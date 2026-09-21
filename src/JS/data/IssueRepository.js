import {
  APP_CONFIG,
  SEED_TAGS,
  SEED_USERS,
  buildSeedIssues,
} from "../core/config.js";

export class IssueRepository {
  constructor(db) {
    this.db = db;
  }

  async seedIfNeeded() {
    const count = await this.db.issues.count();
    if (count > 0) return;

    await this.db.transaction(
      "rw",
      this.db.users,
      this.db.tags,
      this.db.issues,
      async () => {
        await this.db.users.bulkPut(SEED_USERS.map((user) => ({ ...user })));
        await this.db.tags.bulkAdd(SEED_TAGS.map((tag) => ({ ...tag })));

        const tags = await this.db.tags.toArray();
        const tagMap = Object.fromEntries(
          tags.map((tag) => [tag.name, tag.id]),
        );
        await this.db.issues.bulkAdd(buildSeedIssues(tagMap));
      },
    );
  }

  async listIssues() {
    const [issues, users, tags] = await Promise.all([
      this.db.issues.orderBy("updatedAt").reverse().toArray(),
      this.db.users.toArray(),
      this.db.tags.toArray(),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

    return issues.map((issue) => ({
      ...issue,
      assignee: userMap.get(issue.assigneeId) ?? null,
      tags: (issue.tagIds ?? [])
        .map((tagId) => tagMap.get(tagId))
        .filter(Boolean),
    }));
  }

  async getIssue(id) {
    const issue = await this.db.issues.get(Number(id));
    if (!issue) return null;

    const [assignee, tags] = await Promise.all([
      issue.assigneeId ? this.db.users.get(issue.assigneeId) : null,
      this.db.tags.bulkGet(issue.tagIds ?? []),
    ]);

    return {
      ...issue,
      assignee: assignee ?? null,
      tags: tags.filter(Boolean),
    };
  }

  getUsers() {
    return this.db.users.orderBy("name").toArray();
  }

  getTags() {
    return this.db.tags.orderBy("name").toArray();
  }

  async saveIssue(issue) {
    const timestamp = new Date().toISOString();
    const isUpdate = Number.isInteger(issue.id);

    return this.db.transaction(
      "rw",
      this.db.issues,
      this.db.activity,
      async () => {
        const payload = {
          ...issue,
          updatedAt: timestamp,
          createdAt: issue.createdAt ?? timestamp,
        };

        const id = isUpdate
          ? (await this.db.issues.put(payload), issue.id)
          : await this.db.issues.add(payload);

        await this.db.activity.add({
          issueId: id,
          type: isUpdate ? "updated" : "created",
          createdAt: timestamp,
        });

        return id;
      },
    );
  }

  async deleteIssue(id) {
    const issueId = Number(id);
    const timestamp = new Date().toISOString();

    await this.db.transaction(
      "rw",
      this.db.issues,
      this.db.activity,
      async () => {
        await this.db.issues.delete(issueId);
        await this.db.activity.add({
          issueId,
          type: "deleted",
          createdAt: timestamp,
        });
      },
    );
  }

  async exportData() {
    const [issues, users, tags, activity] = await Promise.all([
      this.db.issues.toArray(),
      this.db.users.toArray(),
      this.db.tags.toArray(),
      this.db.activity.toArray(),
    ]);

    return {
      schemaVersion: APP_CONFIG.exportVersion,
      exportedAt: new Date().toISOString(),
      data: { issues, users, tags, activity },
    };
  }

  async importData(snapshot) {
    this.#assertSnapshot(snapshot);

    await this.db.transaction(
      "rw",
      this.db.issues,
      this.db.users,
      this.db.tags,
      this.db.activity,
      async () => {
        await Promise.all([
          this.db.issues.clear(),
          this.db.users.clear(),
          this.db.tags.clear(),
          this.db.activity.clear(),
        ]);

        await this.db.users.bulkPut(snapshot.data.users ?? []);
        await this.db.tags.bulkPut(snapshot.data.tags ?? []);
        await this.db.issues.bulkPut(snapshot.data.issues ?? []);
        await this.db.activity.bulkPut(snapshot.data.activity ?? []);
      },
    );
  }

  async reset() {
    await this.db.delete();
    await this.db.open();
    await this.seedIfNeeded();
  }

  #assertSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new Error("Invalid import file.");
    }

    if (snapshot.schemaVersion !== APP_CONFIG.exportVersion) {
      throw new Error(
        `Unsupported schema version: ${snapshot.schemaVersion ?? "unknown"}.`,
      );
    }

    if (!snapshot.data || !Array.isArray(snapshot.data.issues)) {
      throw new Error("The import does not contain a valid issues array.");
    }
  }
}
