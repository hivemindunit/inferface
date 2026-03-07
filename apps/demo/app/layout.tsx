import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./navbar";
import { ThemeProvider } from "./theme-provider";

export const metadata: Metadata = {
  title: "inferface demo",
  description: "Demo app for @inferface streaming UI components",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
