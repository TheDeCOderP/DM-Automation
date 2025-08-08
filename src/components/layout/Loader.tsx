"use client";
import { Loader2 } from "lucide-react";

export default function Loader() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 
          className="h-12 w-12 animate-spin text-primary" 
          style={{ animationDuration: "1.5s" }}
        />
        <p className="text-lg font-medium text-muted-foreground">
          Loading...
        </p>
        <div className="h-1 w-32 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-progress" />
        </div>
      </div>
    </div>
  );
}