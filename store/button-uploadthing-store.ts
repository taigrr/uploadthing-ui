// Global Imports

import { create } from "zustand";

// Local Imports

// Body
export type FileStatus = "pending" | "uploading" | "complete" | "error";

export interface UploadFile {
  id: string;
  file: File;
  status: FileStatus;
  url?: string;
  createdAt: Date;
}

interface FilesState {
  files: UploadFile[];
  historicFiles: UploadFile[];
  setFiles: (newFiles: UploadFile[]) => void;
  updateFileStatus: (id: string, status: FileStatus, url?: string) => void;
  removeFile: (id: string) => void;
}

export const useUploadthingStore = create<FilesState>()((set) => ({
  files: [],
  historicFiles: [],
  setFiles: (newFiles) =>
    set((state) => {
      const historicIDs = new Set(state.historicFiles.map((file) => file.id));
      const newHistoricFiles = newFiles.filter((file) => {
        if (historicIDs.has(file.id)) return false;
        historicIDs.add(file.id);
        return true;
      });

      return {
        files: newFiles,
        historicFiles: [...state.historicFiles, ...newHistoricFiles],
      };
    }),
  updateFileStatus: (id, status, url) =>
    set((state) => ({
      files: state.files.map((item) => (item.id === id ? { ...item, status, url } : item)),
      historicFiles: state.historicFiles.map((item) => (item.id === id ? { ...item, status, url } : item)),
    })),
  removeFile: (id) =>
    set((state) => ({
      historicFiles: state.historicFiles.filter((item) => item.id !== id),
    })),
}));
