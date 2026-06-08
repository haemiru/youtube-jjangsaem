import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "짱샘 유튜브 메이커",
  description:
    "네이버 블로그 txt 한 편을 유튜브 대본·인포그래픽·썸네일·제목·디스크립션·태그로 변환",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
