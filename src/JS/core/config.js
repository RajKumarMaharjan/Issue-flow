export const APP_CONFIG = Object.freeze({
  databaseName: "issueflow-db",
  databaseVersion: 1,
  exportVersion: 1,
  trustedTypesPolicyName: "issueflow-html",
});

export const ISSUE_STATUS = Object.freeze({
  OPEN: "open",
  IN_PROGRESS: "in-progress",
  BLOCKED: "blocked",
  DONE: "done",
});

export const ISSUE_PRIORITY = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
});

export const STATUS_META = Object.freeze({
  [ISSUE_STATUS.OPEN]: { label: "Open", badgeClass: "text-bg-primary" },
  [ISSUE_STATUS.IN_PROGRESS]: {
    label: "In progress",
    badgeClass: "text-bg-warning",
  },
  [ISSUE_STATUS.BLOCKED]: { label: "Blocked", badgeClass: "text-bg-danger" },
  [ISSUE_STATUS.DONE]: { label: "Done", badgeClass: "text-bg-success" },
});

export const PRIORITY_META = Object.freeze({
  [ISSUE_PRIORITY.LOW]: { label: "Low", badgeClass: "priority-low" },
  [ISSUE_PRIORITY.MEDIUM]: { label: "Medium", badgeClass: "priority-medium" },
  [ISSUE_PRIORITY.HIGH]: { label: "High", badgeClass: "priority-high" },
  [ISSUE_PRIORITY.CRITICAL]: {
    label: "Critical",
    badgeClass: "priority-critical",
  },
});

export const EVENTS = Object.freeze({
  ISSUES_CHANGED: "issues:changed",
  ISSUE_SELECTED: "issue:selected",
  APP_ERROR: "app:error",
});

export const SEED_USERS = Object.freeze([
  { id: 1, name: "Arianna Conti", email: "arianna@example.test" },
  { id: 2, name: "Luca Ferri", email: "luca@example.test" },
  { id: 3, name: "Marta Bianchi", email: "marta@example.test" },
  { id: 4, name: "Davide Romano", email: "davide@example.test" },
]);

export const SEED_TAGS = Object.freeze([
  { name: "frontend" },
  { name: "backend" },
  { name: "security" },
  { name: "accessibility" },
  { name: "performance" },
  { name: "ux" },
]);

function dateFromToday(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildSeedIssues(tagMap) {
  const now = new Date().toISOString();

  return [
    {
      title: "Checkout keyboard flow skips promo code",
      description:
        "<p>Tab navigation jumps from the cart total directly to <strong>Pay now</strong>.</p><p>Expected: the promo-code field must stay in the natural keyboard order.</p>",
      status: ISSUE_STATUS.OPEN,
      priority: ISSUE_PRIORITY.HIGH,
      assigneeId: 1,
      tagIds: [tagMap.accessibility, tagMap.frontend],
      dueDate: dateFromToday(4),
      createdAt: now,
      updatedAt: now,
    },
    {
      title: "Sanitize imported release notes before preview",
      description:
        "<p>Imported notes are persisted locally. Rendering must cross the <strong>Trusted Types</strong> boundary before reaching the DOM.</p>",
      status: ISSUE_STATUS.IN_PROGRESS,
      priority: ISSUE_PRIORITY.CRITICAL,
      assigneeId: 3,
      tagIds: [tagMap.security, tagMap.frontend],
      dueDate: dateFromToday(2),
      createdAt: now,
      updatedAt: now,
    },
    {
      title: "Slow filtering on large issue lists",
      description:
        "<p>Profile the table when the dataset grows above 5,000 rows and document the result.</p>",
      status: ISSUE_STATUS.BLOCKED,
      priority: ISSUE_PRIORITY.MEDIUM,
      assigneeId: 2,
      tagIds: [tagMap.performance],
      dueDate: dateFromToday(7),
      createdAt: now,
      updatedAt: now,
    },
    {
      title: "Improve empty-state copy",
      description:
        "<p>Replace the generic empty message with guidance that explains how to create the first issue.</p>",
      status: ISSUE_STATUS.DONE,
      priority: ISSUE_PRIORITY.LOW,
      assigneeId: 4,
      tagIds: [tagMap.ux],
      dueDate: dateFromToday(-2),
      createdAt: now,
      updatedAt: now,
    },
  ];
}
