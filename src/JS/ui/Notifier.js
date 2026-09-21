export class Notifier {
  constructor(element) {
    this.element = element;
    this.toast = bootstrap.Toast.getOrCreateInstance(element, {
      delay: 2800,
    });
    this.$body = $(element).find(".toast-body");
  }

  show(message) {
    this.$body.text(message);
    this.toast.show();
  }
}
