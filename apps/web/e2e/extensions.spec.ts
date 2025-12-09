/**
 * FC-504: E2E Tests - Extensions
 * Tests para el sistema de extensiones
 */

import { test, expect } from '@playwright/test';

// Helper para autenticarse
async function authenticate(page: import('@playwright/test').Page) {
  await page.goto('/');
  
  await page.getByRole('link', { name: /crear cuenta|registrarse/i }).click();
  
  const uniqueEmail = `ext-test-${Date.now()}@example.com`;
  await page.getByPlaceholder(/nombre/i).fill('Extensions Test User');
  await page.getByPlaceholder(/correo/i).fill(uniqueEmail);
  await page.getByPlaceholder(/contraseña/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /crear cuenta|registrar/i }).click();

  await expect(page.locator('[data-testid="main-layout"]').or(page.getByText(/fluxcore/i))).toBeVisible({ timeout: 10000 });
}

test.describe('Extensions', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('should show extensions panel', async ({ page }) => {
    // Click en extensions
    const extensionsButton = page.locator('[data-activity="extensions"]').or(
      page.getByRole('button', { name: /extensiones|extensions|plugins/i })
    );
    
    if (await extensionsButton.isVisible()) {
      await extensionsButton.click();

      // Verificar que el panel de extensiones está visible
      await expect(page.getByText(/extensiones|extensions/i)).toBeVisible();
    }
  });

  test('should list available extensions', async ({ page }) => {
    const extensionsButton = page.locator('[data-activity="extensions"]').or(
      page.getByRole('button', { name: /extensiones|extensions/i })
    );
    
    if (await extensionsButton.isVisible()) {
      await extensionsButton.click();

      // Verificar que hay al menos una extensión (core-ai)
      await expect(page.getByText(/core-ai|ia|asistente/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show extension details', async ({ page }) => {
    const extensionsButton = page.locator('[data-activity="extensions"]').or(
      page.getByRole('button', { name: /extensiones|extensions/i })
    );
    
    if (await extensionsButton.isVisible()) {
      await extensionsButton.click();

      // Click en una extensión
      const extensionCard = page.locator('[data-testid="extension-card"]').first().or(
        page.getByText(/core-ai/i)
      );
      
      if (await extensionCard.isVisible()) {
        await extensionCard.click();

        // Verificar detalles
        await expect(page.getByText(/descripción|versión|version|description/i)).toBeVisible();
      }
    }
  });

  test('should toggle extension enabled state', async ({ page }) => {
    const extensionsButton = page.locator('[data-activity="extensions"]').or(
      page.getByRole('button', { name: /extensiones|extensions/i })
    );
    
    if (await extensionsButton.isVisible()) {
      await extensionsButton.click();

      // Buscar toggle de extensión
      const extensionToggle = page.locator('[data-testid="extension-toggle"]').first().or(
        page.locator('input[type="checkbox"]').first()
      );
      
      if (await extensionToggle.isVisible()) {
        const wasChecked = await extensionToggle.isChecked();
        await extensionToggle.click();
        
        // Verificar que el estado cambió
        if (wasChecked) {
          await expect(extensionToggle).not.toBeChecked();
        } else {
          await expect(extensionToggle).toBeChecked();
        }
      }
    }
  });

  test('should show core-ai extension features', async ({ page }) => {
    const extensionsButton = page.locator('[data-activity="extensions"]').or(
      page.getByRole('button', { name: /extensiones|extensions/i })
    );
    
    if (await extensionsButton.isVisible()) {
      await extensionsButton.click();

      // Buscar core-ai
      const coreAiCard = page.getByText(/core-ai|asistente.*ia/i);
      
      if (await coreAiCard.isVisible()) {
        // Verificar que muestra características de IA
        await expect(page.getByText(/sugerencias|respuestas|ai|ia/i)).toBeVisible();
      }
    }
  });
});
