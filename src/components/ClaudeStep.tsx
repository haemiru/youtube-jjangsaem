"use client";
import { useState } from "react";
import { callClaude } from "@/lib/client";
import { Button, ModeToggle, CopyBox, TextArea, Spinner, ErrorMsg } from "./ui";

/**
 * Claude 생성 단계 공통 UI.
 * 자동: /api/claude 호출 → parse → onResult
 * 수동: 프롬프트 복사 → Claude.ai 결과 붙여넣기 → parse → onResult
 */
export function ClaudeStep<T>({
  prompt,
  parse,
  result,
  onResult,
  render,
  maxTokens,
  autoLabel = "⚡ Claude로 생성",
}: {
  prompt: string;
  parse: (raw: string) => T;
  result: T | null;
  onResult: (r: T) => void;
  render: (r: T) => React.ReactNode;
  maxTokens?: number;
  autoLabel?: string;
}) {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pasted, setPasted] = useState("");

  async function runAuto() {
    setLoading(true);
    setError("");
    try {
      const raw = await callClaude(prompt, maxTokens);
      onResult(parse(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setLoading(false);
    }
  }

  function applyManual() {
    setError("");
    try {
      onResult(parse(pasted));
    } catch (e) {
      setError(e instanceof Error ? e.message : "붙여넣은 결과를 파싱하지 못했습니다. JSON 형식인지 확인하세요.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <ModeToggle mode={mode} onChange={setMode} />
        {result && (
          <Button small variant="ghost" onClick={() => (mode === "auto" ? runAuto() : setPasted(""))}>
            ↻ 다시 생성
          </Button>
        )}
      </div>

      {mode === "auto" ? (
        <div style={{ marginTop: 12 }}>
          {!result && (
            <Button onClick={runAuto} disabled={loading}>
              {loading ? <Spinner /> : autoLabel}
            </Button>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <CopyBox text={prompt} label="① 아래 프롬프트를 복사해 Claude.ai(Opus 4.8)에 붙여넣으세요" rows={6} />
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "10px 0 4px" }}>
            ② Claude 응답(```json … ```)을 그대로 아래에 붙여넣고 적용하세요
          </p>
          <TextArea value={pasted} onChange={setPasted} placeholder="여기에 Claude.ai 결과를 붙여넣기" rows={6} />
          <div style={{ marginTop: 8 }}>
            <Button onClick={applyManual} disabled={!pasted.trim()} variant="accent2">
              결과 적용
            </Button>
          </div>
        </div>
      )}

      {error && <ErrorMsg msg={error} />}
      {result && <div style={{ marginTop: 16 }}>{render(result)}</div>}
    </div>
  );
}
