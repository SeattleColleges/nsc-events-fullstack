export const generateTestUser = (overrides = {}) => {
  const timestamp = Date.now();
  return {
    email: `test-user-${timestamp}@example.com`,
    password: 'Test@Password123',
    firstName: 'Test',
    lastName: 'User',
    pronouns: 'theythem',
    role: 'user',
    ...overrides,
  };
};

export const generateEventData = (overrides = {}) => {
  const timestamp = Date.now();
  return {
    title: `Test Event ${timestamp}`,
    description: 'This is a test event for E2E testing',
    startDate: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 172800000).toISOString(),
    location: 'Test Location',
    capacity: 100,
    isPublic: true,
    ...overrides,
  };
};

export const testCredentials = {
  admin: {
    email: 'admin@example.com',
    password: 'Admin@Password123',
  },
  user: {
    email: 'user@example.com',
    password: 'User@Password123',
  },
};
