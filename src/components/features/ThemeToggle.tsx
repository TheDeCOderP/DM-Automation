import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from "lucide-react";
import { Button } from '../ui/button';

export default function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10" />;
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative border rounded-full h-10 w-10"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    > 
      {/* Sun icon with enhanced gradient */}
      <div className={`absolute transition-all duration-500 ${
        theme === 'dark' 
          ? 'rotate-90 scale-0 opacity-0' 
          : 'rotate-0 scale-100 opacity-100'
      }`}>
        {/* Sun icon */}
        <Sun className="relative w-5 h-5"/>
      </div>
      
      {/* Moon icon */}
      <Moon 
        className={`w-5 h-5 absolute transition-all duration-500 ${
          theme === 'dark' 
            ? 'rotate-0 scale-100 opacity-100' 
            : '-rotate-90 scale-0 opacity-0'
        }`}
        style={{
          filter: theme === 'dark' ? 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.5))' : 'none'
        }}
      />
      
      {/* Rotating stars effect for dark mode */}
      {theme === 'dark' && (
        <>
          <span className="absolute top-1 right-1 w-1 h-1 bg-blue-300 rounded-full animate-pulse" 
                style={{ animationDelay: '0ms', animationDuration: '2000ms' }} />
          <span className="absolute bottom-2 left-1 w-0.5 h-0.5 bg-blue-200 rounded-full animate-pulse" 
                style={{ animationDelay: '500ms', animationDuration: '1500ms' }} />
          <span className="absolute top-2 left-2 w-0.5 h-0.5 bg-purple-300 rounded-full animate-pulse" 
                style={{ animationDelay: '1000ms', animationDuration: '2500ms' }} />
        </>
      )}
      
      {/* Ripple effect on click */}
      <span className="absolute inset-0 rounded-md opacity-0 group-active:opacity-100 group-active:animate-ping bg-current/20" />
      
      {/* Subtle glow effect for light mode */}
      {theme === 'light' && (
        <div className="absolute inset-0 rounded-full bg-yellow-400/10 blur-md animate-pulse" 
             style={{ animationDuration: '4000ms' }} />
      )}
    </Button>
  );
}