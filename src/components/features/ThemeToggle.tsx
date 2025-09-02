import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from "lucide-react";

import { Button } from '../ui/button';

export default function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative hover:bg-accent"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <Moon className='w-5 h-5'/>: <Sun className="w-5 h-5" />}
    </Button>
  )
}
