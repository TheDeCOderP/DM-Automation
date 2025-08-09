export interface ScheduleData {
  startDate: Date
  startTime: string
  frequency: 'minutes' | 'daily' | 'monthly' | 'yearly' | 'custom'
  interval?: number
  dayOfMonth?: number
  month?: number
  customExpression?: string
}