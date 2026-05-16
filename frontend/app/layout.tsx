import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_TITLE, APP_DESCRIPTION } from "../config";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: APP_DESCRIPTION,
};

// interactiveWidget=resizes-content tells iOS Safari 15.4+ to shrink the visual
// viewport when the keyboard opens (matching Android's default behavior). Combined
// with 100dvh on the chat container, the input bar then sits naturally above the
// keyboard without any JS calculations.
export const viewport: Viewport = {
  width:             "device-width",
  initialScale:      1,
  interactiveWidget: "resizes-content",
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
