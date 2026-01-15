import type { Metadata } from "next";
import ClientThemeProvider from "./components/ClientThemeProvider";
import SessionProvider from "./components/SessionProvider";
import ProtectedLayout from "./components/ProtectedLayout";
import ClientSnackbarProvider from "../components/ClientSnackbarProvider";
import "./globals.css";
import '@fontsource/prompt/300.css';
import '@fontsource/prompt/400.css';
import '@fontsource/prompt/500.css';
import '@fontsource/prompt/600.css';
import '@fontsource/prompt/700.css';

export const metadata: Metadata = {
  title: "Logistic Management System",
  description: "ระบบจัดการขนส่งและโลจิสติกส์",
  other: {
    google: 'notranslate',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="google" content="notranslate" />
      </head>
      <body suppressHydrationWarning={true}>
        <SessionProvider>
          <ClientThemeProvider>
            <ClientSnackbarProvider>
              <ProtectedLayout>
                {children}
              </ProtectedLayout>
            </ClientSnackbarProvider>
          </ClientThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
