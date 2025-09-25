"use client"

import Head from "next/head"
import Image from "next/image";
import { ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy — DM Automation</title>
        <meta
          name="description"
          content="Privacy Policy for DM Automation — how we collect, use, retain and protect user data."
        />
      </Head>

      <main className="min-h-screen bg-background text-foreground py-16">
        {/* Hero Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Image className="w-12 h-12 object-contain" src="/icons/lock.png" alt="" width={72} height={72} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-lg">
            Last Updated: September 19, 2025
          </p>
        </div>

        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 py-12 px-4 md:px-8">
          {/* Sidebar navigation */}
          <aside className="hidden md:block md:col-span-1 sticky top-28 h-fit">
            <nav className="space-y-3 text-sm">
              {[
                "Information we collect",
                "Why we collect",
                "Retention & disconnection",
                "Security",
                "Sharing & disclosures",
                "Cookies",
                "Your rights",
                "International transfers",
                "Third-party services",
                "Children",
                "Changes",
                "Contact",
              ].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className="block text-muted-foreground hover:text-primary transition-colors"
                >
                  {item}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="md:col-span-3">
            <Card className="border-border shadow-lg">
              <CardContent className="p-6">
                <ScrollArea className="h-[70vh] pr-4">
                  <Accordion type="single" collapsible className="w-full space-y-4">
                    <AccordionItem value="item-1" id="information-we-collect">
                      <AccordionTrigger>1. Information we collect</AccordionTrigger>
                      <AccordionContent>
                        <h4 className="font-semibold mt-2">1.1 Account & usage data</h4>
                        <ul className="list-disc ml-6 space-y-1">
                          <li>Name or display name</li>
                          <li>Email address</li>
                          <li>IP address & device info</li>
                          <li>Usage analytics (features used, errors)</li>
                          <li>Uploaded content & scheduling data</li>
                        </ul>
                        <h4 className="font-semibold mt-4">1.2 Social media account data</h4>
                        <ul className="list-disc ml-6 space-y-1">
                          <li>Provider user ID</li>
                          <li>Access & refresh tokens</li>
                          <li>Basic profile info (if permitted)</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2" id="why-we-collect">
                      <AccordionTrigger>2. Why we collect this data</AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc ml-6 space-y-1">
                          <li>Provide & maintain core features</li>
                          <li>Post and schedule to linked accounts</li>
                          <li>Store audit history of posts</li>
                          <li>Improve service & provide support</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3" id="retention-disconnection">
                      <AccordionTrigger>3. Retention & disconnection</AccordionTrigger>
                      <AccordionContent>
                        Even if you disconnect a social account, we may keep a
                        record for analytics and troubleshooting. Tokens are
                        removed from active use.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-4" id="security">
                      <AccordionTrigger>4. Security</AccordionTrigger>
                      <AccordionContent>
                        Tokens are encrypted at rest with strict access
                        controls. While no system is 100% secure, we follow
                        industry standards.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-5" id="sharing-disclosures">
                      <AccordionTrigger>5. Sharing & disclosures</AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc ml-6 space-y-1">
                          <li>With service providers (hosting, analytics, etc.)</li>
                          <li>As required by law</li>
                          <li>To protect rights, property, or safety</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-6" id="cookies">
                      <AccordionTrigger>6. Cookies & tracking</AccordionTrigger>
                      <AccordionContent>
                        We use cookies for functionality & analytics. You can
                        manage these in browser settings.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-7" id="your-rights">
                      <AccordionTrigger>7. Your rights</AccordionTrigger>
                      <AccordionContent>
                        You may request access, correction, or deletion of your
                        data, subject to legal retention requirements.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-8" id="international">
                      <AccordionTrigger>8. International transfers</AccordionTrigger>
                      <AccordionContent>
                        Data may be processed outside your country with
                        safeguards applied where required.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-9" id="third-party">
                      <AccordionTrigger>9. Third-party services</AccordionTrigger>
                      <AccordionContent>
                        We integrate with third-party services. Their policies
                        apply separately.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-10" id="children">
                      <AccordionTrigger>10. Children</AccordionTrigger>
                      <AccordionContent>
                        We don’t knowingly collect data from children under 13.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-11" id="changes">
                      <AccordionTrigger>11. Changes</AccordionTrigger>
                      <AccordionContent>
                        We may update this policy. Material changes will be
                        announced by email or on-site.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-12" id="contact">
                      <AccordionTrigger>12. Contact us</AccordionTrigger>
                      <AccordionContent>
                        <p>DM Automation</p>
                        <p>
                          Website:{" "}
                          <a
                            href="https://dma.prabisha.com/"
                            className="text-primary underline"
                          >
                            dma.prabisha.com
                          </a>
                        </p>
                        <p>Email: <strong>privacy@prabisha.com</strong></p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Floating Back-to-Top */}
        <Button
          variant="secondary"
          size="icon"
          className="fixed bottom-6 right-6 rounded-full shadow-md"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ChevronUp className="h-5 w-5" />
        </Button>
      </main>
    </>
  )
}
