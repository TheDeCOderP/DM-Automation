"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { User, Mail, Key, RefreshCcw, Eye, EyeOff } from "lucide-react";

import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [captcha, setCaptcha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    captcha: ''
  });

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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords don't match");
      }

      // Use signIn with credentials provider for registration
      const result = await signIn('credentials', {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        redirect: false,
        callbackUrl: '/accounts',
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        toast.success('Registration successful!');
        router.push('/accounts');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signIn('google', { 
        callbackUrl: '/accounts',
        redirect: false 
      });
      
      if (result?.error) {
        toast.error('Failed to sign in with Google. Please try again.');
      } else if (result?.url) {
        toast.success('Signing in with Google...');
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('An error occurred while signing in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signIn('facebook', { 
        callbackUrl: '/accounts',
        redirect: false 
      });
      
      if (result?.error) {
        toast.error('Failed to sign in with Facebook. Please try again.');
      } else if (result?.url) {
        toast.success('Signing in with Facebook...');
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Facebook login error:', error);
      toast.error('An error occurred while signing in with Facebook.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-4xl w-full grid md:grid-cols-2 rounded-3xl shadow-xl border border-slate-200 bg-white overflow-hidden">

        <div className="bg-gradient-to-br from-primary to-primary/90 text-white p-8 flex flex-col relative">
            {/* Header */}
            <div className="text-primary-foreground p-8 text-center relative">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-4 left-4 w-20 h-20 bg-primary-foreground rounded-full blur-xl"></div>
                    <div className="absolute bottom-4 right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
                </div>
                <div className="z-10 relative space-y-3">
                    <div className="backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto">
                      <Image src="/icons/logo.png" alt="Logo" width={80} height={80} unoptimized unselectable="on" />
                    </div>
                    <div>
                    <h1 className="text-2xl font-bold mb-1">Create Account</h1>
                    <p className="text-white/90 text-sm">Join us and start your journey</p>
                    </div>
                </div>
            </div>

            {/* Social Login Options */}
            <div className="p-6 pb-4">
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full text-black flex items-center justify-center gap-2 py-2.5 h-10 border-slate-300 hover:bg-slate-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleFacebookLogin}
                disabled={isLoading}
                className="w-full text-black flex items-center justify-center gap-2 py-2.5 h-10 border-slate-300 hover:bg-slate-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continue with Facebook
              </Button>
            </div>
            </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-xs font-medium text-slate-700">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-primary rounded-full p-1.5">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="pl-10 h-10 text-sm border-slate-300 focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-medium text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-primary rounded-full p-1.5">
                  <Mail className="w-3.5 h-3.5 text-white" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="pl-10 h-10 text-sm border-slate-300 focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Password Fields Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-primary rounded-full p-1.5">
                    <Key className="w-3.5 h-3.5 text-white" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Password"
                    className="pl-10 h-10 text-sm border-slate-300 focus:border-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-xs font-medium text-slate-700">
                  Confirm
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-primary rounded-full p-1.5">
                    <Key className="w-3.5 h-3.5 text-white" />
                  </div>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm"
                    className="pl-10 h-10 text-sm border-slate-300 focus:border-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

              {/* Captcha */}
              <div className="space-y-1">
                <label htmlFor="captcha" className="text-xs font-medium text-slate-700">Security Code</label>
                <div className="flex gap-2 items-center">
                  <div className="bg-secondary px-3 py-2 rounded-lg font-mono text-sm tracking-widest min-w-0 flex-shrink-0 select-none">
                    {captcha}
                  </div>
                  <Input
                    name="captcha"
                    value={formData.captcha}
                    onChange={handleInputChange}
                    placeholder="Enter code"
                    className="flex-1 h-10 text-sm border-slate-300 focus:border-primary"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateCaptcha}
                    disabled={isLoading}
                    className="p-2 h-10 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          {/* Footer */}
          <div className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline transition-colors cursor-pointer">Sign In</Link>
            </p>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              By creating an account, you agree to our{" "}
              <button className="text-primary hover:underline">Terms of Service</button> and{" "}
              <button className="text-primary hover:underline">Privacy Policy</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
