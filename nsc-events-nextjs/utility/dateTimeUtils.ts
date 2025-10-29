// Utility functions for handling the transition from separate date/time fields to ISO timestamps

/**
 * Convert ISO timestamp to separate date and time strings for display
 * @param isoString - ISO 8601 timestamp string
 * @returns Object with formatted date and time strings
 */
export const parseISOToDateTime = (isoString: string | Date) => {
    const date = new Date(isoString);
    
    // Format date as YYYY-MM-DD
    const formattedDate = date.toISOString().split('T')[0];
    
    // Format time as HH:MM AM/PM
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    const formattedTime = `${displayHours}:${displayMinutes}${ampm}`;
    
    // Also return 24-hour format for input fields
    const time24 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    return {
      date: formattedDate,
      time12: formattedTime,
      time24: time24,
      fullDate: date,
    };
  };
  
  /**
   * Convert legacy separate date/time fields to ISO timestamps
   * This is for backward compatibility with existing data
   * @param eventDate - Date string or Date object
   * @param eventStartTime - Time string in 12-hour format (e.g., "10:00AM")
   * @param eventEndTime - Time string in 12-hour format (e.g., "11:00AM")
   * @returns Object with startDate and endDate as ISO strings
   */
  export const convertLegacyToISO = (
    eventDate: string | Date,
    eventStartTime: string,
    eventEndTime: string
  ) => {
    const date = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
    
    // Helper to parse 12-hour time
    const parseTime = (timeStr: string) => {
      const cleanTime = timeStr.replace(/\s/g, '');
      const isPM = cleanTime.toLowerCase().includes('pm');
      const isAM = cleanTime.toLowerCase().includes('am');
      
      let [hours, minutes] = cleanTime.replace(/[APap][Mm]/g, '').split(':').map(Number);
      
      if (isPM && hours !== 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
      
      return { hours, minutes };
    };
    
    // Create start date
    const startTime = parseTime(eventStartTime);
    const startDate = new Date(date);
    startDate.setHours(startTime.hours, startTime.minutes, 0, 0);
    
    // Create end date
    const endTime = parseTime(eventEndTime);
    const endDate = new Date(date);
    endDate.setHours(endTime.hours, endTime.minutes, 0, 0);
    
    // Handle case where end time might be next day (e.g., 11PM to 1AM)
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };
  
  /**
   * Map activity data from API response to frontend format
   * Handles both old and new field names
   */
  export const mapActivityData = (activity: any) => {
    // If activity already has startDate/endDate, parse them for display
    if (activity.startDate && activity.endDate) {
      const start = parseISOToDateTime(activity.startDate);
      const end = parseISOToDateTime(activity.endDate);
      
      return {
        ...activity,
        // Keep the ISO fields
        startDate: activity.startDate,
        endDate: activity.endDate,
        // Add display-friendly fields for backward compatibility
        eventDate: start.date,
        eventStartTime: start.time12,
        eventEndTime: end.time12,
      };
    }
    
    // If activity has old fields, convert them
    if (activity.eventDate && activity.eventStartTime && activity.eventEndTime) {
      const converted = convertLegacyToISO(
        activity.eventDate,
        activity.eventStartTime,
        activity.eventEndTime
      );
      
      return {
        ...activity,
        ...converted,
      };
    }
    
    return activity;
  };
  
  /**
   * Format duration between two ISO timestamps
   * @param startDate - ISO string or Date
   * @param endDate - ISO string or Date
   * @returns Formatted duration string (e.g., "2 hours 30 minutes")
   */
  export const formatDuration = (startDate: string | Date, endDate: string | Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };
  
  /**
   * Get timezone display string for user
   * @returns Timezone string with offset
   */
  export const getTimezoneDisplay = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset / 60);
    const minutes = absOffset % 60;
    const sign = offset <= 0 ? '+' : '-';
    
    const offsetStr = `GMT${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Try to get timezone name (may not work in all browsers)
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return `${offsetStr} ${timeZone}`;
    } catch {
      return offsetStr;
    }
  };