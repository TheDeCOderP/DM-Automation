export interface ScheduleData {
  startDate: Date
  startTime: string
  frequency: 'once' | 'minutes' | 'daily' | 'monthly' | 'yearly' | 'custom'
  interval?: number
  dayOfMonth?: number
  month?: number
  customExpression?: string
  timezoneOffset?: number
}