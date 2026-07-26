import { beforeEach, describe, expect, test } from "bun:test";

import { useGenericDriveStore } from "@/store/button-generic-drive-store";

function createFile(name: string): File {
  return new File(["content"], name, { type: "text/plain" });
}

describe("useGenericDriveStore", () => {
  beforeEach(() => {
    useGenericDriveStore.setState({ files: [], displayModel: false });
  });

  test("adds selected files with pending upload state", () => {
    const firstFile = createFile("first.txt");
    const secondFile = createFile("second.txt");

    useGenericDriveStore.getState().addFiles([firstFile, secondFile]);

    const files = useGenericDriveStore.getState().files;
    expect(files).toHaveLength(2);
    expect(files.map((file) => file.file)).toEqual([firstFile, secondFile]);
    expect(files.every((file) => file.status === "pending")).toBe(true);
    expect(files.every((file) => file.id.length > 0)).toBe(true);
    expect(files.every((file) => file.createdAt instanceof Date)).toBe(true);
  });

  test("updates file status without changing other uploads", () => {
    const firstFile = createFile("first.txt");
    const secondFile = createFile("second.txt");

    useGenericDriveStore.getState().addFiles([firstFile, secondFile]);
    const [firstUpload, secondUpload] = useGenericDriveStore.getState().files;

    useGenericDriveStore
      .getState()
      .updateFileStatus(firstUpload.id, "complete", "https://example.com/a");

    expect(useGenericDriveStore.getState().files).toEqual([
      {
        ...firstUpload,
        status: "complete",
        url: "https://example.com/a",
      },
      secondUpload,
    ]);
  });

  test("resets files and controls the upload model", () => {
    useGenericDriveStore.getState().addFiles([createFile("first.txt")]);

    useGenericDriveStore.getState().openModel();
    expect(useGenericDriveStore.getState().displayModel).toBe(true);

    useGenericDriveStore.getState().toggleModel();
    expect(useGenericDriveStore.getState().displayModel).toBe(false);

    useGenericDriveStore.getState().openModel();
    useGenericDriveStore.getState().closeModel();
    useGenericDriveStore.getState().resetFiles();

    expect(useGenericDriveStore.getState().displayModel).toBe(false);
    expect(useGenericDriveStore.getState().files).toEqual([]);
  });
});
