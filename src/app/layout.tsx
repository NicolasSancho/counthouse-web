import type { Metadata } from "next";
import { Inter } from "next/font/google";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-surface font-sans text-neutral-900">
        {children}
      </body>
    </html>
  );
}
