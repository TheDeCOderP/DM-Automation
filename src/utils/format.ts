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

/**
 * Format date and time with timezone info
 * @param date - Date object, string, or timestamp
 * @returns Formatted date and time string with timezone
 */
export const formatDateTimeWithTimezone = (date: Date | string | number): string => {
    const d = new Date(date)
    const dateStr = formatDate(d)
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    
    // Get timezone abbreviation
    const timezone = new Intl.DateTimeFormat('en-US', { 
        timeZoneName: 'short' 
    }).formatToParts(d).find(part => part.type === 'timeZoneName')?.value || '';
    
    return `${dateStr}, ${hours}:${minutes} ${timezone}`
}

/**
 * Format date and time for UK and India timezones
 * @param date - Date object, string, or timestamp
 * @returns Object with UK and India formatted times
 */
export const formatDateTimeUKIndia = (date: Date | string | number): { uk: string; india: string } => {
    const d = new Date(date)
    
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
    
    return {
        uk: ukFormatter.format(d),
        india: indiaFormatter.format(d)
    };
}

/**
 * Convert ISO date string to datetime-local input format (local timezone)
 * @param isoString - ISO date string from database
 * @returns Formatted string for datetime-local input (YYYY-MM-DDTHH:mm)
 */
export const toDateTimeLocalString = (isoString: string | null | undefined): string => {
    if (!isoString) return '';
    
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}