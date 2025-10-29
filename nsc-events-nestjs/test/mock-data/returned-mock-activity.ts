const mockActivityFromDB = {
  id: '64f4fb4f18500161673ba4ac', // Updated from _id to id for PostgreSQL compatibility
  eventCreatorId: '11f4fb4f18500161673ba4ac',
  eventTitle: 'Sample Event',
  eventDescription: 'This is a sample event description.',
  // eventCategory: 'Tech', // no longer needed
  startDate: '2025-08-15T10:00:00-07:00', // Timezone-aware timestamp string
  endDate: '2025-08-15T16:00:00-07:00',
  eventLocation: '123 Main Street, City',
  eventMeetingURL: 'https://zoom.us/sample-url',
  eventCoverPhoto: 'https://example.com/event-cover.jpg',
  eventDocument: 'https://example.com/event-document.pdf',
  eventHost: 'Sample Organization',
  eventRegistration: 'Register at https://example.com/registration',
  eventCapacity: '100',
  eventTags: ['Tech', 'Conference', 'Networking'],
  eventSchedule:
    '10:00 AM - Registration\n11:00 AM - Keynote\n12:00 PM - Lunch\n2:00 PM - Workshops\n4:00 PM - Closing Remarks',
  eventSpeakers: ['John Doe', 'Jane Smith'],
  eventPrerequisites: 'None',
  eventCancellationPolicy:
    'Full refund if canceled at least 7 days before the event.',
  eventContact: 'contact@example.com',
  eventSocialMedia: {
    facebook: 'https://www.facebook.com/sampleevent',
    twitter: 'https://twitter.com/sampleevent',
    instagram: 'https://www.instagram.com/sampleevent',
    hashtag: '#SampleEvent2023',
    linkedin: 'https://www.linkedin/in/sampleProfile',
  },
  eventPrivacy: 'Public',
  eventAccessibility: 'Wheelchair accessible venue.',
  eventNote: 'This is a sample note.',
  createdAt: '2023-09-03T21:31:59.362Z',
  updatedAt: '2023-09-03T21:31:59.362Z',
  // REMOVED: __v: 0, (MongoDB field, not applicable for PostgreSQL)
};

export default mockActivityFromDB;
