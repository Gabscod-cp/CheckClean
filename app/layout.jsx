import "./globals.css";

export const metadata = {
  title: "CheckClean",
  description: "Administração de limpeza de apartamentos",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
