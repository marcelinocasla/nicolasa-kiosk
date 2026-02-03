import './globals.css'

export const metadata = {
  title: 'Restaurante Nicolasa Kiosk',
  description: 'El sabor de la Abuela',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
