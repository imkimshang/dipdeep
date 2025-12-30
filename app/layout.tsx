import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dip Deep - AI 기획자 교육 플랫폼",
  description: "AI 기획자 교육을 위한 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}



