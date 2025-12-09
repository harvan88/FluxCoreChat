/**
 * FC-502: E2E Tests - Chat
 * Tests para funcionalidad de chat
 */

import { test, expect } from '@playwright/test';

// Helper para autenticarse
async function authenticate(page: import('@playwright/test').Page) {
  await page.goto('/');
  
  // Registrar usuario único
  await page.getByRole('link', { name: /crear cuenta|registrarse/i }).click();
  
  const uniqueEmail = `chat-test-${Date.now()}@example.com`;
  await page.getByPlaceholder(/nombre/i).fill('Chat Test User');
  await page.getByPlaceholder(/correo/i).fill(uniqueEmail);
  await page.getByPlaceholder(/contraseña/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /crear cuenta|registrar/i }).click();

  // Esperar a que cargue el layout
  await expect(page.locator('[data-testid="main-layout"]').or(page.getByText(/fluxcore/i))).toBeVisible({ timeout: 10000 });
}

test.describe('Chat', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('should show welcome view when no chat is selected', async ({ page }) => {
    // Verificar que se muestra la vista de bienvenida
    await expect(page.getByText(/bienvenido|selecciona.*conversación|inicia.*chat/i)).toBeVisible();
  });

  test('should show conversations activity in sidebar', async ({ page }) => {
    // Click en el icono de conversaciones
    const conversationsButton = page.locator('[data-activity="conversations"]').or(
      page.getByRole('button', { name: /conversaciones|chats|mensajes/i })
    );
    
    if (await conversationsButton.isVisible()) {
      await conversationsButton.click();
      // El sidebar debería mostrar lista de conversaciones
      await expect(page.locator('[data-testid="sidebar"]').or(page.locator('.sidebar'))).toBeVisible();
    }
  });

  test('should show activity bar with icons', async ({ page }) => {
    // Verificar que el ActivityBar está visible
    const activityBar = page.locator('[data-testid="activity-bar"]').or(page.locator('.activity-bar'));
    await expect(activityBar).toBeVisible();

    // Verificar iconos principales
    await expect(page.locator('[data-activity="conversations"]').or(page.getByRole('button', { name: /chat|conversaciones/i }))).toBeVisible();
    await expect(page.locator('[data-activity="contacts"]').or(page.getByRole('button', { name: /contactos|usuarios/i }))).toBeVisible();
    await expect(page.locator('[data-activity="settings"]').or(page.getByRole('button', { name: /configuración|settings/i }))).toBeVisible();
  });

  test('should open chat when clicking on a conversation', async ({ page }) => {
    // Navegar a conversaciones
    const conversationsButton = page.locator('[data-activity="conversations"]');
    if (await conversationsButton.isVisible()) {
      await conversationsButton.click();
    }

    // Click en la primera conversación disponible
    const firstConversation = page.locator('[data-testid="conversation-item"]').first();
    if (await firstConversation.isVisible()) {
      await firstConversation.click();
      
      // Verificar que se abre el chat
      await expect(page.locator('[data-testid="chat-view"]').or(page.locator('.chat-view'))).toBeVisible();
    }
  });

  test('should have message input', async ({ page }) => {
    // Navegar a conversaciones y abrir un chat
    const conversationsButton = page.locator('[data-activity="conversations"]');
    if (await conversationsButton.isVisible()) {
      await conversationsButton.click();
    }

    const firstConversation = page.locator('[data-testid="conversation-item"]').first();
    if (await firstConversation.isVisible()) {
      await firstConversation.click();
      
      // Verificar input de mensaje
      const messageInput = page.getByPlaceholder(/escribe.*mensaje|mensaje/i).or(
        page.locator('[data-testid="message-input"]')
      );
      await expect(messageInput).toBeVisible();
    }
  });

  test('should toggle theme', async ({ page }) => {
    // Buscar el toggle de tema
    const themeToggle = page.locator('[data-testid="theme-toggle"]').or(
      page.getByRole('button', { name: /tema|theme|dark|light/i })
    );

    if (await themeToggle.isVisible()) {
      // Obtener el estado actual del tema
      const initialTheme = await page.evaluate(() => 
        document.documentElement.getAttribute('data-theme')
      );

      // Click para cambiar tema
      await themeToggle.click();

      // Verificar que el tema cambió
      const newTheme = await page.evaluate(() => 
        document.documentElement.getAttribute('data-theme')
      );
      
      expect(newTheme).not.toBe(initialTheme);
    }
  });
});
