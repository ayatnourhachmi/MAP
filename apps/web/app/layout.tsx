import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "My Atlas Pass",
  description: "MAP web experience",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
