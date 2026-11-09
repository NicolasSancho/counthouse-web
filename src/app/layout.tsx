import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Pages set their own title, which becomes "Products · Counthouse".
  title: { template: "%s · Counthouse", default: "Counthouse" },
  description: "Counthouse back office",
};

// The page policy's nonce is new on every request, so every page renders per request: a page built
// ahead of time would carry scripts without it, and the browser would refuse them (ADR 0010).
export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-surface font-sans text-neutral-900">
        {children}
      </body>
    </html>
  );
}
