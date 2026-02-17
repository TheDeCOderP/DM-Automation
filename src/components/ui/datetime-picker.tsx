"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

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
    <div className="space-y-2">
      <Label htmlFor="datetime-picker" className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        {label}
        {required && <span className="text-red-500">*</span>}
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
      {timeUntil && (
        <p className={`text-sm font-medium ${timeUntil.includes('⚠️') ? 'text-red-500' : 'text-green-600'}`}>
          {timeUntil}
        </p>
      )}
      {!value && (
        <p className="text-xs text-muted-foreground">
          Select a date and time at least 5 minutes in the future
        </p>
      )}
    </div>
  );
}
