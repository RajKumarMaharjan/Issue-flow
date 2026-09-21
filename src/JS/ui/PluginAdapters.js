export class Select2Adapter {
  constructor($modal) {
    this.$modal = $modal;
  }

  enhanceFormSelects() {
    $("#issueAssignee").select2({
      width: "100%",
      dropdownParent: this.$modal,
      placeholder: "Select an assignee",
    });

    $("#issueTags").select2({
      width: "100%",
      dropdownParent: this.$modal,
      placeholder: "Select one or more tags",
      closeOnSelect: false,
    });
  }

  enhanceFilters() {
    $(".js-filter-select").select2({
      width: "100%",
      minimumResultsForSearch: Infinity,
    });
  }
}

export class DatepickerAdapter {
  initialize(selector) {
    $(selector).datepicker({
      dateFormat: "yy-mm-dd",
      firstDay: 1,
      showOtherMonths: true,
      selectOtherMonths: true,
      changeMonth: true,
      changeYear: true,
    });
  }
}
