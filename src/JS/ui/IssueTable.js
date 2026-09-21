import { PRIORITY_META, STATUS_META } from "../core/config.js";
import { escapeHtml, formatDate, isOverdue } from "../core/utils.js";

export class IssueTable {
  #table;
  #rows = [];
  #filters = { status: "", priority: "" };

  constructor(selector, handlers) {
    this.$element = $(selector);
    this.handlers = handlers;
  }

  initialize() {
    this.#table = this.$element.DataTable({
      data: [],
      pageLength: 8,
      lengthMenu: [4, 8, 15, 30],
      order: [[0, "desc"]],
      autoWidth: false,
      columns: [
        { data: "id", width: "64px" },
        {
          data: "title",
          render: (value, type, row) => {
            if (type !== "display") return value;
            const overdue = isOverdue(row)
              ? '<span class="badge text-bg-danger ms-2">Overdue</span>'
              : "";
            return `<button class="btn btn-link issue-title-link p-0 text-start" data-action="view" data-id="${row.id}">${escapeHtml(value)}</button>${overdue}`;
          },
        },
        {
          data: "priority",
          render: (value, type) => {
            if (type !== "display") return value;
            const meta = PRIORITY_META[value];
            return `<span class="priority-pill ${meta.badgeClass}">${escapeHtml(meta.label)}</span>`;
          },
        },
        {
          data: "status",
          render: (value, type) => {
            if (type !== "display") return value;
            const meta = STATUS_META[value];
            return `<span class="badge rounded-pill ${meta.badgeClass}">${escapeHtml(meta.label)}</span>`;
          },
        },
        {
          data: "assignee",
          render: (value, type) =>
            type === "display"
              ? escapeHtml(value?.name ?? "Unassigned")
              : (value?.name ?? ""),
        },
        {
          data: "dueDate",
          render: (value, type) =>
            type === "display" ? escapeHtml(formatDate(value)) : value,
        },
        {
          data: null,
          orderable: false,
          searchable: false,
          width: "126px",
          render: (_, type, row) => {
            if (type !== "display") return "";
            return `
              <div class="btn-group btn-group-sm" role="group" aria-label="Issue actions">
                <button class="btn btn-outline-secondary" type="button" data-action="edit" data-id="${row.id}">Edit</button>
                <button class="btn btn-outline-danger" type="button" data-action="delete" data-id="${row.id}">Delete</button>
              </div>`;
          },
        },
      ],
      language: {
        search: "Search:",
        searchPlaceholder: "title, owner…",
        emptyTable: "No issues match the current filters.",
        zeroRecords: "No matching issues found.",
        info: "Showing _START_–_END_ of _TOTAL_ issues",
        infoEmpty: "No issues",
        lengthMenu: "Show _MENU_",
      },
    });

    this.$element.on("click", "[data-action]", (event) => {
      const button = event.currentTarget;
      const id = Number(button.dataset.id);
      const action = button.dataset.action;
      this.handlers[action]?.(id);
    });
  }

  setRows(issues) {
    this.#rows = [...issues];
    this.#render();
  }

  setFilter(name, value) {
    if (!(name in this.#filters)) return;
    this.#filters[name] = value;
    this.#render();
  }

  #render() {
    const filtered = this.#rows.filter((issue) => {
      const statusMatches =
        !this.#filters.status || issue.status === this.#filters.status;
      const priorityMatches =
        !this.#filters.priority || issue.priority === this.#filters.priority;
      return statusMatches && priorityMatches;
    });

    this.#table.clear();
    this.#table.rows.add(filtered);
    this.#table.draw(false);
  }
}
