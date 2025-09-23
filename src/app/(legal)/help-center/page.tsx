"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Mail, Phone, Send, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export default function HelpCenterPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    inquiryType: "",
    message: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormState(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (value: string) => {
    setFormState(prev => ({
      ...prev,
      inquiryType: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      })

      if (response.ok) {
        setIsSubmitted(true)
        setFormState({
          name: "",
          email: "",
          phone: "",
          inquiryType: "",
          message: "",
        })
        toast.success("Request submitted successfully!")
      } else {
        toast.error("Failed to submit request. Please try again.")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      toast.error("Failed to submit request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[url('/subtle-pattern.png')] opacity-[0.03] pointer-events-none"></div>

      <main className="flex-1 w-full relative">
        {/* Hero Section */}
        <section className="w-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
          <div className="max-w-5xl mx-auto px-6 py-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Get in Touch <br />
              <span>We&apos;d Love to Hear From You</span>
            </h1>
            <p className="text-lg opacity-90">
              Have questions about our services? Need a custom quote?
              <br className="hidden md:inline" /> Our team is ready to assist you with all your needs.
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left side - Form */}
            <div className="lg:col-span-7">
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-3">Send Us a Message</h2>
                <p className="text-muted-foreground">
                  Fill out the form below and we&apos;ll get back to you as soon as possible.
                </p>
              </div>

              {isSubmitted ? (
                <Card className="text-center">
                  <CardContent className="p-10">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} className="text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Message Sent Successfully!</h3>
                    <p className="text-muted-foreground">
                      Thank you for contacting us. We&apos;ll respond to your inquiry shortly.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-medium">
                        Full Name
                      </label>
                      <Input
                        id="name"
                        name="name"
                        value={formState.name}
                        onChange={handleChange}
                        placeholder="John Smith"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-medium">
                        Email Address
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formState.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="phone" className="block text-sm font-medium">
                        Phone Number
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formState.phone}
                        onChange={handleChange}
                        placeholder="+44 123 456 7890"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="inquiryType" className="block text-sm font-medium">
                        Inquiry Type
                      </label>
                      <Select value={formState.inquiryType} onValueChange={handleSelectChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general inquiry">General Inquiry</SelectItem>
                          <SelectItem value="request a quote">Request a Quote</SelectItem>
                          <SelectItem value="technical support">Technical Support</SelectItem>
                          <SelectItem value="business partnership">Business Partnership</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="message" className="block text-sm font-medium">
                      Your Message
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formState.message}
                      onChange={handleChange}
                      placeholder="Please provide details about your inquiry..."
                      required
                      className="min-h-[150px]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-6 text-base font-medium w-full md:w-auto"
                  >
                    {isSubmitting ? "Processing..." : (
                      <>
                        <Send size={18} className="mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Right side - Contact Information */}
            <div className="lg:col-span-5">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-8 pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                      <Mail size={20} />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold mb-1">Email Us</h4>
                      <p className="text-muted-foreground mb-1">For general inquiries:</p>
                      <a href="mailto:info@prabisha.com" className="hover:underline">
                        info@prabisha.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                      <Phone size={20} />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold mb-1">Call Us</h4>
                      <p className="text-muted-foreground mb-1">Customer Service:</p>
                      <a href="tel:+07867090363" className="hover:underline">
                        +44 (0) 7867090363
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
