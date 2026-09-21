import { ISSUE_STATUS } from "../core/config.js";
import { isOverdue } from "../core/utils.js";

export class Dashboard {
  render(issues) {
    const metrics = {
      open: issues.filter((issue) => issue.status === ISSUE_STATUS.OPEN).length,
      inProgress: issues.filter(
        (issue) => issue.status === ISSUE_STATUS.IN_PROGRESS,
      ).length,
      overdue: issues.filter((issue) => isOverdue(issue)).length,
      done: issues.filter((issue) => issue.status === ISSUE_STATUS.DONE).length,
    };

    $("#metricOpen").text(metrics.open);
    $("#metricInProgress").text(metrics.inProgress);
    $("#metricOverdue").text(metrics.overdue);
    $("#metricDone").text(metrics.done);
  }
}
