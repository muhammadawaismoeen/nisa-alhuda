import { describe, it, expect } from "vitest";
import { ok, fail } from "@/lib/action-result";

describe("ok()", () => {
  it("returns success with no data", () => {
    const result = ok();
    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it("returns success with string data", () => {
    const result = ok("hello");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("hello");
  });

  it("returns success with object data", () => {
    const result = ok({ id: "abc", name: "Nisa" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ id: "abc", name: "Nisa" });
  });
});

describe("fail()", () => {
  it("returns failure with error string", () => {
    const result = fail("Something went wrong");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Something went wrong");
  });

  it("never has data on failure", () => {
    const result = fail("error");
    expect("data" in result).toBe(false);
  });
});
