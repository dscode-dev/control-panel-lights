import "./globals.css"

export const metadata = {
  title: "Control Panel",
  description: "Controle de playlist, LEDs e holograma",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
