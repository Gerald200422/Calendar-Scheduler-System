import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Scheduler Pro',
    short_name: 'Scheduler',
    description: 'Smart Event Scheduling & Notifications',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#db2777',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
