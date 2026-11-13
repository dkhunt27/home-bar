// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  cleanCode,
  isFullCode,
  isPasskeyCancel,
  passkeyErrorMessage,
  passkeyName,
} from "./sign-in";

describe("cleanCode", () => {
  it("keeps digits only", () => {
    expect(cleanCode(" 123 456 ")).toBe("123456");
    expect(cleanCode("12-34-56-78")).toBe("12345678");
  });

  it("stops at the longest code", () => {
    expect(cleanCode("123456789012")).toBe("1234567890");
  });
});

describe("isFullCode", () => {
  it("takes the local 6 digits and the hosted 8", () => {
    expect(isFullCode("123456")).toBe(true);
    expect(isFullCode("12345678")).toBe(true);
  });

  it("rejects a short code", () => {
    expect(isFullCode("")).toBe(false);
    expect(isFullCode("12345")).toBe(false);
  });
});

describe("passkeyName", () => {
  it("says Face ID on an iPhone", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
    expect(passkeyName(ua)).toBe("Face ID");
  });

  it("says passkey everywhere else", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
    expect(passkeyName(ua)).toBe("passkey");
  });
});

describe("isPasskeyCancel", () => {
  it("treats a dismissed sheet as a cancel", () => {
    const err = {
      code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
      cause: { name: "NotAllowedError" },
    };
    expect(isPasskeyCancel(err)).toBe(true);
  });

  it("treats a replaced ceremony as a cancel", () => {
    expect(isPasskeyCancel({ code: "ERROR_CEREMONY_ABORTED" })).toBe(true);
  });

  it("leaves real errors alone", () => {
    expect(isPasskeyCancel({ code: "passkey_disabled", name: "AuthApiError" })).toBe(false);
    expect(isPasskeyCancel(null)).toBe(false);
  });
});

describe("passkeyErrorMessage", () => {
  it("says nothing when they backed out", () => {
    expect(passkeyErrorMessage({ cause: { name: "NotAllowedError" } })).toBeNull();
  });

  it("explains passkeys being off on the server", () => {
    expect(passkeyErrorMessage({ code: "passkey_disabled" })).toBe(
      "Passkey sign-in isn't switched on yet.",
    );
  });

  it("explains a second passkey on the same device", () => {
    expect(passkeyErrorMessage({ code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" })).toBe(
      "This device already has one.",
    );
  });
});
