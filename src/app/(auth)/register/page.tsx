"use client"
import Link from "next/link"
import type React from "react"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { User, Mail, Key, RefreshCcw, Eye, EyeOff } from "lucide-react"

import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function RegisterPage() {
  const router = useRouter()
  const [captcha, setCaptcha] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    captcha: "",
  })

  useEffect(() => {
    generateCaptcha()
  }, [])

  const generateCaptcha = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const newCaptcha = Array.from({ length: 6 })
      .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
      .join("")
    setCaptcha(newCaptcha)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords don't match")
      }

      // Use signIn with credentials provider for registration
      const result = await signIn("credentials", {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        redirect: false,
        callbackUrl: "/accounts",
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      if (result?.ok) {
        toast.success("Registration successful!")
        router.push("/accounts")
      }
    } catch (error) {
      console.error("Registration error:", error)
      toast.error("Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      await signIn("google", {
        callbackUrl: "/accounts",
        redirect: false,
      })
    } catch (error) {
      console.error("Google login error:", error)
      toast.error("Failed to sign in with Google. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden grid lg:grid-cols-2 bg-white dark:bg-slate-900 backdrop-blur-sm">
        {/* Left Pane */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white p-8 flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-8 left-8 w-20 h-20 bg-white rounded-full blur-xl"></div>
            <div className="absolute bottom-8 right-8 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>
          </div>
          <div className="z-10 text-center space-y-3">
            <div className="backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto">
              <Image src="/icons/logo.png" alt="Logo" width={80} height={80} unoptimized />
            </div>
            <h2 className="text-2xl font-bold">Create Account</h2>
            <p className="text-white/90 max-w-xs mx-auto text-sm">Join us to manage your account securely.</p>
          </div>
        </div>

        {/* Right Pane */}
        <div className="p-8 flex flex-col justify-center">
          <div className="space-y-2">
            <div className="space-y-1 text-center">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Sign Up</h1>
              <p className="text-xs text-muted-foreground">Enter your details to create an account</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-blue-600 rounded-lg p-1.5">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="pl-10 h-10 text-sm border-slate-300 dark:border-slate-600 focus:border-blue-600 dark:bg-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-blue-600 rounded-lg p-1.5">
                    <Mail className="w-3.5 h-3.5 text-white" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className="pl-10 h-10 text-sm border-slate-300 dark:border-slate-600 focus:border-blue-600 dark:bg-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              {/* Password Fields Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password */}
                <div>
                  <label htmlFor="password" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-blue-600 rounded-lg p-1.5">
                      <Key className="w-3.5 h-3.5 text-white" />
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Password"
                      className="pl-10 pr-10 h-10 text-sm border-slate-300 dark:border-slate-600 focus:border-blue-600 dark:bg-slate-800 dark:text-slate-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-blue-600 rounded-lg p-1.5">
                      <Key className="w-3.5 h-3.5 text-white" />
                    </div>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm password"
                      className="pl-10 pr-10 h-10 text-sm border-slate-300 dark:border-slate-600 focus:border-blue-600 dark:bg-slate-800 dark:text-slate-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Captcha */}
              <div className="space-y-1">
                <label htmlFor="captcha" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Security Code
                </label>
                <div className="flex gap-2 items-center">
                  <div className="bg-secondary dark:bg-slate-700 px-3 py-2 rounded-lg font-mono text-sm tracking-widest min-w-0 flex-shrink-0 select-none dark:text-slate-200">
                    {captcha}
                  </div>
                  <Input
                    id="captcha"
                    name="captcha"
                    value={formData.captcha}
                    onChange={handleInputChange}
                    placeholder="Enter code"
                    className="flex-1 h-10 text-sm border-slate-300 dark:border-slate-600 focus:border-primary dark:bg-slate-800 dark:text-slate-100"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateCaptcha}
                    disabled={isLoading}
                    className="p-2 h-10 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 bg-transparent"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 h-10 rounded-lg shadow-sm hover:shadow-md transition-all text-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating Account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            {/* Footer Links */}
            <div className="pt-4 text-xs text-center">
              <div className="text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-blue-600 dark:text-blue-400 font-medium hover:underline transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-300 dark:border-slate-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 h-10 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm"
                disabled={isLoading}
              >
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

            {/* Terms and Privacy */}
            <div className="pt-2 text-center">
              <p className="text-xs text-muted-foreground">
                By creating an account, you agree to our{" "}
                <Link href="/terms-of-service" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</Link> and{" "}
                <Link href="/privacy-policy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}