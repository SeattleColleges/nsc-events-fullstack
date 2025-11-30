import { Activity, FormErrors, activity } from "@/models/activity";
import { ActivityDatabase, activityDatabase } from "@/models/activityDatabase";


export const validateFormData = (data: Activity | ActivityDatabase): FormErrors => {
  let newErrors: FormErrors = {};

  // basic validation rules, extend as needed
  if (!data.eventTitle || !data.eventTitle.trim()) {
    newErrors = { ...newErrors, eventTitle: "Event title is required" };
  }

  if (!data.eventDescription || !data.eventDescription.trim()) {
    newErrors = {
      ...newErrors,
      eventDescription: "Event description is required",
    };
  }
  // we do not need this since startDate and endDate validations are handeled in useEventForm.tsx
  
  if (!data.eventLocation || !data.eventLocation.trim()) {
    newErrors = { ...newErrors, eventLocation: "Event location is required" };
  }
  if (!data.eventHost || !data.eventHost.trim()) {
    newErrors = { ...newErrors, eventHost: "Event host is required" };
  }

  if (!data.eventCapacity && data.eventCapacity !== 0) {
    newErrors = { ...newErrors, eventCapacity: "Event capacity is required" };
  }

  if (!data.eventContact || !data.eventContact.trim()) {
    newErrors = { ...newErrors, eventContact: "Event contact is required" };
  }

  // Overrides previous eventCapacity error check
  if (data.eventCapacity && isNaN(data.eventCapacity) || data.eventCapacity < 1) {
    newErrors = { ...newErrors, eventCapacity: "Event capacity should be a number greater than 0" };
  }

  if (data.eventTags.length < 1) {
    newErrors = { ...newErrors, eventTags: "Please select an event tag" };
  }

  // Tests if email is valid by using regex (only if contact is provided and not just whitespace)
  if (data.eventContact && data.eventContact.trim()) {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!regex.test(data.eventContact)) {
      newErrors = { ...newErrors, eventContact: "Must be a valid email address" };
    }
  }

  // Tests if URL is valid (keep this check for now, may be removed later)
  const urlPattern = /^(http(s)?:\/\/){0,1}(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(?:[/?].*)?$/;
  if (data.eventMeetingURL && !urlPattern.test(data.eventMeetingURL)) {
    newErrors = { ...newErrors, eventMeetingURL: "Event meeting URL needs to be a valid URL" };
  }
  return newErrors;
};