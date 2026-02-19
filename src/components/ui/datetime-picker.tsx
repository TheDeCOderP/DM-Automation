"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Globe } from "lucide-react";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  disabled = false,
  label = "Schedule Time",
  required = false,
}: DateTimePickerProps) {
  const [timeUntil, setTimeUntil] = useState<string>("");
  const [userTimezone, setUserTimezone] = useState<string>("");
  const [ukTime, setUkTime] = useState<string>("");
  const [indiaTime, setIndiaTime] = useState<string>("");

  // Get user's timezone
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);
  }, []);

  // Calculate UK and India times whenever value changes
  useEffect(() => {
    if (!value) {
      setUkTime("");
      setIndiaTime("");
      return;
    }

    try {
      const date = new Date(value);
      
      // Format for UK (Europe/London)
      const ukFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      setUkTime(ukFormatter.format(date));

      // Format for India (Asia/Kolkata)
      const indiaFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      setIndiaTime(indiaFormatter.format(date));
    } catch (error) {
      console.error('Error formatting times:', error);
    }
  }, [value]);

  // Calculate time until scheduled
  useEffect(() => {
    if (!value) {
      setTimeUntil("");
      return;
    }

    const calculateTimeUntil = () => {
      const now = new Date();
      const scheduled = new Date(value);
      const diff = scheduled.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntil("⚠️ Time has passed - please select a future time");
        return;
      }

      const totalMinutes = Math.floor(diff / (1000 * 60));
      
      if (totalMinutes < 5) {
        setTimeUntil("⚠️ Less than 5 minutes - please select a time further in the future");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeUntil(`📅 In ${days} day${days !== 1 ? 's' : ''} ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeUntil(`⏰ In ${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`);
      } else {
        setTimeUntil(`⏰ In ${minutes} minute${minutes !== 1 ? 's' : ''}`);
      }
    };

    calculateTimeUntil();
    const interval = setInterval(calculateTimeUntil, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [value]);

  // Get minimum datetime (current time + 5 minutes)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Add 5 minutes buffer
    return now.toISOString().slice(0, 16);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedTime = e.target.value;
    const minTime = getMinDateTime();

    // Validate that selected time is not in the past
    if (selectedTime < minTime) {
      // Don't update if time is in the past
      return;
    }

    onChange(selectedTime);
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="datetime-picker" className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        {label}
        {required && <span className="text-red-500">*</span>}
        {userTimezone && (
          <span className="text-xs text-muted-foreground font-normal ml-auto">
            Your timezone: {userTimezone}
          </span>
        )}
      </Label>
      
      <Input
        id="datetime-picker"
        type="datetime-local"
        value={value}
        onChange={handleChange}
        min={getMinDateTime()}
        disabled={disabled}
        className="w-full"
      />

      {/* UK and India Time Display */}
      {value && (ukTime || indiaTime) && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg border">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Globe className="w-3 h-3" />
              <span>UK Time</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {ukTime || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">Europe/London</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Globe className="w-3 h-3" />
              <span>India Time</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {indiaTime || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">Asia/Kolkata (IST)</p>
          </div>
        </div>
      )}

      {timeUntil && (
        <p className={`text-sm font-medium ${timeUntil.includes('⚠️') ? 'text-red-500' : 'text-green-600'}`}>
          {timeUntil}
        </p>
      )}
      
      {!value && (
        <p className="text-xs text-muted-foreground">
          Select a date and time at least 5 minutes in the future (in your local timezone)
        </p>
      )}
      
      {value && (
        <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-primary">
          <span className="text-primary dark:text-blue-400 text-xs mt-0.5">ℹ️</span>
          <p className="text-xs text-primary dark:text-blue-300">
            You're setting the time in <strong>{userTimezone}</strong>. The post will publish at the same moment for everyone, but team members in other timezones will see their local time.
          </p>
        </div>
      )}
    </div>
  );
}
