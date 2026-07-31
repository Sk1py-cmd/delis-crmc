import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/shared/ui/ThemeProvider";
import { ToastProvider } from "@/shared/ui/Toast";
import { PWARegister } from "@/widgets/PWARegister";
import { AutoTranslator } from "@/shared/i18n/AutoTranslator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DELIS Enterprise CRM",
  description: "Единая Enterprise-платформа управления компанией DELIS",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DELIS CRM",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" data-theme="dark" data-density="comfortable" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AutoTranslator />
            <PWARegister />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
