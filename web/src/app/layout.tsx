import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import RingtoneManager from '../components/RingtoneManager'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Scheduler Pro - Smart Planning',
  description: 'Manage your events and notifications seamlessly with high-frequency sync.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export const viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
        <RingtoneManager />
      </body>
    </html>
  )
}
