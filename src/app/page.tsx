"use client";
import { useMemo, useState } from "react";
import { parseBlog, type ParsedBlog } from "@/lib/parser";
import {
  buildScriptPrompt,
  buildMetadataPrompt,
  buildThumbnailPrompt,
  extractJson,
  type ScriptResult,
  type MetadataResult,
  type ThumbnailResult,
  type VideoFormat,
} from "@/lib/prompts";
import {
  videoSlug,
  buildScriptTxt,
  buildScriptSpacedTxt,
  buildMetadataTxt,
  buildImagePromptsTxt,
  buildRenderSlides,
} from "@/lib/assemble";
import { saveToOutput, downloadZip, type OutFile } from "@/lib/client";
import { Card, Button, TextArea, ErrorMsg, CopyButton } from "@/components/ui";
import { ClaudeStep } from "@/components/ClaudeStep";
import { ImageStep } from "@/components/ImageStep";

export default function Home() {
  const [fileName, setFileName] = useState("");
  const [rawTxt, setRawTxt] = useState("");
  const [blog, setBlog] = useState<ParsedBlog | null>(null);
  const [parseErr, setParseErr] = useState("");
  const [format, setFormat] = useState<VideoFormat>("long");
  const [minutes, setMinutes] = useState(8);
  const isShort = format === "short";

  const [script, setScript] = useState<ScriptResult | null>(null);
  const [metadata, setMetadata] = useState<MetadataResult | null>(null);
  const [thumbnail, setThumbnail] = useState<ThumbnailResult | null>(null);
  const [slideImages, setSlideImages] = useState<Record<number, string>>({});
  const [thumbImage, setThumbImage] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState("");

  const scriptPrompt = useMemo(
    () => (blog ? buildScriptPrompt(blog, { format, minutes }) : ""),
    [blog, format, minutes]
  );

  // 포맷 전환 시 대본은 구조가 다르므로 초기화. 숏폼이면 썸네일도 비움.
  function changeFormat(f: VideoFormat) {
    setFormat(f);
    setScript(null);
    // 포맷마다 슬라이드 키 체계가 달라 이미지도 초기화.
    setSlideImages({});
    if (f === "short") {
      setThumbnail(null);
      setThumbImage(null);
    }
  }
  const metadataPrompt = useMemo(() => (blog ? buildMetadataPrompt(blog) : ""), [blog]);
  const thumbnailPrompt = useMemo(() => (blog ? buildThumbnailPrompt(blog) : ""), [blog]);

  // STEP 5 에 띄울 슬라이드.
  // 롱폼: 블로그 인포그래픽 전체. 숏폼: 대본 컷마다 1장(대본 생성 전에는 비움).
  const renderSlides = useMemo(
    () => (blog ? buildRenderSlides(blog, script, format) : []),
    [blog, script, format]
  );

  function doParse(text: string, name: string) {
    setParseErr("");
    try {
      const p = parseBlog(text);
      setBlog(p);
      setFileName(name);
      // 새 파일이면 결과 초기화
      setScript(null);
      setMetadata(null);
      setThumbnail(null);
      setSlideImages({});
      setThumbImage(null);
      setSaveMsg("");
    } catch (e) {
      setParseErr(e instanceof Error ? e.message : "파싱 실패");
    }
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const t = reader.result as string;
      setRawTxt(t);
      doParse(t, file.name);
    };
    reader.readAsText(file, "utf-8");
  }

  const slug = blog ? videoSlug(blog, fileName) : "video";

  function collectFiles(): OutFile[] {
    const files: OutFile[] = [];
    if (blog && script) {
      const scriptTxt = buildScriptTxt(blog, script, thumbnail, format);
      files.push({ path: "script.txt", content: scriptTxt });
      files.push({ path: "script-spaced.txt", content: buildScriptSpacedTxt(scriptTxt) });
    }
    if (metadata) files.push({ path: "metadata.txt", content: buildMetadataTxt(metadata) });
    if (blog)
      files.push({
        // 숏폼은 대본 컷마다 1장(블로그 재활용 또는 대본 생성 프롬프트).
        path: "images/prompts.txt",
        content: buildImagePromptsTxt(blog, thumbnail, format, script),
      });
    for (const [idx, dataUrl] of Object.entries(slideImages)) {
      files.push({
        path: `images/slide-${String(idx).padStart(2, "0")}.png`,
        content: dataUrl,
        isDataUrl: true,
      });
    }
    if (thumbImage) files.push({ path: "thumbnail/thumbnail.png", content: thumbImage, isDataUrl: true });
    return files;
  }

  async function onSave() {
    setSaveMsg("저장 중…");
    const files = collectFiles();
    const res = await saveToOutput(slug, files);
    if (res.saved) setSaveMsg(`✓ 로컬 저장 완료: ${res.path}`);
    else setSaveMsg(`로컬 저장 불가(${res.error || "서버리스 환경"}). ZIP 다운로드를 사용하세요.`);
  }

  async function onZip() {
    await downloadZip(slug, collectFiles());
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 80px" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--accent)" }}>▶</span> 짱샘 유튜브 메이커
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
          네이버 블로그 txt 한 편 → 유튜브 대본·인포그래픽·썸네일·제목·디스크립션·태그.
          각 단계는 <b style={{ color: "var(--foreground)" }}>자동(API)</b> 과{" "}
          <b style={{ color: "var(--foreground)" }}>수동(프롬프트 복사)</b> 을 선택할 수 있어요.
        </p>
      </header>

      {/* STEP 1 — 업로드 */}
      <Card title="블로그 txt 업로드 / 붙여넣기" step={1} done={!!blog}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label>
            <span
              style={{
                display: "inline-block",
                background: "var(--accent)",
                color: "#fff",
                borderRadius: 8,
                padding: "10px 18px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              📄 txt 파일 선택
            </span>
            <input
              type="file"
              accept=".txt,text/plain"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
          {fileName && <span style={{ color: "var(--muted)", fontSize: 13 }}>{fileName}</span>}
        </div>

        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "14px 0 0" }}>또는 본문을 직접 붙여넣기:</p>
        <TextArea value={rawTxt} onChange={setRawTxt} placeholder="블로그 txt 전체 내용 붙여넣기" rows={4} />
        <div style={{ marginTop: 8 }}>
          <Button onClick={() => doParse(rawTxt, fileName || "pasted.txt")} disabled={!rawTxt.trim()} variant="accent2">
            파싱하기
          </Button>
        </div>

        {parseErr && <ErrorMsg msg={parseErr} />}

        {blog && (
          <div
            style={{
              marginTop: 16,
              background: "var(--panel-2)",
              borderRadius: 10,
              padding: 16,
              fontSize: 13.5,
              lineHeight: 1.7,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{blog.meta.title}</div>
            <div style={{ color: "var(--muted)" }}>
              카테고리 {blog.meta.category} · 메인키워드 <b style={{ color: "var(--foreground)" }}>{blog.meta.mainKeyword}</b>
            </div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>
              본문 {blog.charCount.toLocaleString()}자 · 섹션 {blog.sections.length}개 · 인포그래픽 슬라이드{" "}
              <b style={{ color: "var(--foreground)" }}>{blog.imageSlots.length}장</b>
            </div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>해시태그 {blog.hashtags.join(" ")}</div>
            {blog.warnings.length > 0 && (
              <div style={{ color: "#ffcf8b", marginTop: 6 }}>⚠️ {blog.warnings.join(" / ")}</div>
            )}
          </div>
        )}
      </Card>

      {/* STEP 2 — 대본 */}
      <Card title="대본 (짱샘 단독 내레이션)" step={2} done={!!script} disabled={!blog}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          {(["long", "short"] as const).map((f) => (
            <button
              key={f}
              onClick={() => changeFormat(f)}
              style={{
                background: format === f ? "var(--accent)" : "var(--panel-2)",
                color: format === f ? "#fff" : "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {f === "long" ? "🎬 롱폼" : "⚡ 숏폼 (60초 미만)"}
            </button>
          ))}
        </div>
        {isShort ? (
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>
            숏폼: 대본 약 1분 미만(60초) · 핵심 하나만 압축 · 썸네일 단계 생략 · 이미지 1:1
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>영상 길이</span>
            <input
              type="number"
              min={3}
              max={20}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              style={{
                width: 64,
                background: "var(--panel-2)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 8px",
                fontSize: 13,
              }}
            />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>분</span>
          </div>
        )}
        {blog && (
          <ClaudeStep<ScriptResult>
            prompt={scriptPrompt}
            parse={(raw) => extractJson<ScriptResult>(raw)}
            result={script}
            onResult={setScript}
            maxTokens={20000}
            autoLabel="⚡ 대본 생성 (Opus 4.8)"
            render={(r) => {
              const fullScript = r.slides.map((s) => s.narration.trim()).join("\n\n");
              return (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Hook 패턴 {r.hookPattern} ({r.hookPatternLabel}) · 약 {r.estimatedMinutes}분 · 슬라이드 {r.slides.length}컷
                  </div>
                  <CopyButton text={fullScript} label="📋 전체 대본 복사" />
                </div>
                {r.slides.map((s, i) => (
                  <div key={i} style={{ borderTop: "1px solid var(--border)", padding: "10px 0" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ fontSize: 12.5, color: "var(--accent-2)" }}>
                        [{String(i + 1).padStart(2, "0")}] {s.heading} · {s.seconds}초
                        {isShort
                          ? ` · 🖼 slide-${String(i + 1).padStart(2, "0")}`
                          : s.imageRef
                            ? ` · 🖼 slide-${String(s.imageRef).padStart(2, "0")}`
                            : ""}
                      </div>
                      <CopyButton text={s.narration.trim()} label="📋 대사 복사" />
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{s.narration}</div>
                  </div>
                ))}
              </div>
              );
            }}
          />
        )}
      </Card>

      {/* STEP 3 — 메타데이터 */}
      <Card title="제목 · 디스크립션 · 태그" step={3} done={!!metadata} disabled={!blog}>
        {blog && (
          <ClaudeStep<MetadataResult>
            prompt={metadataPrompt}
            parse={(raw) => {
              const m = extractJson<MetadataResult>(raw);
              // 고정댓글에 줄표(엠대시/엔대시)가 남아 있으면 쉼표로 치환(안전망).
              if (m.pinnedComment) {
                m.pinnedComment = m.pinnedComment.replace(/\s*[—–―]\s*/g, ", ");
              }
              return m;
            }}
            result={metadata}
            onResult={setMetadata}
            autoLabel="⚡ 메타데이터 생성 (Opus 4.8)"
            render={(r) => {
              const metaHeader = (label: string, text: string, copyLabel = "📋 복사") => (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 14,
                  }}
                >
                  <b>{label}</b>
                  <CopyButton text={text} label={copyLabel} />
                </div>
              );
              return (
              <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                <b>제목 후보</b>
                <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>
                  {r.titles.map((t, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        padding: "4px 0",
                      }}
                    >
                      <span>{i + 1}) {t}</span>
                      <CopyButton text={t} />
                    </li>
                  ))}
                </ul>
                {metaHeader("디스크립션", r.description)}
                <div style={{ whiteSpace: "pre-wrap", background: "var(--panel-2)", borderRadius: 8, padding: 12, margin: "6px 0 0" }}>
                  {r.description}
                </div>
                {metaHeader(`태그 (${r.tags.length})`, r.tags.join(", "))}
                <div style={{ color: "var(--muted)", marginTop: 6 }}>{r.tags.join(", ")}</div>
                {r.pinnedComment && (
                  <>
                    {metaHeader("고정댓글", r.pinnedComment)}
                    <div style={{ color: "var(--muted)", marginTop: 6 }}>{r.pinnedComment}</div>
                  </>
                )}
              </div>
              );
            }}
          />
        )}
      </Card>

      {/* STEP 4 — 썸네일 (숏폼은 생략) */}
      {!isShort && (
      <Card title="썸네일 (문구 + 이미지)" step={4} done={!!thumbnail} disabled={!blog}>
        {blog && (
          <ClaudeStep<ThumbnailResult>
            prompt={thumbnailPrompt}
            parse={(raw) => extractJson<ThumbnailResult>(raw)}
            result={thumbnail}
            onResult={setThumbnail}
            autoLabel="⚡ 썸네일 문구·프롬프트 생성"
            render={(r) => (
              <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                <b>썸네일 문구 후보</b>
                <ol style={{ margin: "6px 0 14px", paddingLeft: 20 }}>
                  {r.phrases.map((p, i) => (
                    <li key={i} style={{ whiteSpace: "pre-line" }}>{p}</li>
                  ))}
                </ol>
                <div style={{ color: "var(--muted)", marginBottom: 14 }}>
                  좌측 상단: {r.miniCopyLeft} · 우측 상단: {r.miniCopyRight}
                </div>
                <b style={{ display: "block", marginBottom: 8 }}>썸네일 이미지</b>
                <ImageStep
                  prompt={r.imagePrompt}
                  filename={`${slug}-thumbnail.png`}
                  value={thumbImage}
                  onResult={setThumbImage}
                />
              </div>
            )}
          />
        )}
      </Card>
      )}

      {/* STEP 5 — 인포그래픽 이미지 */}
      <Card title={`인포그래픽 슬라이드 이미지${blog ? ` (${renderSlides.length}장)` : ""}`} step={isShort ? 4 : 5} disabled={!blog}>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 12px" }}>
          {isShort
            ? "숏폼은 대본 컷마다 1장씩 만듭니다(훅·마무리 포함). 블로그 슬라이드를 재활용하거나 대본이 만든 프롬프트를 1:1 로 보정했습니다. 슬라이드별로 자동(Gemini) 또는 수동(Google Flow)을 선택하세요."
            : "블로그 내장 프롬프트를 유튜브 16:9 로 보정했습니다. 슬라이드별로 자동(Gemini) 또는 수동(Google Flow)을 선택하세요."}
        </p>
        {isShort && blog && !script && (
          <div style={{ fontSize: 13, color: "#ffcf8b", margin: "0 0 8px" }}>
            ⚠️ 숏폼은 STEP 2에서 대본을 먼저 생성하면, 대본 컷마다 이미지 칸이 여기에 표시됩니다.
          </div>
        )}
        {renderSlides.map((slot) => (
          <div key={slot.key} style={{ borderTop: "1px solid var(--border)", padding: "14px 0" }}>
            <div style={{ fontSize: 13, color: "var(--accent-2)", marginBottom: 8 }}>
              slide-{String(slot.key).padStart(2, "0")} · {slot.type}
              {slot.isHero ? " · ⭐대표" : ""}
            </div>
            <ImageStep
              prompt={slot.prompt}
              filename={`${slug}-slide-${String(slot.key).padStart(2, "0")}.png`}
              value={slideImages[slot.key] ?? null}
              onResult={(d) => setSlideImages((prev) => ({ ...prev, [slot.key]: d }))}
              aspectRatio={isShort ? "1:1" : "16:9"}
              compact
            />
          </div>
        ))}
      </Card>

      {/* STEP 6 — 산출물 */}
      <Card title="산출물 저장 / 다운로드" step={isShort ? 5 : 6} disabled={!blog}>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
          폴더명: <b style={{ color: "var(--foreground)" }}>output/{slug}/</b> — script.txt · script-spaced.txt · metadata.txt · images/{isShort ? "" : " · thumbnail/"}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={onSave} disabled={!script && !metadata}>💾 로컬 output 폴더에 저장</Button>
          <Button onClick={onZip} variant="accent2" disabled={!script && !metadata}>⬇ ZIP 다운로드</Button>
        </div>
        {saveMsg && <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>{saveMsg}</div>}
      </Card>
    </main>
  );
}
