import { describe, expect, it } from "vitest";

import { fieldMessage } from "@/server/field-messages";

describe("fieldMessage", () => {
  it("asks for a missing value", () => {
    expect(fieldMessage("REQUIRED", "your email")).toBe("Enter your email.");
  });

  it("starts a sentence with the label in upper case", () => {
    expect(fieldMessage("TOO_LONG", "the product name")).toBe("The product name is too long.");
  });

  it("words a conflict without the label", () => {
    expect(fieldMessage("SKU_TAKEN", "the SKU")).toBe("Another variant already uses this SKU.");
  });
});
