export const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // PST is 8 hours behind Coordinated Universal Time (UTC).
    // Therefore, we set hours to 16 since setUTCHours takes
    // absolute hours values from 0-23.
    date.setUTCHours(16, 0, 0, 0);
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Los_Angeles',
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    };
    return date.toLocaleString('en-US', options);
}

export const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    
    // Define options for time only, including the time zone format
    const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true, // Use 12-hour clock (AM/PM)
        timeZone: 'America/Los_Angeles', 
    };

    return date.toLocaleTimeString('en-US', options);
}

/**
 * Format time with timezone abbreviation (e.g., "5:00 PM PDT")
 * @param dateString - ISO 8601 timestamp string
 * @returns Formatted time string with timezone
 */
export const formatTimeWithTimezone = (dateString: string) => {
    const date = new Date(dateString);
    
    // Get the time in 12-hour format
    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles',
    };
    
    const time = date.toLocaleTimeString('en-US', timeOptions);
    
    // Get the timezone abbreviation (PST/PDT)
    const timezoneOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Los_Angeles',
        timeZoneName: 'short',
    };
    
    const fullString = date.toLocaleString('en-US', timezoneOptions);
    const timezone = fullString.split(' ').pop(); // Extract timezone abbreviation
    
    return `${time} ${timezone}`;
}

/**
 * Format date in a more readable format (e.g., "October 27, 2025")
 * @param dateString - ISO 8601 timestamp string
 * @returns Formatted date string
 */
export const formatDateLong = (dateString: string) => {
    const date = new Date(dateString);
    
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Los_Angeles',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    };
    
    return date.toLocaleString('en-US', options);
}

/**
 * Format full date and time (e.g., "October 27, 2025 at 5:00 PM PDT")
 * @param dateString - ISO 8601 timestamp string
 * @returns Formatted date and time string
 */
export const formatDateTime = (dateString: string) => {
    return `${formatDateLong(dateString)} at ${formatTimeWithTimezone(dateString)}`;
}