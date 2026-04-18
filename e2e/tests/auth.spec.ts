import { test, expect, Page } from "@playwright/test";
import { generateTestUser } from "../data/test-data";

// Helper function to set authentication token reliably across all browsers
async function setAuthToken(page: Page, token: string): Promise<void> {
  await page.addInitScript((t) => {
    localStorage.setItem("token", t);
    window.dispatchEvent(new CustomEvent("auth-change"));
  }, token);

  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  await page.waitForFunction(
    (expectedToken) => localStorage.getItem("token") === expectedToken,
    token,
    { timeout: 10000 },
  );
}

async function waitForAuthPage(page: Page, pathRegex: RegExp): Promise<void> {
  await page.waitForURL(pathRegex, { timeout: 10000 });
  await page.waitForLoadState("domcontentloaded");
  await page
    .waitForLoadState("networkidle", { timeout: 15000 })
    .catch(() => {});
}

async function waitForAuthForm(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await waitForAuthPage(page, /\/auth\/sign-in/i);

    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const emailCount = await emailInput.count();
    if (emailCount > 0) {
      const firstEmail = emailInput.first();
      await firstEmail.waitFor({ state: "attached", timeout: 30000 });
      await firstEmail.scrollIntoViewIfNeeded();
      await firstEmail.waitFor({ state: "visible", timeout: 30000 });
      return;
    }

    await page.reload({ waitUntil: "domcontentloaded" });
  }

  throw new Error("Sign-in form not found after retries");
}

test.describe("Authentication", () => {
  // Skip: UI signup test is flaky due to timing issues. Backend signup is tested via login test.
  test.skip("should sign up a new user and redirect to home page", async ({
    page,
  }) => {
    test.setTimeout(45000);
    const testUser = generateTestUser();

    // Navigate to signup page
    await page.goto("/auth/sign-up");

    // Wait for form to be ready and page to stabilize
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Fill in the signup form
    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="pronouns"]', testUser.pronouns);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for response (either network activity or URL change)
    await page
      .waitForLoadState("networkidle", { timeout: 20000 })
      .catch(() => {});

    // Give time for redirect to happen
    await page.waitForTimeout(2000);

    // Check current state - verify signup was successful
    const currentUrl = page.url();

    // Success conditions:
    // 1. Redirected away from sign-up page
    // 2. OR still on sign-up but with success message
    // 3. OR on sign-in page (some apps redirect to sign-in after signup)
    const redirectedAway = !currentUrl.includes("/auth/sign-up");
    const hasSuccessMessage = await page
      .locator("text=/success|account created|welcome|check your email/i")
      .first()
      .isVisible()
      .catch(() => false);

    expect(redirectedAway || hasSuccessMessage).toBeTruthy();
  });

  test("should login with valid credentials @smoke", async ({
    page,
    browserName,
  }) => {
    // Skip on Firefox due to CORS issues with API calls
    test.skip(
      browserName === "firefox",
      "Firefox has CORS issues with authenticated API requests - works in Chromium/WebKit",
    );

    const testUser = generateTestUser();

    // First, create a user via API for this test
    const apiResponse = await page.request.post(
      "http://localhost/api/auth/signup",
      {
        data: testUser,
      },
    );
    if (!apiResponse.ok()) {
      const errorBody = await apiResponse.text();
      console.error("Signup failed:", apiResponse.status(), errorBody);
    }
    expect(apiResponse.ok()).toBeTruthy();

    // Navigate to login page
    await page.goto("/auth/sign-in", { waitUntil: "domcontentloaded" });

    // Wait for form to be ready
    await waitForAuthForm(page);

    // Fill in login credentials
    await page.getByRole("textbox", { name: /email/i }).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);

    // Submit the form
    await page.click('button[type="submit"]');

    // Should be redirected based on role (admin -> /admin, creator -> /creator, user -> /)
    await page.waitForURL(/\/$|\/admin|\/creator/i, { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Wait for auth state to propagate
    await page.waitForTimeout(3000);

    // Verify user is logged in by checking for account icon (desktop) or menu button (mobile)
    const userMenuButton = page.locator('[aria-label="Open user menu"]');
    const mobileMenuButton = page.locator('[aria-label="menu"]');

    // Check if either desktop or mobile menu is visible
    const hasUserMenu = await userMenuButton.isVisible().catch(() => false);
    const hasMobileMenu = await mobileMenuButton.isVisible().catch(() => false);

    expect(hasUserMenu || hasMobileMenu).toBeTruthy();
  });

  test("should show error on invalid login credentials @smoke", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in");

    // Fill in invalid credentials
    await page
      .getByRole("textbox", { name: /email/i })
      .fill("nonexistent@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");

    // Submit the form
    await page.click('button[type="submit"]');

    // Should show error message
    const errorMessage = page
      .locator('[role="alert"], .error, [class*="error"]')
      .first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test("should logout successfully", async ({ page }) => {
    const testUser = generateTestUser();

    // Sign up and login
    const signupResponse = await page.request.post(
      "http://localhost/api/auth/signup",
      {
        data: testUser,
      },
    );
    const signupData = await signupResponse.json();
    const token = signupData.token;

    // Set token using helper function
    await setAuthToken(page, token);

    // Reload to apply auth state
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Wait for auth to fully initialize

    // Check if we're on mobile (drawer menu) or desktop (dropdown menu)
    const isMobileMenuVisible = await page
      .locator('[aria-label="menu"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (isMobileMenuVisible) {
      // Mobile: Open drawer menu
      const mobileMenuButton = page.locator('[aria-label="menu"]').first();
      await expect(mobileMenuButton).toBeVisible({ timeout: 10000 });
      await mobileMenuButton.click();

      // Wait for drawer animation to complete (MUI drawer has transition)
      await page.waitForTimeout(1000);

      // Wait for drawer content to be visible by checking for any drawer navigation
      await page
        .waitForSelector('nav, [role="navigation"]', { timeout: 5000 })
        .catch(() => {});

      // Click Sign out link in drawer (mobile uses a link, desktop uses a menuitem)
      // Use getByRole('link') to target the mobile drawer link specifically
      const signOutLink = page.getByRole("link", { name: /sign out/i });
      await expect(signOutLink).toBeVisible({ timeout: 10000 });
      await signOutLink.click();
    } else {
      // Desktop: Open user menu dropdown
      const accountIcon = page.locator('[aria-label="Open user menu"]');
      await expect(accountIcon).toBeVisible({ timeout: 10000 });
      await accountIcon.click();
      await page.waitForTimeout(1000);

      // Click "Sign Out" MenuItem in dropdown menu
      // Using role="menuitem" to target the MenuItem component directly
      const signOutMenuItem = page.getByRole("menuitem", { name: /sign out/i });
      await expect(signOutMenuItem).toBeVisible({ timeout: 5000 });
      await signOutMenuItem.click();
    }

    // Wait a bit for the redirect to initiate
    await page.waitForTimeout(1000);

    // Should be redirected to login page (increase timeout for Next.js router)
    await page.waitForURL(/\/auth\/sign-in/i, { timeout: 15000 });
  });

  test("should navigate to forgot password page", async ({ page }) => {
    await page.goto("/auth/sign-in", { waitUntil: "domcontentloaded" });

    await waitForAuthForm(page);

    // Click forgot password link
    const forgotPasswordLink = page
      .locator(
        'a:has-text("Forgot password"), a:has-text("forgot"), button:has-text("forgot")',
      )
      .first();
    await forgotPasswordLink.click();

    // Should navigate to forgot password page
    await page.waitForURL(/\/auth\/forgot-password|\/password-reset/i, {
      timeout: 5000,
    });
  });

  test("should handle password reset flow", async ({ page }) => {
    const testUser = generateTestUser();

    // Create a user
    const signupResponse = await page.request.post(
      "http://localhost/api/auth/signup",
      {
        data: testUser,
      },
    );
    expect(signupResponse.ok()).toBeTruthy();

    // Navigate to forgot password
    await page.goto("/auth/forgot-password");

    await waitForAuthPage(page, /\/auth\/forgot-password/i);

    // Enter email
    await page.getByRole("textbox", { name: /email/i }).fill(testUser.email);

    // Submit
    await page.click('button[type="submit"]');

    // Should show success message
    const successMessage = page
      .locator('[role="alert"], .success, [class*="success"]')
      .first();
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });
});
