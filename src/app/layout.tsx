import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'CoachHub Africa — find a coach, follow a program, grow together',
    template: '%s · CoachHub Africa',
  },
  description:
    'Find a coach anywhere in Africa, join their program, track your progress and stay accountable with a community behind you.',
}

export const viewport: Viewport = {
  themeColor: '#E05B2B',
  // Mobile is the primary experience; the layout is designed to fit the
  // viewport rather than rely on zooming, but pinch-zoom stays available.
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
