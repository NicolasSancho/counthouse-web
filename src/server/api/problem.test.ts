import { describe, expect, it } from "vitest";

import { readTraceId, toProblem } from "@/server/api/problem";

const problem = {
  type: "about:blank",
  title: "Validation failed",
  status: 400,
  code: "VALIDATION_FAILED",
  traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
};

describe("toProblem", () => {
  it("keeps a Problem Details body and its field errors", () => {
    const errors = [{ field: "email", code: "INVALID_FORMAT", message: "must be an email" }];
    expect(toProblem({ ...problem, detail: "1 field is invalid.", errors })).toEqual({
      ...problem,
      detail: "1 field is invalid.",
      errors,
    });
  });

  it.each([
    ["raw text", "<html>Bad gateway</html>"],
    ["null", null],
    ["an array", [problem]],
    ["an unknown code", { ...problem, code: "TEAPOT" }],
    ["a code inherited from Object", { ...problem, code: "toString" }],
    ["a missing status", { ...problem, status: undefined }],
    ["a string status", { ...problem, status: "400" }],
  ])("rejects %s", (_name, value) => {
    expect(toProblem(value)).toBeUndefined();
  });

  it("drops field errors with an unknown code or a missing field", () => {
    const valid = { field: "password", code: "REQUIRED", message: "must not be blank" };
    const errors = [valid, { field: "email", code: "NOPE", message: "x" }, { code: "REQUIRED" }];
    expect(toProblem({ ...problem, errors })?.errors).toEqual([valid]);
  });

  it("drops fields that the contract does not define", () => {
    expect(toProblem({ ...problem, stack: "at Foo.java:1" })).toEqual(problem);
  });
});

describe("readTraceId", () => {
  it("reads the trace id of a body that is not a valid problem", () => {
    expect(readTraceId({ code: "TEAPOT", traceId: "abc" })).toBe("abc");
    expect(readTraceId("text")).toBeUndefined();
  });
});
