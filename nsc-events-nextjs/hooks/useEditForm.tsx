import { FormEvent, useEffect, useState } from "react";
import { validateFormData } from "@/utility/validateFormData";
import useDateTimeSelection from "./useDateTimeSelection";
import { ActivityDatabase } from "@/models/activityDatabase";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import { useEventForm } from "@/hooks/useEventForm";
import { format, parse } from "date-fns";

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
    // Check if we have the new ISO fields
    if (initialData.startDate && initialData.endDate) {
      const start = new Date(initialData.startDate);
      const end = new Date(initialData.endDate);
      
      // Set the date from startDate
      setSelectedDate(start);
      
      // Set the time Date objects
      setStartTimeDate(start);
      setEndTimeDate(end);
    } 
    // Fallback for legacy data with separate fields
    else if (initialData.eventDate && initialData.eventStartTime && initialData.eventEndTime) {
      // Handle legacy date
      const utcDateString = initialData.eventDate.split("T")[0]; 
      const localDate = new Date(`${utcDateString}T00:00:00`);
      setSelectedDate(localDate);
      
      // Handle legacy times
      const trimmedStart = initialData.eventStartTime.replace(/\s+/g, '');
      const trimmedEnd = initialData.eventEndTime.replace(/\s+/g, '');
      setStartTimeDate(to24HourTime(trimmedStart));
      setEndTimeDate(to24HourTime(trimmedEnd));
    }
  }, [initialData]);

  useEffect(() => {
    setEventData(initialData as ActivityDatabase);
  }, [initialData, setEventData]);

  // Extract hours and minutes for the time selection hook
  const getTimeString = (date: Date | null): string => {
    if (!date) return "10:00";
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
    // timeError is being set in useDateTimeSelection hook if startTime is after endTime
    if (timeError) {
      newErrors = { ...newErrors, eventStartTime: timeError };
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

  const to24HourTime = (time: string) => {
    try {
      return parse(time, 'hh:mma', new Date());
    } catch {
      // Fallback if parsing fails
      return new Date();
    }
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

      // Remove old fields if they exist
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
    
    const [hour, minute] = time.split(':');
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
    to24HourTime,
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