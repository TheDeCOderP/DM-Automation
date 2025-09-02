import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import React from 'react'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}
