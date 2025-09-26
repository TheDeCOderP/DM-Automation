"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { User, Mail, Key, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import ThemeToggle from "@/components/features/ThemeToggle"
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { useConfig } from "@/hooks/useConfig"

export default function RegisterPage() {
  const router = useRouter()
  const { isSiteNameLoading, config } = useConfig();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords don't match")
      }

      if (!executeRecaptcha) throw new Error("Recaptcha not ready")
      const token = await executeRecaptcha("register")

      const verifyRes = await fetch("/api/verify-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyData.success) throw new Error("Captcha verification failed")

      const result = await signIn("credentials", {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        redirect: false,
        callbackUrl: "/accounts",
      })

      if (result?.error) throw new Error(result.error)

      toast.success("Registration successful!")
      router.push("/accounts")
    } catch (error) {
      console.error("Registration error:", error)
      toast.error(error instanceof Error ? error.message : "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      await signIn("google", { callbackUrl: "/accounts", redirect: false })
    } catch (error) {
      console.error("Google login error:", error)
      toast.error("Failed to sign in with Google. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center px-4">
      <div className="relative max-w-4xl w-full rounded-2xl shadow-xl border overflow-hidden grid lg:grid-cols-2 bg-background">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Left Pane */}
        <div className="hidden bg-primary dark:bg-secondary dark:to-blue-800 text-white p-8 lg:flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-8 left-8 w-20 h-20 bg-white rounded-full blur-xl"></div>
            <div className="absolute bottom-8 right-8 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>
          </div>
         <div className="z-10 text-center space-y-3">
          {/* Logo */}
          <div className="backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Image
              src="/icons/logo1.png"
              alt="Logo"
              width={80}
              height={80}
              unoptimized
            />
          </div>

          {/* Site Name */}
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {isSiteNameLoading ? <Skeleton className="h-8 w-32 mx-auto" /> : config?.siteName || "Prabisha"}
          </h1>

          {/* Byline */}
          <h2 className="text-md">
            By{" "}
            <span className="font-semibold text-orange-400">
              Prabisha Consulting
            </span>
          </h2>

          {/* Welcome Text */}
          <h2 className="text-2xl font-bold">Create Account</h2>
          <p className="opacity-90 max-w-xs mx-auto text-sm">
            Join us to manage your account securely.
          </p>
        </div>
        </div>

        {/* Right Pane */}
        <div className="p-8 flex flex-col justify-center">
          <div className="space-y-2">
            <div className="space-y-1 text-center">
              <h1 className="text-xl font-bold">Sign Up</h1>
              <p className="text-xs text-muted-foreground">
                Enter your details to create an account
              </p>
            </div>

            <form className="space-y-2" onSubmit={handleSubmit}>
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="text-xs font-medium">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-primary rounded-lg p-1.5">
                    <User className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="pl-10 h-10 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="text-xs font-medium">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-primary rounded-lg p-1.5">
                    <Mail className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className="pl-10 h-10 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="text-xs font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-primary rounded-lg p-1.5">
                      <Key className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Password"
                      className="pl-10 pr-10 h-10 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="text-xs font-medium">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-primary rounded-lg p-1.5">
                      <Key className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm password"
                      className="pl-10 pr-10 h-10 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            {/* Social login */}
            <div className="pt-2 text-xs text-center">
              <div className="text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-medium hover:underline">
                  Sign In
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2">Or continue with</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 h-10 hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
                disabled={isLoading}
              >
                {/* Google Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
