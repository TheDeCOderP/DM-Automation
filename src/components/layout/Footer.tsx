"use client"

import Link from "next/link"
import Image from "next/image"
import type React from "react"
import { useState } from "react"
import { Mail, Phone, Twitter, Linkedin, Github, Instagram, MapPin } from "lucide-react"

export default function Footer() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    setEmail("")
  }

  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Instagram, href: "#", label: "Instagram" },
  ]

  return (
    <footer className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Background Pattern */}
      <div
        className={`absolute inset-0 bg-[url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")] opacity-50`}
      />

      <div className="relative container mx-auto px-6 py-16">
        {/* Main Footer Content */}
        <div className="grid lg:grid-cols-6 md:grid-cols-2 gap-12 mb-16">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-3">
              <Image src="/logo.png" alt="logo" height={60} width={60} unoptimized className="border border-white rounded-full"/>
              <div>
                <span className="text-2xl font-bold bg-white bg-clip-text text-transparent">
                  Prabisha Consulting
                </span>
              </div>
            </div>
            <p className="text-slate-300 leading-relaxed text-lg max-w-md">
              Empowering businesses with AI-driven marketing automation solutions that deliver real results and drive sustainable growth.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-slate-300">
                <Mail className="w-5 h-5 text-blue-400" />
                <span>pratyush@prabisha.com</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300">
                <Phone className="w-5 h-5 text-blue-400" />
                <span>+44 786 7090363</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300">
                <MapPin className="w-5 h-5 text-blue-400" />
                <span>London, UK HA1 1EH</span>
              </div>
            </div>
          </div>

          {/* Navigation Sections */}
          {[
            {
              title: "Company",
              links: [
                { name: "About Us", href: "#about" },
                { name: "Blog", href: "#blog" },
                { name: "Careers", href: "#careers" },
                { name: "Contact", href: "#contact" },
              ],
            },
            {
              title: "Resources",
              links: [
                { name: "Help Center", href: "#help" },
                { name: "Privacy Policy", href: "#privacy" },
                { name: "Terms of Service", href: "#terms" },
                { name: "Cookie Policy", href: "#cookies" },
              ],
            }
          ].map((section, index) => (
            <div key={index} className="space-y-6">
              <h3 className="font-bold text-xl text-white relative">
                {section.title}
                <div className="absolute -bottom-2 left-0 w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
              </h3>
              <ul className="space-y-4">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      className="text-slate-300 hover:text-white transition-all duration-200 hover:translate-x-1 inline-block relative group"
                    >
                      {link.name}
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="space-y-6 lg:col-span-2">
            <h1 className="text-2xl font-bold text-white mb-2"> Follow Us on </h1>
            
            {/* Social Links */}
            <div className="flex space-x-4 pt-4">
              {socialLinks.map((social, index) => (
                <Link
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 bg-slate-800 hover:bg-primary rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg group"
                >
                  <social.icon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                </Link>
              ))}
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Stay in the Loop</h3>
              <p className="text-slate-300">Get the latest updates, insights, and exclusive content delivered to your inbox.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <div className="flex-1 relative">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="Enter your email address"
                  required
                  className="w-full p-2 bg-slate-900/50 border border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 transition-all duration-200"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`p-2 bg-primary hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                  isSubmitting ? 'animate-pulse' : ''
                }`}
              >
                {isSubmitting ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-700/50 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-slate-400 text-center md:text-left">
              © 2024 Prabisha Consulting. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 text-slate-400">
              <span className="flex items-center space-x-2">
                <span>Built with</span>
                <span className="text-red-400 animate-pulse">❤️</span>
                <span>for modern marketers</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
