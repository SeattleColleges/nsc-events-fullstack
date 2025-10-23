// 🧩Mock EventRegistration entity for testing
// This replaces the real TypeORM entity inside Jest unit tests only.

export class EventRegistration {
    id: string;
    activityId: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    college: string;
    yearOfStudy: string;
    isAttended: boolean;
    createdAt: Date;
    updatedAt: Date;
  
    constructor(partial?: Partial<EventRegistration>) {
      Object.assign(this, partial);
    }
  }