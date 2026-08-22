import { describe, expect, test } from "bun:test";

import { cn } from "@/lib/utils";

describe("cn", () => {
  test("merges conditional class names", () => {
    expect(cn("px-2", false && "hidden", "py-1", undefined, null)).toBe("px-2 py-1");
  });

  test("lets tailwind-merge resolve conflicting utilities", () => {
    expect(cn("px-2", "px-4", "text-sm", "text-lg")).toBe("px-4 text-lg");
  });
});
