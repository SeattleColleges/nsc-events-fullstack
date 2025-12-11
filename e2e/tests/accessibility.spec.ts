import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  // Run accessibility tests serially to avoid cold-start race conditions
  test.describe.configure({ mode: 'serial' });

  test('should have accessible navigation structure', async ({ page }) => {
    // Increase timeout for cold start
    test.setTimeout(60000);

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for navigation or header to be visible (more reliable than waiting for body)
    const navLocator = page.locator('nav, [role="navigation"], header').first();
    await expect(navLocator).toBeVisible({ timeout: 30000 });

    // Check for navigation element or header with navigation role
    const hasNav = await page.locator('nav, [role="navigation"], header').count();
    expect(hasNav).toBeGreaterThan(0);
  });

  test('should have accessible form inputs on sign-in page', async ({ page }) => {
    await page.goto('/auth/sign-in', { waitUntil: 'networkidle', timeout: 30000 });

    // Check email input has accessible label - wait for it to be visible first
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 15000 });

    // MUI TextField provides accessible labels via aria-labelledby or label association
    const hasLabel = await emailInput.evaluate((el) => {
      const ariaLabel = el.getAttribute('aria-label');
      const ariaLabelledBy = el.getAttribute('aria-labelledby');
      const id = el.getAttribute('id');
      const associatedLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
      return !!(ariaLabel || ariaLabelledBy || associatedLabel);
    });
    expect(hasLabel).toBeTruthy();
  });

  test('should have accessible buttons with text or aria-label', async ({ page }) => {
    await page.goto('/auth/sign-in', { waitUntil: 'networkidle', timeout: 30000 });

    // Find the submit button
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible({ timeout: 15000 });

    // Verify button has accessible name (text content or aria-label)
    const accessibleName = await submitButton.evaluate((el) => {
      const text = el.textContent?.trim();
      const ariaLabel = el.getAttribute('aria-label');
      return text || ariaLabel;
    });
    expect(accessibleName).toBeTruthy();
  });

  test('should have proper document title', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check page has a title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have proper language attribute on html element', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for lang attribute on html element
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('should have no duplicate IDs on sign-in page', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Check for duplicate IDs (accessibility issue)
    const duplicateIds = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      return duplicates;
    });

    // Should have no duplicate IDs
    expect(duplicateIds.length).toBe(0);
  });
});
