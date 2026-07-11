import "./globals.css";

export const metadata = {
  title: "Reserva de Salas — AD Louveira",
  description: "Sistema de reserva de salas e da Nave da Assembleia de Deus Louveira",
  manifest: "/manifest.json",
  themeColor: "#0E8E89",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Reservas AD",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Fontes */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0E8E89" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS (Safari) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Reservas AD" />
        <link rel="apple-touch-icon" href="/icon-152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-96.png" type="image/png" />

        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        {/* Barra de navegação unificada */}
        {children}
        {/* Registro do Service Worker */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('SW registrado:', reg.scope); })
                .catch(function(err) { console.warn('SW falhou:', err); });
            });
          }
        `}} />
      </body>
    </html>
  );
}
