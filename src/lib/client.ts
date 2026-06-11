"use client";
/** 클라이언트 → 서버 API 호출 + 다운로드 유틸 */
import JSZip from "jszip";

export async function callClaude(prompt: string, maxTokens?: number): Promise<string> {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTokens }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Claude 호출 실패");
  return data.text as string;
}

export async function callGeminiImage(
  prompt: string,
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" = "16:9"
): Promise<string> {
  const res = await fetch("/api/gemini-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, aspectRatio }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "이미지 생성 실패");
  return data.dataUrl as string;
}

export interface OutFile {
  path: string;
  content: string;
  isDataUrl?: boolean;
}

export async function saveToOutput(
  slug: string,
  files: OutFile[]
): Promise<{ saved: boolean; path?: string; error?: string }> {
  try {
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, files }),
    });
    return await res.json();
  } catch (e) {
    return { saved: false, error: e instanceof Error ? e.message : "저장 실패" };
  }
}

export async function downloadZip(slug: string, files: OutFile[]): Promise<void> {
  const zip = new JSZip();
  for (const f of files) {
    if (f.isDataUrl) {
      const b64 = f.content.split(",")[1] ?? "";
      zip.file(f.path, b64, { base64: true });
    } else {
      zip.file(f.path, f.content);
    }
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
