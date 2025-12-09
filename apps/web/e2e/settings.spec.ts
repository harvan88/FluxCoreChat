/**
 * FC-503: E2E Tests - Settings
 * Tests para configuración
 */

import { test, expect } from '@playwright/test';

// Helper para autenticarse
async function authenticate(page: import('@playwright/test').Page) {
  await page.goto('/');
  
  await page.getByRole('link', { name: /crear cuenta|registrarse/i }).click();
  
  const uniqueEmail = `settings-test-${Date.now()}@example.com`;
  await page.getByPlaceholder(/nombre/i).fill('Settings Test User');
  await page.getByPlaceholder(/correo/i).fill(uniqueEmail);
  await page.getByPlaceholder(/contraseña/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /crear cuenta|registrar/i }).click();

  await expect(page.locator('[data-testid="main-layout"]').or(page.getByText(/fluxcore/i))).toBeVisible({ timeout: 10000 });
}

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('should open settings panel', async ({ page }) => {
    // Click en settings
    const settingsButton = page.locator('[data-activity="settings"]').or(
      page.getByRole('button', { name: /configuración|settings|ajustes/i })
    );
    
    await settingsButton.click();

    // Verificar que el panel de settings está visible
    await expect(page.getByText(/configuración|settings|preferencias/i)).toBeVisible();
  });

  test('should have theme options', async ({ page }) => {
    const settingsButton = page.locator('[data-activity="settings"]').or(
      page.getByRole('button', { name: /configuración|settings/i })
    );
    await settingsButton.click();

    // Verificar opciones de tema
    await expect(page.getByText(/tema|apariencia|theme/i)).toBeVisible();
  });

  test('should persist theme preference', async ({ page }) => {
    const settingsButton = page.locator('[data-activity="settings"]').or(
      page.getByRole('button', { name: /configuración|settings/i })
    );
    await settingsButton.click();

    // Cambiar a tema claro
    const lightThemeOption = page.getByRole('button', { name: /claro|light/i }).or(
      page.locator('[data-theme-option="light"]')
    );
    
    if (await lightThemeOption.isVisible()) {
      await lightThemeOption.click();

      // Recargar página
      await page.reload();

      // Verificar que el tema se mantuvo
      const theme = await page.evaluate(() => 
        document.documentElement.getAttribute('data-theme')
      );
      expect(theme).toBe('light');
    }
  });

  test('should show user profile section', async ({ page }) => {
    const settingsButton = page.locator('[data-activity="settings"]').or(
      page.getByRole('button', { name: /configuración|settings/i })
    );
    await settingsButton.click();

    // Buscar sección de perfil
    await expect(page.getByText(/perfil|cuenta|profile|account/i)).toBeVisible();
  });

  test('should have logout option', async ({ page }) => {
    const settingsButton = page.locator('[data-activity="settings"]').or(
      page.getByRole('button', { name: /configuración|settings/i })
    );
    await settingsButton.click();

    // Buscar opción de cerrar sesión
    await expect(page.getByRole('button', { name: /cerrar sesión|logout|salir/i })).toBeVisible();
  });
});
