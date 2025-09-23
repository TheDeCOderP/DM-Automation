"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

export default function CookiePolicyPage() {
  return (
    <div className="bg-background min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Image className="w-16 h-16 object-contain" src="/icons/cookies.png" alt="" width={72} height={72} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
            Our Cookie Policy
          </h1>
          <p className="text-muted-foreground text-lg">
            Last Updated: September 19, 2025
          </p>
        </div>

        {/* Intro */}
        <Card className="mb-12">
          <CardContent className="p-8">
            <p className="leading-relaxed text-lg">
              This page explains how <span className="font-semibold">DMA</span> uses cookies to power our platform and give you the best possible experience. 
              We believe in transparency, so we want you to understand what these technologies are, why we use them, and how you can manage your preferences.
            </p>
          </CardContent>
        </Card>

        {/* What Are Cookies */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">What Are Cookies?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Cookies are small text files placed on your device by a website. They&apos;re like a website&apos;s memory, helping us remember your preferences, provide essential functionality, and understand how our platform is being used to make it better for you.
          </p>
        </div>

        <Separator className="my-10" />

        {/* How We Use Cookies */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">How We Use Cookies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Essential Cookies",
                desc: "These are a must-have for the platform to work correctly. They allow you to securely log in and use core features of our automation software.",
                icon: "🍪",
              },
              {
                title: "Performance & Analytics",
                desc: "We use these to understand how our users interact with the platform. This data helps us spot trends, identify bugs, and continuously improve our service.",
                icon: "📈",
              },
              {
                title: "Functionality Cookies",
                desc: "These cookies remember your preferences—like your connected social accounts or theme settings. They personalize your experience so you don’t have to re-enter information every time.",
                icon: "⚙️",
              },
              {
                title: "Marketing Cookies",
                desc: "We use these to measure the effectiveness of our marketing efforts. They help us show you relevant ads and track our success so we can grow and offer more features.",
                icon: "📢",
              },
            ].map((cookie, idx) => (
              <Card key={idx} className="shadow-md">
                <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                  <span className="text-2xl">{cookie.icon}</span>
                  <CardTitle className="text-lg font-semibold">{cookie.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{cookie.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator className="my-10" />

        {/* Your Choices */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Your Choices</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            You are in complete control of your cookie preferences. Most web browsers allow you to manage and control cookies through their settings. You can:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-4">
            <li><span className="font-medium">Block or Delete Cookies:</span> Choose to block all cookies or delete them after your browsing session.</li>
            <li><span className="font-medium">Manage Third-Party Cookies:</span> Opt-out of third-party cookies used for advertising.</li>
          </ul>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Please note that disabling essential cookies may impact the functionality of our service. For detailed instructions, please consult your browser’s help section.
          </p>
        </div>

        <Separator className="my-10" />

        {/* Contact */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
          <p className="text-muted-foreground mb-6">
            If you have any questions about our use of cookies, please contact us:
          </p>
          <Button variant="outline" asChild>
            <a href="mailto:info@prabisha.com" className="inline-flex items-center">
              info@prabisha.com
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
