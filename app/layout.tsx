import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import LocomotiveScrollProvider from "@/components/ui/locomotive-scroll-provider";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "MetaWeb Core",
  description: "MetaWeb Core is a financial management tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark h-full antialiased ${manrope.variable}`}>
      <body className="min-h-full flex flex-col">
        <LocomotiveScrollProvider>{children}</LocomotiveScrollProvider>
      </body>
    </html>
  );
}
