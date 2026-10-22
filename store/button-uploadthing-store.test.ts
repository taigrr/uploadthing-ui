import { beforeEach, describe, expect, test } from "bun:test";

import type { UploadFile } from "@/store/button-uploadthing-store";
import { useUploadthingStore } from "@/store/button-uploadthing-store";

function createUploadFile(id: string, name = `${id}.txt`): UploadFile {
  return {
    id,
    file: new File(["content"], name, { type: "text/plain" }),
    status: "pending",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };
}

describe("useUploadthingStore", () => {
  beforeEach(() => {
    useUploadthingStore.setState({ files: [], historicFiles: [] });
  });

  test("tracks current files and appends new historic files", () => {
    const firstFile = createUploadFile("first");
    const secondFile = createUploadFile("second");

    useUploadthingStore.getState().setFiles([firstFile]);
    useUploadthingStore.getState().setFiles([firstFile, secondFile]);

    expect(useUploadthingStore.getState().files).toEqual([firstFile, secondFile]);
    expect(useUploadthingStore.getState().historicFiles).toEqual([firstFile, secondFile]);
  });

  test("does not duplicate historic files with the same id", () => {
    const firstFile = createUploadFile("first");

    useUploadthingStore.getState().setFiles([firstFile]);
    useUploadthingStore.getState().setFiles([firstFile]);

    expect(useUploadthingStore.getState().historicFiles).toHaveLength(1);
  });

  test("deduplicates IDs within a batch while preserving existing history and selection", () => {
    const existingFile = createUploadFile("existing");
    const firstFile = createUploadFile("first");
    const duplicateFile = createUploadFile("first", "duplicate.txt");
    const secondFile = createUploadFile("second");
    const selection = [existingFile, firstFile, duplicateFile, secondFile];

    useUploadthingStore.getState().setFiles([existingFile]);
    useUploadthingStore.getState().updateFileStatus("existing", "complete", "https://example.com/existing");
    useUploadthingStore.getState().setFiles(selection);

    expect(useUploadthingStore.getState().files).toEqual(selection);
    expect(useUploadthingStore.getState().historicFiles).toEqual([
      { ...existingFile, status: "complete", url: "https://example.com/existing" },
      firstFile,
      secondFile,
    ]);
  });

  test("updates and removes files from upload history", () => {
    const firstFile = createUploadFile("first");
    const secondFile = createUploadFile("second");

    useUploadthingStore.getState().setFiles([firstFile, secondFile]);
    useUploadthingStore.getState().updateFileStatus("first", "complete", "https://example.com/file.txt");
    useUploadthingStore.getState().removeFile("second");

    expect(useUploadthingStore.getState().historicFiles).toEqual([
      {
        ...firstFile,
        status: "complete",
        url: "https://example.com/file.txt",
      },
    ]);
  });

  test("keeps active files in sync when statuses change", () => {
    const firstFile = createUploadFile("first");

    useUploadthingStore.getState().setFiles([firstFile]);
    useUploadthingStore.getState().updateFileStatus("first", "complete", "https://example.com/file.txt");

    expect(useUploadthingStore.getState().files).toEqual([
      {
        ...firstFile,
        status: "complete",
        url: "https://example.com/file.txt",
      },
    ]);
    expect(useUploadthingStore.getState().historicFiles).toEqual([
      {
        ...firstFile,
        status: "complete",
        url: "https://example.com/file.txt",
      },
    ]);
  });
});
