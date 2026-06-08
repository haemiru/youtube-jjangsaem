/** 서버 전용 — Gemini 이미지 생성 (API 키는 서버에만 존재) */
import { GoogleGenAI } from "@google/genai";

export const IMAGE_MODEL = "gemini-2.5-flash-image";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY 가 설정되지 않았습니다.");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export interface GeneratedImage {
  /** "data:image/png;base64,..." */
  dataUrl: string;
  mimeType: string;
}

export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const res = await getClient().models.generateContent({
    model: IMAGE_MODEL,
    contents: prompt,
  });

  const parts = res.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData;
    if (inline?.data) {
      const mimeType = inline.mimeType ?? "image/png";
      return {
        dataUrl: `data:${mimeType};base64,${inline.data}`,
        mimeType,
      };
    }
  }
  throw new Error("Gemini 응답에 이미지가 없습니다. 프롬프트를 확인하세요.");
}
