import { describe, expect, test } from "bun:test";

import { capitalizeFirstLetter, formatBytes, getUploadedAmount } from "@/lib/uploadthing-ui-utils";

describe("formatBytes", () => {
  test("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  test("formats invalid byte counts as zero", () => {
    expect(formatBytes(-1)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("0 B");
  });

  test("formats values across size boundaries", () => {
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024, 2)).toBe("5 MB");
  });

  test("caps values larger than the largest known unit", () => {
    expect(formatBytes(1024 ** 8)).toBe("1 YB");
    expect(formatBytes(1024 ** 9)).toBe("1024 YB");
  });

  test("clamps negative decimals to zero", () => {
    expect(formatBytes(1536, -1)).toBe("2 KB");
  });
});

describe("getUploadedAmount", () => {
  test("returns the uploaded amount based on progress", () => {
    expect(getUploadedAmount(25, 2048)).toBe("512 B");
    expect(getUploadedAmount(50, 5 * 1024 * 1024)).toBe("2.5 MB");
  });
});

describe("capitalizeFirstLetter", () => {
  test("capitalizes the first character and preserves the rest", () => {
    expect(capitalizeFirstLetter("uploadthing")).toBe("Uploadthing");
  });

  test("handles empty strings", () => {
    expect(capitalizeFirstLetter("")).toBe("");
  });
});
