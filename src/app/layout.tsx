import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ta-da! 生日惊喜｜设计创作手记",
  description: "一份需要亲手打开的互动生日惊喜。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F8F4EE",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <footer className="site-filing-footer">
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">
            湘ICP备2026042264号-1
          </a>
        </footer>
      </body>
    </html>
  );
}
