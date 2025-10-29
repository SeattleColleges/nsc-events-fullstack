import { ChangeEventHandler, FormEvent, useEffect, useState } from "react";
import { validateFormData } from "@/utility/validateFormData";
import { Activity, FormErrors } from "@/models/activity";
import useDateTimeSelection from "./useDateTimeSelection";
import { ActivityDatabase } from "@/models/activityDatabase";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from 'next/navigation';

export const useEventForm = (initialData: Activity | ActivityDatabase) => {
  const router = useRouter();
  const [eventData, setEventData] = useState<Activity | ActivityDatabase>(initialData);
  const [errors, setErrors] = useState<FormErrors>({
    eventTitle: "",
    eventDescription: "",
    eventCategory: "",
    startDate: "",
    endDate: "",
    eventLocation: "",
    eventMeetingURL: "",
    eventCoverPhoto: "",
    eventDocument: "",
    eventHost: "",
    eventRegistration: "",
    eventTags: "",
    eventSchedule: "",
    eventSpeakers: "",
    eventPrerequisites: "",
    eventCancellationPolicy: "",
    eventContact: "",
    eventSocialMedia: {
      facebook: "",
      twitter: "",
      instagram: "",
      hashtag: ""
    },
    eventPrivacy: "",
    eventAccessibility: "",
    eventCapacity: ""
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [fixingErrors, setFixingErrors] = useState(false);
  // success/error messages for event creation
  const [successMessage, setSuccessMessage] = useState<String>("");
  const [errorMessage, setErrorMessage] = useState<String>("");
  const queryClient = useQueryClient()
  // Use useDateTimeSelection hook
  const {
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    timeError,
    handleStartTimeChange,
    handleEndTimeChange,
  } = useDateTimeSelection("10:00", "11:00");

  // Timezone display message
  const timezoneMessage = "All event times are recorded and displayed in the local time zone: (GMT-07:00) Pacific Time - Los Angeles";

  useEffect(() => {
    if (fixingErrors) {
      const newErrors = validateFormData(eventData);
      setErrors(newErrors);
    }
  }, [eventData]);

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = ({
    target,
  }) => {
    const { name, value } = target;
    setEventData((prevEventData) => ({
      ...prevEventData,
      [name]: value,
    }));
  };

  // handling changes to the social media fields
  const handleSocialMediaChange = (key: keyof Activity['eventSocialMedia'], value: string) => {
    setEventData((prev) => ({
      ...prev,
      eventSocialMedia: {
        ...prev.eventSocialMedia,
        // update the correct social media field
        [key]: value,
      },
    }));
  };

  const handleTagClick = (tag: string) => {
    setEventData((prevEventData) => {
      if (prevEventData.eventTags.includes(tag)) {
        // If the tag is already selected, remove it from the array
        return {
          ...prevEventData,
          eventTags: prevEventData.eventTags.filter((t) => t !== tag),
        };
      } else {
        // If the tag is not selected, add it to the array
        return {
          ...prevEventData,
          eventTags: [...prevEventData.eventTags, tag],
        };
      }
    });
  };

  // converting time format to 24hr
  const to24HourTime = (time: string): string => {
    // returning an empty string if no time given
    if (!time) {
      return '';
    }

    const [hour, minute] = time.split(':');
    const hh = parseInt(hour, 10);
    return `${hh.toString().padStart(2, '0')}:${minute}:00`;
  }

  // Function to combine date and time into ISO 8601 format with timezone
  const createISODateTime = (date: Date | null, time: string): string => {
    if (!date || !time) {
      throw new Error('Date and time are required');
    }

    // Convert time to 24-hour format
    const time24 = to24HourTime(time);
    const [hours, minutes] = time24.split(':');
    
    // Create a new date object with the selected date
    const dateTime = new Date(date);
    dateTime.setHours(parseInt(hours, 10));
    dateTime.setMinutes(parseInt(minutes, 10));
    dateTime.setSeconds(0);
    dateTime.setMilliseconds(0);

    // Get the timezone offset in minutes and convert to ±HH:MM format
    const offset = dateTime.getTimezoneOffset();
    const absOffset = Math.abs(offset);
    const offsetHours = Math.floor(absOffset / 60);
    const offsetMinutes = absOffset % 60;
    const offsetSign = offset <= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;

    // Format as ISO 8601 with timezone
    const year = dateTime.getFullYear();
    const month = (dateTime.getMonth() + 1).toString().padStart(2, '0');
    const day = dateTime.getDate().toString().padStart(2, '0');
    const hoursStr = dateTime.getHours().toString().padStart(2, '0');
    const minutesStr = dateTime.getMinutes().toString().padStart(2, '0');
    const secondsStr = dateTime.getSeconds().toString().padStart(2, '0');

    return `${year}-${month}-${day}T${hoursStr}:${minutesStr}:${secondsStr}${offsetString}`;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Event Data: ", eventData);
    const newErrors = validateFormData(eventData);
    const numNewErrors = Object.keys(newErrors).length;
    setFixingErrors(numNewErrors > 0);
    if (numNewErrors > 0) {
      setErrors(newErrors);
    } else {
      createActivity(eventData as Activity);
    }
  };

  const createActivity = async (activityData: Activity) => {
    // retrieving the token from localStorage
    const token = localStorage.getItem('token');

    try {
      // applying necessary transformations for date, time, and speaker fields
      const dataToSend: any = { ...activityData };

      // Remove the old date/time fields from the data
      delete dataToSend.eventDate;
      delete dataToSend.eventStartTime;
      delete dataToSend.eventEndTime;

      // If fields are empty set them to empty strings
      if (!dataToSend.eventMeetingURL?.trim()) {
        dataToSend.eventMeetingURL = "";
      }
      if (!dataToSend.eventCoverPhoto?.trim()) {
        dataToSend.eventCoverPhoto = "";
      }
      if (!dataToSend.eventDocument?.trim()) {
        dataToSend.eventDocument = "";
      }
      
      // Create ISO 8601 timestamps with timezone
      if (!selectedDate || !startTime || !endTime) {
        throw new Error('Date and time are required');
      }

      dataToSend.startDate = createISODateTime(selectedDate, startTime);
      dataToSend.endDate = createISODateTime(selectedDate, endTime);

      if (typeof dataToSend.eventSpeakers === 'string') {
        dataToSend.eventSpeakers = [dataToSend.eventSpeakers];
      }

      console.log("Event data after applying transformation: ", dataToSend);

      const apiUrl = process.env.NSC_EVENTS_PUBLIC_API_URL;
      const response = await fetch(`${apiUrl}/events/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Activity created:", data);
        await queryClient.refetchQueries({ queryKey: ['events', 'myEvents', 'archivedEvents'] });
        setSuccessMessage(data.message || "Event successfully created!");
        setErrorMessage("");

        // Import the utility for handling IDs
        const { normalizeActivityId } = await import('../utility/dbFieldMapper');

        // Normalize the response data
        const normalizedData = normalizeActivityId(data);

        setTimeout(() => {
          // Get the ID from the normalized data
          let activityId;

          if (normalizedData.id) {
            activityId = normalizedData.id;
          } else if (normalizedData.activity && normalizedData.activity.id) {
            activityId = normalizedData.activity.id;
          }

          if (activityId) {
            router.push(`/event-detail?id=${activityId}`);
          } else {
            // If no ID is available, just go to the main page
            router.push('/');
            console.error("Activity ID not found in response:", normalizedData);
          }
        }, 1200);
      } else {
        console.log("Failed to create activity:", response.status);
        throw new Error(data.message || "Failed to create the event.");
      }
    } catch (error) {
      // type guard to check if error is an instance of Error
      if (error instanceof Error) {
        console.error("Error creating activity:", error);
        setErrorMessage(error.message);
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
    }
  };

  return {
    setEventData,
    setErrors,
    to24HourTime,
    eventData, 
    handleInputChange, 
    handleSocialMediaChange,
    handleTagClick,
    handleSubmit,
    errors,
    selectedDate,
    setSelectedDate,
    startTime,
    setStartTime,
    handleStartTimeChange,
    endTime,
    setEndTime,
    handleEndTimeChange,
    timeError,
    successMessage,
    errorMessage,
    setErrorMessage,
    setSuccessMessage,
    timezoneMessage,
    createISODateTime
  };
}