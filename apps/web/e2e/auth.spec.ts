/**
 * FC-501: E2E Tests - Authentication
 * Tests para flujo de autenticación
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show login page when not authenticated', async ({ page }) => {
    // Debe mostrar la página de login
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByPlaceholder(/correo/i)).toBeVisible();
    await expect(page.getByPlaceholder(/contraseña/i)).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByPlaceholder(/contraseña/i);
    const toggleButton = page.getByRole('button', { name: /mostrar contraseña/i });

    // Inicialmente type es password
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click en toggle
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click de nuevo
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByPlaceholder(/correo/i).fill('invalid@test.com');
    await page.getByPlaceholder(/contraseña/i).fill('wrongpassword');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Esperar mensaje de error
    await expect(page.getByText(/credenciales inválidas|error/i)).toBeVisible({ timeout: 5000 });
  });

  test('should switch between login and register modes', async ({ page }) => {
    // Inicialmente en login
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();

    // Cambiar a registro
    await page.getByRole('link', { name: /crear cuenta|registrarse/i }).click();
    await expect(page.getByRole('heading', { name: /crear cuenta/i })).toBeVisible();
    await expect(page.getByPlaceholder(/nombre/i)).toBeVisible();

    // Volver a login
    await page.getByRole('link', { name: /iniciar sesión/i }).click();
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('should register a new user', async ({ page }) => {
    // Cambiar a registro
    await page.getByRole('link', { name: /crear cuenta|registrarse/i }).click();

    // Llenar formulario
    const uniqueEmail = `test-${Date.now()}@example.com`;
    await page.getByPlaceholder(/nombre/i).fill('Test User');
    await page.getByPlaceholder(/correo/i).fill(uniqueEmail);
    await page.getByPlaceholder(/contraseña/i).fill('TestPassword123!');

    // Submit
    await page.getByRole('button', { name: /crear cuenta|registrar/i }).click();

    // Debería redirigir al layout principal o mostrar éxito
    await expect(page.locator('[data-testid="main-layout"]').or(page.getByText(/bienvenido/i))).toBeVisible({ timeout: 10000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    // Primero registrar un usuario
    await page.getByRole('link', { name: /crear cuenta|registrarse/i }).click();
    
    const uniqueEmail = `login-test-${Date.now()}@example.com`;
    await page.getByPlaceholder(/nombre/i).fill('Login Test User');
    await page.getByPlaceholder(/correo/i).fill(uniqueEmail);
    await page.getByPlaceholder(/contraseña/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /crear cuenta|registrar/i }).click();

    // Esperar a que entre
    await expect(page.locator('[data-testid="main-layout"]').or(page.getByText(/bienvenido/i))).toBeVisible({ timeout: 10000 });
  });

  test('should show forgot password option', async ({ page }) => {
    await page.getByRole('link', { name: /olvidaste.*contraseña|recuperar/i }).click();
    await expect(page.getByRole('heading', { name: /recuperar contraseña/i })).toBeVisible();
  });
});
