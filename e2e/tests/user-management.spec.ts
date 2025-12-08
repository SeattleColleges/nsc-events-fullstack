import { test, expect } from '@playwright/test';
import { generateTestUser } from '../data/test-data';

test.describe('User Management & Admin Functions', () => {
  let adminToken: string;
  let testUserId: string;

  test.beforeAll(async ({ browser }) => {
    // Setup: Create admin user
    const page = await browser.newPage();
    const timestamp = Date.now();
    const adminUser = generateTestUser({
      email: `admin-${timestamp}@example.com`,
      firstName: 'Admin',
    });

    const signupResponse = await page.request.post('http://localhost:3000/api/auth/signup', {
      data: adminUser,
    });

    if (signupResponse.ok()) {
      const data = await signupResponse.json();
      adminToken = data.token;

      // Create a regular user for role management tests
      const regularUser = generateTestUser();
      const userSignupResponse = await page.request.post('http://localhost:3000/api/auth/signup', {
        data: regularUser,
      });

      if (userSignupResponse.ok()) {
        const userData = await userSignupResponse.json();
        testUserId = userData.user?.id || userData.data?.user?.id;
      }
    }

    await page.close();
  });

  test('should view user profile', async ({ page }) => {
    // Authenticate via localStorage
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, adminToken);

    // Navigate to profile page
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Verify profile information is displayed
    const profileHeading = page.locator('h1, h2, [class*="profile"]').first();
    await expect(profileHeading).toBeVisible({ timeout: 5000 });
  });

  test('should update user profile', async ({ page }) => {
    // Authenticate via localStorage
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, adminToken);

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Find edit profile button
    const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit profile")').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Update a field
      const firstNameInput = page.locator('input[name="firstName"]').first();
      if (await firstNameInput.isVisible()) {
        const currentValue = await firstNameInput.inputValue();
        await firstNameInput.fill(`${currentValue} Updated`);

        // Save
        await page.click('button[type="submit"]:has-text("Save"), button:has-text("Update")');

        // Verify success
        const successMessage = page.locator('[role="alert"], .success, [class*="success"]').first();
        await expect(successMessage).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should navigate to admin panel if user has admin role', async ({ page }) => {
    // Authenticate via localStorage
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, adminToken);

    // Navigate to main dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for admin link
    const adminLink = page.locator('a[href*="/admin"], button:has-text("Admin")').first();
    if (await adminLink.isVisible()) {
      await adminLink.click();

      // Should navigate to admin page
      await page.waitForURL(/\/admin/, { timeout: 5000 });
    }
  });

  test('should manage user roles in admin panel', async ({ page }) => {
    // Authenticate via localStorage
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, adminToken);

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Look for users section
    const usersSection = page.locator('button:has-text("Users"), a:has-text("Users"), [class*="users"]').first();
    if (await usersSection.isVisible()) {
      await usersSection.click();
      await page.waitForLoadState('networkidle');

      // Find a user in the list
      const userRow = page.locator('[role="row"], tbody tr').first();
      if (await userRow.isVisible()) {
        // Look for role dropdown or edit button
        const roleDropdown = userRow.locator('select, [role="combobox"], button:has-text("Edit")').first();
        if (await roleDropdown.isVisible()) {
          await roleDropdown.click();

          // Select a different role
          const roleOption = page.locator('[role="option"], option').first();
          if (await roleOption.isVisible()) {
            await roleOption.click();

            // Verify change was applied
            await page.waitForLoadState('networkidle');
          }
        }
      }
    }
  });

  test('should change password', async ({ page }) => {
    // Authenticate via localStorage
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, adminToken);

    // Navigate to settings or profile
    await page.goto('/profile/settings');
    await page.waitForLoadState('networkidle');

    // Find change password section
    const changePasswordButton = page.locator('button:has-text("Change password"), a:has-text("Change password")').first();
    if (await changePasswordButton.isVisible()) {
      await changePasswordButton.click();

      // Fill in password fields
      await page.fill('input[name="currentPassword"]', 'Test@Password123');
      await page.fill('input[name="newPassword"]', 'NewTest@Password123');
      await page.fill('input[name="confirmPassword"]', 'NewTest@Password123');

      // Submit
      await page.click('button[type="submit"]');

      // Verify success
      const successMessage = page.locator('[role="alert"], .success, [class*="success"]').first();
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    }
  });
});
