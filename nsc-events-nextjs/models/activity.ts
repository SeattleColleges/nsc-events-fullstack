// FormErrors interface
export interface FormErrors {
    eventTitle?: string;
    eventDescription?: string;
    eventCategory?: string;
    startDate?: string;
    endDate?: string;
    eventSchedule?: string;
    eventLocation?: string;
    eventMeetingURL?: string;
    eventCoverPhoto?: string;
    eventDocument?: string;
    eventHost?: string;
    eventRegistration?: string;
    eventCapacity?: string;
    eventTags?: string;
    eventSpeakers?: string;
    eventPrerequisites?: string;
    eventContact?: string;
    eventCancellationPolicy?: string;
    eventSocialMedia?: Partial<SocialMediaLinks>;
    eventPrivacy?: string;
    eventAccessibility?: string;
    eventNote?: string;
  };

// Additional states not directly related to formData might need their own handling.
export interface AdditionalState {
    selectedDate: Date | null;
    startTime: string;
    endTime: string;
    timeError: string | null;
}


interface SocialMediaLinks {
    facebook: string;
    twitter: string;
    instagram: string;
    hashtag: string;
    [key: string]: string; 
}
  

export interface Activity {
    eventCreatorId: string;
    eventTitle: string;
    eventDescription: string;
    eventCategory: string;
    startDate: string; 
    endDate: string;
    eventLocation: string;
    eventMeetingURL: string;
    eventCoverPhoto: string;
    eventDocument: string;
    eventHost: string;
    eventRegistration: string;
    eventCapacity: number;
    eventTags: string[];
    eventSchedule: string;
    eventSpeakers: string[];
    eventPrerequisites: string;
    eventCancellationPolicy: string;
    eventContact: string;
    eventSocialMedia: SocialMediaLinks;
    eventPrivacy: string;
    eventAccessibility: string;
    eventNote: string;
}

export const activity: Activity = {
    eventCreatorId: "",
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
    eventCapacity: 0,
    eventTags: [],
    eventSchedule: "",
    eventSpeakers: [],
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
    eventNote: ""
};
