export class EventBus {
  #target = new EventTarget();

  on(eventName, listener) {
    this.#target.addEventListener(eventName, listener);
    return () => this.#target.removeEventListener(eventName, listener);
  }

  emit(eventName, detail = {}) {
    this.#target.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
}
