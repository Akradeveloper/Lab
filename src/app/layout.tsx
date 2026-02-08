import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "QA Lab - Aprende Testing y QA",
    template: "%s | QA Lab",
  },
  description:
    "Plataforma gratuita para aprender testing y calidad de software. Lecciones interactivas, ejercicios prácticos en 4 lenguajes y seguimiento de progreso.",
  keywords: [
    "QA",
    "testing",
    "calidad de software",
    "aprender testing",
    "automatización",
    "ejercicios de código",
  ],
  openGraph: {
    title: "QA Lab - Aprende Testing y QA",
    description:
      "Domina la calidad de software con lecciones interactivas y ejercicios prácticos.",
    siteName: "QA Lab",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "QA Lab - Aprende Testing y QA",
    description:
      "Domina la calidad de software con lecciones interactivas y ejercicios prácticos.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Saltar al contenido
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
