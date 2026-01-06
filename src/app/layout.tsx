import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { QueryProvider } from "@/components/common/query-provider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "AI 블로그 생성 시스템",
  description: "AI를 활용한 블로그 콘텐츠 자동 생성 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <QueryProvider>
          <Header />
          <main className="min-h-[calc(100vh-65px)]">
            {children}
          </main>
          <ToastContainer
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </QueryProvider>
      </body>
    </html>
  );
}
