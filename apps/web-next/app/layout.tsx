import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const fontSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const metadata: Metadata = {
  title: "Song Lists",
  description: "Browse and search the song catalog",
};

function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Navbar />
        {children}
        {/* Held back until the song has loaded, so the modal opens at its real
            size and fades in once -- rather than opening on a small loading
            state and then jumping to full size when the content arrives. */}
        <Suspense fallback={null}>{modal}</Suspense>
      </body>
    </html>
  );
}

export { metadata };
export default RootLayout;
