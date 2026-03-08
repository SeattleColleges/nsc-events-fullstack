import { test as base, expect } from '@playwright/test';
import { ApiClient } from '../utils/api-client';

const ADMIN_API_URL =
  process.env.PLAYWRIGHT_API_URL || "http://localhost:3000/api";
const ADMIN_CREDENTIALS = {
  email: "admin@nsc.dev",
  password: "admin@admin123",
};

/** Returns an ApiClient authenticated as the seed admin. Best-effort — returns null if login fails. */
async function getAdminClient(): Promise<ApiClient | null> {
  try {
    const adminClient = new ApiClient(ADMIN_API_URL);
    const res = await adminClient.login(
      ADMIN_CREDENTIALS.email,
      ADMIN_CREDENTIALS.password,
    );
    const token = res.data?.token || res.data?.data?.token;
    if (!token) return null;
    adminClient.setToken(token);
    return adminClient;
  } catch {
    return null;
  }
}

type AuthFixtures = {
  authenticatedPage: {
    page: any;
    apiClient: ApiClient;
    user: any;
  };
  unauthenticatedPage: {
    page: any;
    apiClient: ApiClient;
  };
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const apiClient = new ApiClient();

    // Create a test user
    const timestamp = Date.now();
    const testUser = {
      email: `test-${timestamp}@example.com`,
      password: 'Test@Password123',
      firstName: 'Test',
      lastName: 'User',
    };

    try {
      // Sign up the test user
      const signupResponse = await apiClient.signup(
        testUser.email,
        testUser.password,
        testUser.firstName,
        testUser.lastName,
      );

      // Login to get token
      const loginResponse = await apiClient.login(
        testUser.email,
        testUser.password,
      );
      const token = loginResponse.data.access_token;

      apiClient.setToken(token);

      // Set authentication context in page
      await page.context().addCookies([
        {
          name: "next-auth.session-token",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ]);

      // Store token in localStorage
      await page.goto("/");
      await page.evaluate(
        ({ tokenValue }) => {
          if (tokenValue) {
            localStorage.setItem("authToken", tokenValue);
          }
        },
        { tokenValue: token },
      );

      const user = signupResponse.data.user || loginResponse.data.user;

      await use({
        page,
        apiClient,
        user,
      });

      // ── Cleanup: delete the test user via admin account ──────────────────
      try {
        const adminClient = await getAdminClient();
        if (adminClient) {
          // Resolve user ID (may come from signup or login response)
          let userId: string | undefined = user?.id;
          if (!userId) {
            const found = await adminClient.getUserByEmail(testUser.email);
            userId = found.data?.id || found.data?.data?.id;
          }
          if (userId) {
            await adminClient.deleteUser(userId);
          }
        }
      } catch {
        // Best-effort — global teardown will sweep any stragglers
      }
    } catch (error) {
      console.error('Failed to set up authenticated user:', error);
      throw error;
    }
  },

  unauthenticatedPage: async ({ page }, use) => {
    const apiClient = new ApiClient();
    await use({
      page,
      apiClient,
    });
  },
});

export { expect };
