import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

export const runtime = "nodejs";

interface SaveFile {
  /** 상대 경로 (예: "script.txt", "images/slide-01.png") */
  path: string;
  /** 텍스트 내용 또는 data URL("data:image/png;base64,...") */
  content: string;
  /** content 가 data URL 인 base64 바이너리인지 */
  isDataUrl?: boolean;
}

/** 로컬 실행 시 output/<slug>/ 에 산출물 저장. Vercel 등 읽기전용 fs 에선 실패 → 클라가 ZIP 폴백. */
export async function POST(req: NextRequest) {
  try {
    const { slug, files } = (await req.json()) as {
      slug: string;
      files: SaveFile[];
    };
    if (!slug || !Array.isArray(files)) {
      return NextResponse.json({ error: "slug/files 가 필요합니다." }, { status: 400 });
    }
    const safeSlug = slug.replace(/[^a-zA-Z0-9가-힣_-]/g, "-");
    const baseDir = process.env.OUTPUT_DIR || "./output";
    const root = resolve(process.cwd(), baseDir, safeSlug);

    for (const f of files) {
      const target = resolve(root, f.path);
      if (!target.startsWith(root)) continue; // path traversal 방지
      await mkdir(join(target, ".."), { recursive: true });
      if (f.isDataUrl) {
        const b64 = f.content.split(",")[1] ?? "";
        await writeFile(target, Buffer.from(b64, "base64"));
      } else {
        await writeFile(target, f.content, "utf8");
      }
    }
    return NextResponse.json({ saved: true, path: root });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ saved: false, error: msg }, { status: 500 });
  }
}
