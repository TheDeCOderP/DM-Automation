'use client'

import { format } from 'date-fns';
import cronParser from 'cron-parser';
import { useState, useEffect, useCallback } from 'react';
import { CalendarIcon, ClockIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import { ScheduleData } from '@/types/scheduled-data'

type FrequencyType = 'once' | 'minutes' | 'daily' | 'monthly' | 'yearly' | 'custom';

interface SchedulePostModalProps {
  onSubmit: () => void
  schedule: ScheduleData
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleData>>
}

export default function SchedulePostModal({ onSubmit, schedule, setSchedule }: SchedulePostModalProps) {
  const [open, setOpen] = useState(false)
  const [nextExecutions, setNextExecutions] = useState<string[]>([])

  const handleScheduleChange = (field: keyof ScheduleData, value: ScheduleData[keyof ScheduleData]) => {
    setSchedule(prev => ({ ...prev, [field]: value }))
  }

  const generateCronExpression = useCallback(() => {
    if (schedule.frequency === 'once') {
      return null // No cron expression for one-time schedule
    }

    const [hours, minutes] = schedule.startTime.split(':').map(Number)
    const day = schedule.startDate.getDate()
    const month = schedule.startDate.getMonth() + 1 // Months are 0-indexed
    
    switch (schedule.frequency) {
      case 'minutes':
        return `*/${schedule.interval || 15} * * * *`
      case 'daily':
        return `${minutes} ${hours} * * *`
      case 'monthly':
        return `${minutes} ${hours} ${schedule.dayOfMonth || day} * *`
      case 'yearly':
        return `${minutes} ${hours} ${schedule.dayOfMonth || day} ${schedule.month || month} *`
      case 'custom':
        return schedule.customExpression || ''
      default:
        return `${minutes} ${hours} * * *`
    }
  }, [schedule])

  const calculateNextExecutions = useCallback(() => {
    if (schedule.frequency === 'once') {
      // For one-time schedule, just show the scheduled date/time
      const dateTime = new Date(schedule.startDate)
      const [hours, minutes] = schedule.startTime.split(':').map(Number)
      dateTime.setHours(hours, minutes, 0, 0)
      setNextExecutions([format(dateTime, "EEEE, MMMM d, yyyy h:mm a")])
      return
    }

    const cronExpression = generateCronExpression()
    if (!cronExpression) return

    try {
      const interval = cronParser.parse(cronExpression, {
        currentDate: schedule.startDate,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone
      })

      const executions: string[] = []
      for (let i = 0; i < 5; i++) {
        try {
          const nextDate = interval.next().toDate()
          executions.push(format(nextDate, "EEEE, MMMM d, yyyy h:mm a"))
        } catch (error: unknown) {
          console.error(`Error getting execution ${i + 1}: `, error instanceof Error ? error.message : 'Unknown error');
          break
        }
      }

      setNextExecutions(executions)
    } catch (error: unknown) {
      console.error('Error parsing cron expression: ', error instanceof Error ? error.message : 'Unknown error');
      setNextExecutions(['Invalid schedule expression'])
    }
  }, [schedule, generateCronExpression])

  useEffect(() => {
    calculateNextExecutions()
  }, [calculateNextExecutions])

  return (
    <>
      <Button variant="outline" size="lg" onClick={() => setOpen(true)}>
        Schedule Post
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Schedule Post</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !schedule.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {schedule.startDate ? format(schedule.startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={schedule.startDate}
                      onSelect={(date) => date && handleScheduleChange('startDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <div className="relative">
                  <Input
                    type="time"
                    value={schedule.startTime}
                    onChange={(e) => handleScheduleChange('startTime', e.target.value)}
                    className="pr-10"
                  />
                  <ClockIcon className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 sm:grid-cols-1 gap-4">
              <div className="space-y-4">
                <Label>Execution schedule</Label>
                <RadioGroup
                  value={schedule.frequency}
                  onValueChange={(value) => handleScheduleChange('frequency', value as FrequencyType)}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="once" id="once" />
                    <Label htmlFor="once">Once at {schedule.startTime} on {format(schedule.startDate, "MMM d, yyyy")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="minutes" id="minutes" />
                    <Label htmlFor="minutes" className="flex items-center gap-2">
                      Every <Input 
                        type="number" 
                        className="w-16 h-8" 
                        min="1" 
                        max="59" 
                        value={schedule.interval || 15} 
                        onChange={(e) => handleScheduleChange('interval', parseInt(e.target.value))}
                        disabled={schedule.frequency !== 'minutes'}
                      /> minute(s)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="daily" />
                    <Label htmlFor="daily">Every day at {schedule.startTime}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly" className="flex items-center gap-2">
                      Every <Input 
                        type="number" 
                        className="w-16 h-8" 
                        min="1" 
                        max="31" 
                        value={schedule.dayOfMonth || schedule.startDate.getDate()} 
                        onChange={(e) => handleScheduleChange('dayOfMonth', parseInt(e.target.value))}
                        disabled={schedule.frequency !== 'monthly'}
                      /> of the month at {schedule.startTime}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yearly" id="yearly" />
                    <Label htmlFor="yearly" className="flex items-center gap-2">
                      Every year on <Input 
                        type="number" 
                        className="w-16 h-8" 
                        min="1" 
                        max="31" 
                        value={schedule.dayOfMonth || schedule.startDate.getDate()} 
                        onChange={(e) => handleScheduleChange('dayOfMonth', parseInt(e.target.value))}
                        disabled={schedule.frequency !== 'yearly'}
                      /> <Select
                        value={(schedule.month || (schedule.startDate.getMonth() + 1)).toString()}
                        onValueChange={(value) => handleScheduleChange('month', parseInt(value))}
                        disabled={schedule.frequency !== 'yearly'}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i} value={(i + 1).toString()}>
                              {new Date(0, i).toLocaleString('default', { month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select> at {schedule.startTime}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom" className="flex items-center gap-2">
                      Custom <Input 
                        type="text" 
                        className="w-48 h-8" 
                        placeholder="* * * * *"
                        value={schedule.customExpression || ''}
                        onChange={(e) => handleScheduleChange('customExpression', e.target.value)}
                        disabled={schedule.frequency !== 'custom'}
                      />
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Next executions</Label>
                <div className="border rounded-md p-4 space-y-2">
                  {nextExecutions.length > 0 ? (
                    nextExecutions.map((execution, i) => (
                      <div key={i}>{execution}</div>
                    ))
                  ) : (
                    <div>No upcoming executions</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={async() => {
                onSubmit();
                setOpen(false);
              }}
            >
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}