import { FormEvent, useEffect, useState } from "react";
import { validateFormData } from "@/utility/validateFormData";
import useDateTimeSelection from "./useDateTimeSelection";
import { ActivityDatabase } from "@/models/activityDatabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEventForm } from "@/hooks/useEventForm";
import { format } from "date-fns";

export const useEditForm = (initialData: ActivityDatabase) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const queryClient = useQueryClient();
  const {
    setEventData,
    setErrors,
    errors,
    errorMessage,
    successMessage,
    setErrorMessage,
    setSuccessMessage,
    eventData,
    handleInputChange,
    handleSocialMediaChange,
    handleTagClick,
    createISODateTime,
    timezoneMessage,
  } = useEventForm(initialData as ActivityDatabase);

  const [startTimeDate, setStartTimeDate] = useState<Date | null>(null);
  const [endTimeDate, setEndTimeDate] = useState<Date | null>(null);

  // Initialize date and times from ISO timestamps
  useEffect(() => {
    // Check if we have valid ISO date strings
    if (initialData.startDate && initialData.endDate) {
      try {
        const start = new Date(initialData.startDate);
        const end = new Date(initialData.endDate);
        
        // Set the date from startDate
        setSelectedDate(start);
        
        // Set the time Date objects
        setStartTimeDate(start);
        setEndTimeDate(end);
      } catch (error) {
        console.error("Failed to parse initial dates:", error);
        // Set to null or default if parsing fails
        setSelectedDate(null);
        setStartTimeDate(null);
        setEndTimeDate(null);
      }
    }

  }, [initialData]);

  useEffect(() => {
    setEventData(initialData as ActivityDatabase);
  }, [initialData, setEventData]);

  // Extract hours and minutes for the time selection hook
  const getTimeString = (date: Date | null): string => {
    if (!date) return "10:00"; // Default value if null
    return format(date, 'HH:mm');
  };

  const {
    timeError,
    handleStartTimeChange,
    handleEndTimeChange,
    startTime,
    endTime
  } = useDateTimeSelection(
    getTimeString(startTimeDate),
    getTimeString(endTimeDate)
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let newErrors = validateFormData(eventData);

    // Add timeError if it exists
    if (timeError) {
      newErrors = { ...newErrors, startDate: timeError };
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
    } else {
      editEventMutation(eventData as ActivityDatabase);
    }
  };

  const handleDateChange = (newDate: Date | null)  => {
    setSelectedDate(newDate);
  };

  // Handlers for TimePicker changes, converting Date back to string
  const onStartTimeChange = (date: Date | null) => {
    setStartTimeDate(date);
    const timeStr = date ? format(date, 'HH:mm') : '';
    handleStartTimeChange(timeStr);
  };

  const onEndTimeChange = (date: Date | null) => {
    setEndTimeDate(date);
    const timeStr = date ? format(date, 'HH:mm') : '';
    handleEndTimeChange(timeStr);
  };

  const editEvent = async (activityData: ActivityDatabase) => {
    // retrieving the token from localStorage
    const token = localStorage.getItem('token');

    try {
      // applying necessary transformations for ISO timestamps
      const dataToSend: any = { ...activityData };

      // Remove old fields if they exist (good practice)
      delete dataToSend.eventDate;
      delete dataToSend.eventStartTime;
      delete dataToSend.eventEndTime;

      // Create ISO 8601 timestamps with timezone
      if (!selectedDate || !startTime || !endTime) {
        throw new Error('Date and time are required');
      }

      dataToSend.startDate = createISODateTime(selectedDate, startTime);
      dataToSend.endDate = createISODateTime(selectedDate, endTime);

      // Handle speakers field
      if (typeof dataToSend.eventSpeakers === 'string') {
        dataToSend.eventSpeakers = [dataToSend.eventSpeakers];
      }

      console.log("Event data being sent for update:", dataToSend);

      const apiUrl = process.env.NSC_EVENTS_PUBLIC_API_URL;
      // Use id for the API endpoint
      const eventId = dataToSend.id;
      
      const response = await fetch(`${apiUrl}/events/update/${eventId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Event updated:", data);
        return response.status;
      } else {
        throw new Error(data.message || "Failed to update event.");
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const { mutate: editEventMutation }  = useMutation({
    mutationFn: editEvent,
    onSuccess: async () => {
      await queryClient.refetchQueries({queryKey:['events', 'myEvents', 'archivedEvents']});
      setSuccessMessage("Event successfully updated!");
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    },
    onError: (error: any) => {
      if (error instanceof Error) {
        console.error("Error updating event:", error);
        setErrorMessage(error.message);
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
    }
  });

  // Convert time format to 12hr for display
  const to12HourTime = (time: string): string => {
    if (!time) return '';
    
    // Check if time is in HH:mm format
    if (!time.includes(':')) return ''; 

    const [hour, minute] = time.split(':');
    if (isNaN(parseInt(hour)) || isNaN(parseInt(minute))) return '';

    const hh = parseInt(hour, 10);
    const suffix = hh >= 12 ? 'PM' : 'AM';
    const adjustedHour = hh % 12 || 12;
    const formattedHour = adjustedHour < 10 ? `0${adjustedHour}` : adjustedHour.toString();
    return `${formattedHour}:${minute}${suffix}`;
  };

  return {
    handleDateChange,
    onStartTimeChange,
    onEndTimeChange,
    // to24HourTime is no longer needed
    eventData,
    handleInputChange,
    handleSocialMediaChange,
    handleTagClick,
    handleSubmit,
    errors,
    selectedDate,
    timeError,
    successMessage,
    errorMessage,
    startTimeDate,
    endTimeDate,
    to12HourTime,
    timezoneMessage,
  };
}