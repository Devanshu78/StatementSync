import { http } from "./http";

export interface UploadResponse {
  ok: boolean;
  uploadId: string;
  month: string | null;
  stats: Record<string, unknown>;
  matches: unknown[];
  anomalies: unknown[];
}

export async function uploadStatements(params: { bank: File; shop: File; month?: string; onUploadProgress?: (percent: number) => void }) {
  const form = new FormData();
  form.append("bank", params.bank);
  form.append("shop", params.shop);
  if (params.month) form.append("month", params.month);

  const { data } = await http.post<UploadResponse>("/files/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    withCredentials: true,
    onUploadProgress: (evt) => {
      if (!params.onUploadProgress) return;
      const total = (evt.total || 0);
      if (total > 0) {
        const percent = Math.round((evt.loaded / total) * 100);
        params.onUploadProgress(percent);
      }
    },
  });
  return data;
}

export async function getHistory(limit = 20) {
  const { data } = await http.get("/files/history", { params: { limit }, withCredentials: true });
  return data as { ok: boolean; uploads: unknown[] };
}

export async function getAuditById(id: string) {
  const { data } = await http.get(`/files/audit/${id}`, { withCredentials: true });
  return data as { ok: boolean; audit: unknown };
}


