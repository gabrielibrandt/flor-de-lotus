import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Flor de Lótus – Yoga e Ayurveda para Mulheres", template: "%s · Flor de Lótus" },
  description: "Espaço da paciente e gestão de anamneses da Flor de Lótus – Yoga e Ayurveda para Mulheres.",
  robots: { index: false, follow: false },
  icons: { icon: "/lotus.svg" },
};

export const viewport: Viewport = { themeColor: "#5a7151", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 btn-secondary">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
