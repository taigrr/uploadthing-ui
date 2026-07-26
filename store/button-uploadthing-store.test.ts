import { beforeEach, describe, expect, test } from "bun:test";

import {
  UploadFile,
  useUploadthingStore,
} from "@/store/button-uploadthing-store";

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

    expect(useUploadthingStore.getState().files).toEqual([
      firstFile,
      secondFile,
    ]);
    expect(useUploadthingStore.getState().historicFiles).toEqual([
      firstFile,
      secondFile,
    ]);
  });

  test("does not duplicate historic files with the same id", () => {
    const firstFile = createUploadFile("first");

    useUploadthingStore.getState().setFiles([firstFile]);
    useUploadthingStore.getState().setFiles([firstFile]);

    expect(useUploadthingStore.getState().historicFiles).toHaveLength(1);
  });

  test("updates and removes files from upload history", () => {
    const firstFile = createUploadFile("first");
    const secondFile = createUploadFile("second");

    useUploadthingStore.getState().setFiles([firstFile, secondFile]);
    useUploadthingStore
      .getState()
      .updateFileStatus("first", "complete", "https://example.com/file.txt");
    useUploadthingStore.getState().removeFile("second");

    expect(useUploadthingStore.getState().historicFiles).toEqual([
      {
        ...firstFile,
        status: "complete",
        url: "https://example.com/file.txt",
      },
    ]);
  });
});
