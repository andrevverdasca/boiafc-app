export const metadata = {
  title: 'Boia FC',
  description: 'Convocatorias, golos e assistencias do Boia FC',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Boia FC' }
};
export const viewport = { themeColor: '#0d1119', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Anton&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: '#0d1119', color: '#f4f1ea', fontFamily: 'Archivo, system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
