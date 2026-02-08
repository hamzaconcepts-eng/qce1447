import type { Metadata } from "next";
import { cairo } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "مسابقة مركز رياض العلم لحفظ القرآن الكريم",
  description: "نظام تقييم مسابقة حفظ القرآن الكريم",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}