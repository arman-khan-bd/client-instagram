import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../components/AppContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AuraGram",
  description: "Your digital escape",
  icons: "/favicon.ico",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AuraGram",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Disable page zoom on iOS Safari
              document.addEventListener('gesturestart', function(e) {
                e.preventDefault();
              });
              document.addEventListener('gesturechange', function(e) {
                e.preventDefault();
              });
              
              // Disable double tap to zoom behavior on some browsers
              let lastTouchEnd = 0;
              document.addEventListener('touchend', function(e) {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                  // If it was a double tap on the page (not input/textarea/buttons), prevent default
                  const tag = e.target ? e.target.tagName.toLowerCase() : '';
                  if (tag !== 'input' && tag !== 'textarea' && tag !== 'button' && tag !== 'img') {
                    e.preventDefault();
                  }
                }
                lastTouchEnd = now;
              }, false);
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProvider>{children}</AppProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {
                      console.log('SW registered:', reg.scope);
                    },
                    function(err) {
                      console.log('SW registration failed:', err);
                    }
                  );
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}

