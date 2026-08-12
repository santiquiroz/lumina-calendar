export const manifiesto = {
  name: 'Lumina Calendar',
  short_name: 'Lumina',
  description: 'Calendario local-first donde cada evento es una carpeta de tareas anidables.',
  lang: 'es',
  dir: 'ltr' as const,
  start_url: '/',
  scope: '/',
  display: 'standalone' as const,
  orientation: 'portrait-primary' as const,
  theme_color: '#4648d4',
  background_color: '#f8f9ff',
  categories: ['productivity', 'lifestyle'],
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    {
      src: '/icons/maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable' as const,
    },
  ],
};
