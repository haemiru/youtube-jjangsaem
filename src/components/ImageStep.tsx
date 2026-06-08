"use client";
import { useState } from "react";
import { callGeminiImage, downloadDataUrl } from "@/lib/client";
import { Button, ModeToggle, CopyBox, Spinner, ErrorMsg } from "./ui";

/**
 * 이미지 생성 단계 공통 UI.
 * 자동: Gemini API 로 생성.
 * 수동: 프롬프트 복사 → Google Flow/Gemini 웹에서 생성 → png 업로드.
 */
export function ImageStep({
  prompt,
  filename,
  value,
  onResult,
  compact,
}: {
  prompt: string;
  filename: string;
  value: string | null;
  onResult: (dataUrl: string) => void;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAuto() {
    setLoading(true);
    setError("");
    try {
      onResult(await callGeminiImage(prompt));
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지 생성 실패");
    } finally {
      setLoading(false);
    }
  }

  function onUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => onResult(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <ModeToggle mode={mode} onChange={setMode} />
        {mode === "auto" ? (
          <Button small onClick={runAuto} disabled={loading}>
            {loading ? <Spinner label="이미지 생성 중" /> : value ? "↻ 다시 생성" : "⚡ 생성"}
          </Button>
        ) : (
          <label style={{ fontSize: 13 }}>
            <span
              style={{
                display: "inline-block",
                background: "var(--accent-2)",
                color: "#fff",
                borderRadius: 8,
                padding: "6px 12px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              📤 png 업로드
            </span>
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
          </label>
        )}
        {value && (
          <Button small variant="ghost" onClick={() => downloadDataUrl(value, filename)}>
            ⬇ 저장
          </Button>
        )}
      </div>

      {mode === "manual" && !compact && (
        <CopyBox text={prompt} label="이 프롬프트로 Google Flow / Gemini 에서 생성 후 png 업로드" rows={5} />
      )}

      {error && <ErrorMsg msg={error} />}

      {value && (
        <img
          src={value}
          alt={filename}
          style={{
            marginTop: 10,
            width: "100%",
            maxWidth: compact ? 320 : 560,
            borderRadius: 10,
            border: "1px solid var(--border)",
            display: "block",
          }}
        />
      )}
    </div>
  );
}
