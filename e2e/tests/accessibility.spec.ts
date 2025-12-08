import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have accessible navigation structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the page content to be visible
    await page.waitForSelector('body', { state: 'visible' });
    await page.waitForTimeout(1000); // Allow React hydration

    // Check for navigation element or header with navigation role
    const hasNav = await page.locator('nav, [role="navigation"], header').count();
    expect(hasNav).toBeGreaterThan(0);
  });

  test('should have accessible form inputs on sign-in page', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await page.waitForLoadState('domcontentloaded');

    // Wait for form to render
    await page.waitForSelector('form, [role="form"]', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Check email input has accessible label
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });

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
    await page.goto('/auth/sign-in');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Find the submit button
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible({ timeout: 5000 });

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
