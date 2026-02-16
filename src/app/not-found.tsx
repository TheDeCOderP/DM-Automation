"use client";

import Link from "next/link";
import { Home, ArrowLeft, Search, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function FrontendNotFound() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-2xl space-y-8 animate-fade-in">
          {/* 404 Number with Animation */}
          <div className="relative">
            <h1 className="text-[150px] md:text-[200px] font-black leading-none bg-gradient-to-br from-gray-900 via-gray-700 to-gray-500 dark:from-gray-100 dark:via-gray-300 dark:to-gray-500 bg-clip-text text-transparent animate-float">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <Search className="w-16 h-16 md:w-24 md:h-24 text-gray-300 dark:text-gray-700 animate-bounce" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-4">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
              Page Not Found
            </h2>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Oops! The page you're looking for seems to have wandered off into the digital void. 
              Don't worry, we'll help you find your way back.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button 
              size="lg" 
              onClick={() => router.back()}
              className="w-full sm:w-auto group"
            >
              <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              Go Back
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              asChild
              className="w-full sm:w-auto group"
            >
              <Link href="/">
                <Home className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Back to Home
              </Link>
            </Button>
          </div>

          {/* Additional Help */}
          <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              Need assistance? We're here to help!
            </p>
            <Button 
              variant="ghost" 
              size="sm"
              asChild
              className="group"
            >
              <Link href="/help-center">
                <Mail className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                Contact Support
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .delay-500 {
          animation-delay: 500ms;
        }
        
        .delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
    </div>
  );
}
