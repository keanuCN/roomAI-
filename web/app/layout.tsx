import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "roomAI 栖间 · 让空间的想象有迹可循",
  description: "从一张照片，到可与客户分享的设计方案。",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
