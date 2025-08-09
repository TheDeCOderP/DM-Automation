"use client"

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setHasScrolled(true)
      } else {
        setHasScrolled(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const mobileMenuVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto" },
    exit: { opacity: 0, height: 0 }
  }

  return (
    <nav className={`h-20 ${!hasScrolled ? 'border-b border-slate-200' : ''}`}>
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-4 p-4 m-2 rounded-md transition-all ${hasScrolled ? 'border border-slate-300 bg-white' : 'bg-transparent'}`}>
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Image src="/icons/logo.png" alt="Logo" width={32} height={32} />
              <span className="text-lg font-semibold text-slate-900">Prabisha Consulting</span>
            </Link>

            <span>|</span>

            <div className="text-lg font-semibold text-slate-900">Digital Marketing Solutions</div>
          </div>

          {/* Desktop CTA Buttons */}
          <div className={`hidden md:flex items-center gap-3 p-2 m-2 rounded-md transition-all ${hasScrolled ? 'border border-slate-300 bg-white' : 'bg-transparent'}`}>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/register" className="bg-primary text-white px-4 py-2 rounded-md block">Get Started</Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/login" className="px-4 py-2 text-slate-700 hover:text-slate-900 rounded-md block">Login</Link>
            </motion.div>
          </div>

          {/* Mobile Menu Button */}
          <motion.button 
            className="md:hidden p-2 text-slate-700 hover:text-slate-900" 
            onClick={() => setIsOpen(!isOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="md:hidden border-t border-slate-200/50 bg-white/95 backdrop-blur-sm overflow-hidden"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={mobileMenuVariants}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
                  <Button variant="ghost" asChild className="justify-start text-primary">
                    <Link href="/register">Get Started</Link>
                  </Button>
                  <Button variant="ghost" asChild className="justify-start text-slate-700 hover:text-slate-900">
                    <Link href="/login">Login</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}