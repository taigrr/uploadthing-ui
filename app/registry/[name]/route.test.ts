import { describe, expect, spyOn, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { registryItemSchema } from "shadcn/schema";

import registry from "@/registry.json";
import { GET } from "./route";

function requestComponent(name: string) {
  return GET(new Request(`http://localhost/registry/${encodeURIComponent(name)}`), {
    params: Promise.resolve({ name }),
  });
}

describe("registry route", () => {
  for (const component of registry.items) {
    test(`serves ${component.name} with installable source files`, async () => {
      const response = await requestComponent(component.name);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const item = registryItemSchema.parse(await response.json());
      expect(item.name).toBe(component.name);
      expect(item.dependencies).toEqual(component.dependencies);
      expect(item.registryDependencies).toEqual(component.registryDependencies);
      expect(item.files).toHaveLength(component.files.length);

      for (const file of component.files) {
        const servedFile = item.files?.find((candidate) => candidate.path === file.path);
        expect(servedFile?.target).toBe(file.target);
        expect(String(servedFile?.type)).toBe(file.type);
        expect(servedFile?.content).toBe(await readFile(file.path, "utf8"));
      }
    });
  }

  test.each(["missing-component", "../package.json", "button-uploadthing.json"])(
    "returns 404 for unknown name %s",
    async (name) => {
      const response = await requestComponent(name);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Component not found" });
    },
  );

  test("returns a generic error when request parameters fail", async () => {
    const failure = new Error("private request details");
    const consoleError = spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await GET(new Request("http://localhost/registry/error"), {
        params: Promise.reject(failure),
      });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Something went wrong" });
      expect(consoleError).toHaveBeenCalledWith("Error processing component request:", failure);
    } finally {
      consoleError.mockRestore();
    }
  });
});
