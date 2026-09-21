import { EVENTS } from "./core/config.js";
import { EventBus } from "./core/EventBus.js";
import { downloadJson } from "./core/utils.js";
import { createDatabase } from "./data/database.js";
import { IssueRepository } from "./data/IssueRepository.js";
import { IssueService } from "./services/IssueService.js";
import { TrustedHtmlService } from "./security/TrustedHtmlService.js";
import { Dashboard } from "./ui/Dashboard.js";
import { Notifier } from "./ui/Notifier.js";
import { IssueTable } from "./ui/IssueTable.js";
import { Select2Adapter, DatepickerAdapter } from "./ui/PluginAdapters.js";
import {
  ConfirmModal,
  IssueDetailsModal,
  IssueFormModal,
} from "./ui/Modals.js";

class IssueFlowApp {
  constructor() {
    this.eventBus = new EventBus();
    this.db = createDatabase();
    this.repository = new IssueRepository(this.db);
    this.issueService = new IssueService(this.repository);
    this.securityService = new TrustedHtmlService();
    this.dashboard = new Dashboard();
    this.notifier = new Notifier(document.querySelector("#appToast"));
    this.confirmModal = new ConfirmModal(
      document.querySelector("#confirmModal"),
    );

    const formElement = document.querySelector("#issueFormModal");
    this.pluginAdapters = {
      select2: new Select2Adapter($(formElement)),
      datepicker: new DatepickerAdapter(),
    };

    this.formModal = new IssueFormModal(
      formElement,
      this.issueService,
      this.securityService,
      this.pluginAdapters,
    );

    this.detailsModal = new IssueDetailsModal(
      document.querySelector("#issueDetailsModal"),
      this.securityService,
    );

    this.issueTable = new IssueTable("#issuesTable", {
      view: (id) => this.openDetails(id),
      edit: (id) => this.openEdit(id),
      delete: (id) => this.deleteIssue(id),
    });
  }

  async start() {
    try {
      await this.repository.seedIfNeeded();
      this.issueTable.initialize();
      await this.formModal.initialize();
      this.pluginAdapters.select2.enhanceFilters();
      this.#bindEvents();
      this.#updateCapabilityBadges();
      await this.refresh();
    } catch (error) {
      console.error(error);
      this.#showFatalError(error);
    }
  }

  async refresh() {
    const issues = await this.issueService.list();
    this.issueTable.setRows(issues);
    this.dashboard.render(issues);
  }

  async openDetails(id) {
    const issue = await this.issueService.get(id);
    if (issue) this.detailsModal.show(issue);
  }

  async openEdit(id) {
    const issue = await this.issueService.get(id);
    if (issue) this.formModal.openForEdit(issue);
  }

  async deleteIssue(id) {
    const issue = await this.issueService.get(id);
    if (!issue) return;

    const confirmed = await this.confirmModal.ask({
      title: "Delete issue?",
      message: `“${issue.title}” will be removed from IndexedDB. This action cannot be undone.`,
      confirmLabel: "Delete issue",
      danger: true,
    });

    if (!confirmed) return;

    await this.issueService.delete(id);
    this.eventBus.emit(EVENTS.ISSUES_CHANGED, { message: "Issue deleted." });
  }

  #bindEvents() {
    $("#newIssueButton").on("click", () => this.formModal.openForCreate());

    this.formModal.onSaved(async () => {
      this.eventBus.emit(EVENTS.ISSUES_CHANGED, {
        message: "Issue saved to IndexedDB.",
      });
    });

    this.eventBus.on(EVENTS.ISSUES_CHANGED, async (event) => {
      await this.refresh();
      if (event.detail.message) this.notifier.show(event.detail.message);
    });

    this.detailsModal.onEdit((id) => this.openEdit(id));

    $("#statusFilter").on("change", (event) => {
      this.issueTable.setFilter("status", event.target.value);
    });

    $("#priorityFilter").on("change", (event) => {
      this.issueTable.setFilter("priority", event.target.value);
    });

    $("#exportButton").on("click", async () => {
      const snapshot = await this.issueService.exportData();
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(`issueflow-backup-${date}.json`, snapshot);
      this.notifier.show("JSON backup exported.");
    });

    $("#importButton").on("click", () => $("#importFile").trigger("click"));
    $("#importFile").on("change", (event) => this.#importFile(event));
    $("#resetButton").on("click", () => this.#resetDatabase());

    window.addEventListener("online", () => this.#updateNetworkBadge());
    window.addEventListener("offline", () => this.#updateNetworkBadge());
  }

  async #importFile(event) {
    const [file] = event.target.files;
    event.target.value = "";
    if (!file) return;

    try {
      const raw = await file.text();
      const snapshot = JSON.parse(raw);

      const confirmed = await this.confirmModal.ask({
        title: "Replace local data?",
        message:
          "Importing this file will replace all current IssueFlow data stored in this browser.",
        confirmLabel: "Import backup",
        danger: true,
      });

      if (!confirmed) return;

      await this.issueService.importData(snapshot);
      await this.formModal.reloadReferenceData();
      this.eventBus.emit(EVENTS.ISSUES_CHANGED, {
        message: "Backup imported successfully.",
      });
    } catch (error) {
      console.error(error);
      this.notifier.show(error.message || "Import failed.");
    }
  }

  async #resetDatabase() {
    const confirmed = await this.confirmModal.ask({
      title: "Reset demo data?",
      message:
        "The local database will be deleted and recreated with the original demo dataset.",
      confirmLabel: "Reset database",
      danger: true,
    });

    if (!confirmed) return;

    await this.issueService.reset();
    await this.formModal.reloadReferenceData();
    this.eventBus.emit(EVENTS.ISSUES_CHANGED, {
      message: "Demo database reset.",
    });
  }

  #updateCapabilityBadges() {
    const trustedTypesAvailable = Boolean(window.trustedTypes?.createPolicy);
    $("#trustedTypesStatus")
      .toggleClass("text-bg-success", trustedTypesAvailable)
      .toggleClass("text-bg-secondary", !trustedTypesAvailable)
      .text(
        trustedTypesAvailable
          ? "Trusted Types active"
          : "Trusted Types fallback",
      );

    this.#updateNetworkBadge();
  }

  #updateNetworkBadge() {
    const online = navigator.onLine;
    $("#networkStatus")
      .toggleClass("text-bg-success", online)
      .toggleClass("text-bg-secondary", !online)
      .text(online ? "Online" : "Offline · local data");
  }

  #showFatalError(error) {
    const message = error?.message ?? "Unknown startup error.";
    $("#fatalError")
      .removeClass("d-none")
      .find('[data-role="fatal-message"]')
      .text(message);
  }
}

$(async () => {
  const app = new IssueFlowApp();
  await app.start();
});
