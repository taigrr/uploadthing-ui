// Global Imports

import { create } from "zustand";
import { createId } from "@paralleldrive/cuid2";

// Local Imports

// Body
interface FileState {
  bears: number;
  increase: (by: number) => void;
}

export type FileStatus = "pending" | "uploading" | "complete" | "error";

interface UploadFile {
  id: string;
  file: File;
  status: FileStatus;
  url?: string;
  createdAt: Date;
}

interface FilesState {
  files: UploadFile[];
  addFiles: (newFiles: File[]) => void;
  updateFileStatus: (id: string, status: FileStatus, url?: string) => void;
  removeFile: (id: string) => void;
}

export const useFilesStore = create<FilesState>((set) => ({
  files: [],
  addFiles: (newFiles) =>
    set((state) => ({
      files: [
        ...state.files,
        ...newFiles.map((file) => ({
          id: createId(),
          file,
          status: "pending" as FileStatus, // Use type assertion here
          createdAt: new Date(),
        })),
      ],
    })),
  updateFileStatus: (id, status, url) =>
    set((state) => ({
      files: state.files.map((item) =>
        item.id === id ? { ...item, status, url } : item
      ),
    })),
  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((item) => item.id !== id),
    })),
}));
