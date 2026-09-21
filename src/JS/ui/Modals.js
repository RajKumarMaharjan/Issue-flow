import { PRIORITY_META, STATUS_META } from "../core/config.js";
import { debounce, formatDate } from "../core/utils.js";

export class ConfirmModal {
  constructor(element) {
    this.element = element;
    this.modal = bootstrap.Modal.getOrCreateInstance(element);
    this.$title = $(element).find('[data-role="confirm-title"]');
    this.$message = $(element).find('[data-role="confirm-message"]');
    this.$confirm = $(element).find('[data-role="confirm-button"]');
    this.pendingResolve = null;

    this.$confirm.on("click", () => {
      this.#resolve(true);
      this.modal.hide();
    });

    $(element).on("hidden.bs.modal", () => this.#resolve(false));
  }

  ask({ title, message, confirmLabel = "Confirm", danger = false }) {
    this.$title.text(title);
    this.$message.text(message);
    this.$confirm
      .text(confirmLabel)
      .toggleClass("btn-danger", danger)
      .toggleClass("btn-primary", !danger);

    this.modal.show();

    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }

  #resolve(value) {
    if (!this.pendingResolve) return;
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    resolve(value);
  }
}

export class IssueDetailsModal {
  constructor(element, securityService) {
    this.element = element;
    this.modal = bootstrap.Modal.getOrCreateInstance(element);
    this.securityService = securityService;
    this.currentIssueId = null;
    this.editHandler = null;

    $(element)
      .find('[data-action="edit-current"]')
      .on("click", () => {
        if (!this.currentIssueId) return;
        this.modal.hide();
        this.editHandler?.(this.currentIssueId);
      });
  }

  onEdit(handler) {
    this.editHandler = handler;
  }

  show(issue) {
    this.currentIssueId = issue.id;

    $(this.element).find('[data-role="details-title"]').text(issue.title);
    $(this.element).find('[data-role="details-id"]').text(`#${issue.id}`);
    $(this.element)
      .find('[data-role="details-assignee"]')
      .text(issue.assignee?.name ?? "Unassigned");
    $(this.element)
      .find('[data-role="details-due-date"]')
      .text(formatDate(issue.dueDate));

    const status = STATUS_META[issue.status];
    const $status = $(this.element).find('[data-role="details-status"]');
    $status
      .attr("class", `badge rounded-pill ${status.badgeClass}`)
      .text(status.label);

    const priority = PRIORITY_META[issue.priority];
    const $priority = $(this.element).find('[data-role="details-priority"]');
    $priority
      .attr("class", `priority-pill ${priority.badgeClass}`)
      .text(priority.label);

    const tagsContainer = this.element.querySelector(
      '[data-role="details-tags"]',
    );
    tagsContainer.replaceChildren();
    for (const tag of issue.tags) {
      const badge = document.createElement("span");
      badge.className = "badge rounded-pill text-bg-light border text-dark";
      badge.textContent = tag.name;
      tagsContainer.append(badge);
    }

    this.securityService.setHTML(
      $(this.element).find('[data-role="details-description"]'),
      issue.description || "<p>No description provided.</p>",
    );

    this.modal.show();
  }
}

export class IssueFormModal {
  constructor(element, issueService, securityService, pluginAdapters) {
    this.element = element;
    this.issueService = issueService;
    this.securityService = securityService;
    this.select2 = pluginAdapters.select2;
    this.datepicker = pluginAdapters.datepicker;
    this.modal = bootstrap.Modal.getOrCreateInstance(element);
    this.$form = $(element).find("form");
    this.$error = $(element).find('[data-role="form-error"]');
    this.$preview = $(element).find('[data-role="description-preview"]');
    this.saveHandler = null;
    this.currentIssue = null;
  }

  async initialize() {
    await this.reloadReferenceData();
    this.datepicker.initialize("#issueDueDate");

    this.$form.on("submit", (event) => this.#submit(event));
    $("#issueDescription").on(
      "input",
      debounce(() => this.#updatePreview(), 120),
    );
    $(this.element).on("hidden.bs.modal", () => this.#reset());
  }

  async reloadReferenceData() {
    const [users, tags] = await Promise.all([
      this.issueService.getUsers(),
      this.issueService.getTags(),
    ]);

    for (const selector of ["#issueAssignee", "#issueTags"]) {
      const $select = $(selector);
      if ($select.hasClass("select2-hidden-accessible")) {
        $select.select2("destroy");
      }
    }

    this.#replaceOptions(
      document.querySelector("#issueAssignee"),
      users,
      (user) => ({ value: user.id, label: user.name }),
    );

    this.#replaceOptions(
      document.querySelector("#issueTags"),
      tags,
      (tag) => ({ value: tag.id, label: tag.name }),
    );

    this.select2.enhanceFormSelects();
  }

  onSaved(handler) {
    this.saveHandler = handler;
  }

  openForCreate() {
    this.#reset();
    $(this.element)
      .find('[data-role="form-modal-title"]')
      .text("Create issue");
    $("#issueStatus").val("open");
    $("#issuePriority").val("medium");
    this.#updatePreview();
    this.modal.show();
  }

  openForEdit(issue) {
    this.#reset();
    this.currentIssue = issue;
    $(this.element)
      .find('[data-role="form-modal-title"]')
      .text(`Edit issue #${issue.id}`);

    $("#issueId").val(issue.id);
    $("#issueCreatedAt").val(issue.createdAt);
    $("#issueTitle").val(issue.title);
    $("#issueDescription").val(issue.description);
    $("#issueStatus").val(issue.status);
    $("#issuePriority").val(issue.priority);
    $("#issueDueDate").val(issue.dueDate);
    $("#issueAssignee").val(String(issue.assigneeId)).trigger("change");
    $("#issueTags")
      .val((issue.tagIds ?? []).map(String))
      .trigger("change");

    this.#updatePreview();
    this.modal.show();
  }

  #replaceOptions(select, rows, mapper) {
    const placeholder =
      select.querySelector('option[value=""]')?.cloneNode(true) ?? null;
    select.replaceChildren();
    if (placeholder) select.append(placeholder);

    for (const row of rows) {
      const { value, label } = mapper(row);
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = label;
      select.append(option);
    }
  }

  async #submit(event) {
    event.preventDefault();
    event.stopPropagation();

    const form = this.$form.get(0);
    form.classList.add("was-validated");
    this.$error.addClass("d-none").text("");

    if (!form.checkValidity()) return;

    try {
      const issueId = await this.issueService.save(this.#readValue());
      this.modal.hide();
      await this.saveHandler?.(issueId);
    } catch (error) {
      this.$error.removeClass("d-none").text(error.message);
    }
  }

  #readValue() {
    return {
      id: $("#issueId").val(),
      createdAt: $("#issueCreatedAt").val(),
      title: $("#issueTitle").val(),
      description: $("#issueDescription").val(),
      status: $("#issueStatus").val(),
      priority: $("#issuePriority").val(),
      dueDate: $("#issueDueDate").val(),
      assigneeId: $("#issueAssignee").val(),
      tagIds: $("#issueTags").val() ?? [],
    };
  }

  #updatePreview() {
    const value = $("#issueDescription").val().trim();
    const fallback = "<p>Safe HTML preview will appear here.</p>";
    this.securityService.setHTML(this.$preview, value || fallback);
  }

  #reset() {
    this.currentIssue = null;
    this.$form.get(0).reset();
    this.$form.get(0).classList.remove("was-validated");
    this.$error.addClass("d-none").text("");
    $("#issueId").val("");
    $("#issueCreatedAt").val("");
    $("#issueAssignee").val(null).trigger("change");
    $("#issueTags").val(null).trigger("change");
    this.securityService.clear(this.$preview);
  }
}
