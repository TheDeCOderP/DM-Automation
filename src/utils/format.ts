export const formatTime = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "now"
    if (diffInHours < 24) return `${diffInHours}h`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`
    return `${Math.floor(diffInHours / 168)}w`
}

export const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
}

/**
 * Format date to "dd mon year" format (e.g., "16 Feb 2026")
 * @param date - Date object, string, or timestamp
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string | number): string => {
    const d = new Date(date)
    const day = d.getDate().toString().padStart(2, '0')
    const month = d.toLocaleString('en-US', { month: 'short' })
    const year = d.getFullYear()
    return `${day} ${month} ${year}`
}

/**
 * Format date and time to "dd mon year, HH:MM" format (e.g., "16 Feb 2026, 14:30")
 * @param date - Date object, string, or timestamp
 * @returns Formatted date and time string
 */
export const formatDateTime = (date: Date | string | number): string => {
    const d = new Date(date)
    const dateStr = formatDate(d)
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    return `${dateStr}, ${hours}:${minutes}`
}