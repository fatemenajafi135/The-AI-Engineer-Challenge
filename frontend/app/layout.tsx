import type { Metadata } from "next";
import "./globals.css";
import { APP_TITLE, APP_DESCRIPTION } from "../config";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
