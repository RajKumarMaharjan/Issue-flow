import { APP_CONFIG } from "../core/config.js";

export class TrustedHtmlService {
  #policy;

  constructor() {
    this.#policy = this.#createPolicy();
  }

  #sanitize(input) {
    return DOMPurify.sanitize(String(input ?? ""), {
      RETURN_TRUSTED_TYPE: false,
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "ul",
        "ol",
        "li",
        "code",
        "a",
      ],
      ALLOWED_ATTR: ["href", "title", "target", "rel"],
      ALLOW_DATA_ATTR: false,
    });
  }

  #createPolicy() {
    if (!window.trustedTypes?.createPolicy) {
      return null;
    }

    return window.trustedTypes.createPolicy(
      APP_CONFIG.trustedTypesPolicyName,
      {
        createHTML: (input) => this.#sanitize(input),
      },
    );
  }

  createHTML(input) {
    return this.#policy
      ? this.#policy.createHTML(String(input ?? ""))
      : this.#sanitize(input);
  }

  setHTML($target, input) {
    $target.html(this.createHTML(input));
  }

  clear($target) {
    $target.empty();
  }
}
