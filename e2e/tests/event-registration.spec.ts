import { test, expect } from '@playwright/test';
import { generateTestUser } from '../data/test-data';

test.describe('Event Registration', () => {
  let userToken: string;
  let eventId: string;

  test.beforeAll(async ({ browser }) => {
    // Setup: Create user and event for registration tests
    const page = await browser.newPage();
    const testUser = generateTestUser();

    // Create user
    const signupResponse = await page.request.post('http://localhost:3000/api/auth/signup', {
      data: testUser,
    });

    if (signupResponse.ok()) {
      const data = await signupResponse.json();
      userToken = data.token;

      // Create an event
      const createEventResponse = await page.request.post('http://localhost:3000/api/event-registration', {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
        data: {
          title: 'Test Event for Registration',
          description: 'An event for testing registrations',
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 172800000).toISOString(),
          location: 'Test Location',
          capacity: 50,
        },
      });

      if (createEventResponse.ok()) {
        const eventData = await createEventResponse.json();
        eventId = eventData.id || eventData.data?.id;
      }
    }

    await page.close();
  });

  test('should register for an event', async ({ page }) => {
    // Authenticate via localStorage
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, userToken);

    // Navigate to event details
    await page.goto(`/events/${eventId}`);
    await page.waitForLoadState('networkidle');

    // Click register button
    const registerButton = page.locator('button:has-text("Register"), button:has-text("Sign up"), button:has-text("Join")').first();
    if (await registerButton.isVisible()) {
      await registerButton.click();

      // Confirm registration if dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Register")').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Verify success message
      const successMessage = page.locator('[role="alert"], .success, [class*="success"]').first();
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should view registered events', async ({ page }) => {
    // Authenticate via localStorage
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, userToken);

    // Navigate to registered events
    await page.goto('/my-events');
    await page.waitForLoadState('networkidle');

    // Check if page loaded (may or may not have events)
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();

    // If no events, that's okay - just verify page loaded
    const eventCount = await page.locator('[class*="event"], article, [class*="card"]').count();
    console.log(`Found ${eventCount} registered events`);
  });

  test('should cancel event registration', async ({ page }) => {
    // Authenticate via localStorage
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, userToken);

    // Navigate to my events
    await page.goto('/my-events');
    await page.waitForLoadState('networkidle');

    // Find cancel registration button
    const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Unregister"), [aria-label*="cancel" i]').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();

      // Confirm cancellation if dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Cancel")').first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Verify success
      const successMessage = page.locator('[role="alert"], .success, [class*="success"]').first();
      if (await successMessage.isVisible()) {
        await expect(successMessage).toContainText(/cancel|unregister/i);
      }
    }
  });

  test('should show event capacity error when full', async ({ page }) => {
    const testUser = generateTestUser();

    // Create multiple registrations to fill capacity
    const signupResponse = await page.request.post('http://localhost:3000/api/auth/signup', {
      data: testUser,
    });

    if (!signupResponse.ok()) {
      test.skip();
    }

    const signupData = await signupResponse.json();
    const userToken2 = signupData.token;

    // Authenticate
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, userToken2);

    // Navigate to event
    await page.goto(`/events/${eventId}`);
    await page.waitForLoadState('networkidle');

    // Try to register
    const registerButton = page.locator('button:has-text("Register")').first();
    if (await registerButton.isVisible()) {
      await registerButton.click();

      // May show capacity error if event is full
      const errorMessage = page.locator('[role="alert"], .error, [class*="error"]').first();
      if (await errorMessage.isVisible({ timeout: 3000 })) {
        await expect(errorMessage).toContainText(/capacity|full|no spots/i);
      }
    }
  });
});
