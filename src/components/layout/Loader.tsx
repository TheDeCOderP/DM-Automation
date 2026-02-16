"use client";

export default function Loader() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-6">
        {/* Animated logo or spinner */}
        <div className="relative w-20 h-20">
          {/* Outer ring */}
          <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-muted animate-pulse" />
          
          {/* Spinning ring */}
          <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin" 
               style={{ animationDuration: "0.8s" }} />
          
          {/* Middle ring - opposite direction */}
          <div className="absolute inset-2 w-16 h-16 rounded-full border-4 border-transparent border-b-primary border-l-primary animate-spin" 
               style={{ animationDuration: "1.2s", animationDirection: "reverse" }} />
          
          {/* Inner pulsing dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-primary animate-pulse" 
                 style={{ animationDuration: "1.5s" }} />
          </div>
        </div>

        {/* Loading text with animated dots */}
        <div className="flex items-center gap-1">
          <p className="text-xl font-semibold text-foreground">Loading</p>
          <div className="flex gap-1 pb-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>

        {/* Shimmer progress bar */}
        <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-gradient-to-r from-primary via-primary/60 to-primary animate-shimmer bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}