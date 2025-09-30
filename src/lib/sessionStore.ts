import { GlobalSignal } from "@/models/interfaces";

type PendingEdit = {
  signal: GlobalSignal;
  ai_items: string[];
  createdAt: number;
};

const pendingEdits = new Map<string, PendingEdit>();

export function savePendingEdit(key: string, payload: PendingEdit) {
  pendingEdits.set(key, payload);
}

export function getPendingEdit(key: string): PendingEdit | undefined {
  return pendingEdits.get(key);
}

export function clearPendingEdit(key: string) {
  pendingEdits.delete(key);
}
