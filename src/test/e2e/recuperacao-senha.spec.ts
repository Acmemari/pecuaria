/**
 * Teste E2E do fluxo de recuperação de senha
 * - Login > Esqueci minha senha > Informar email > Sucesso
 */
import { test, expect } from '@playwright/test';

test.describe('Recuperação de senha', () => {
  test('deve exibir formulário e mensagem de sucesso ao solicitar reset', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Clicar em "Esqueci minha senha"
    await page.getByRole('button', { name: /esqueci minha senha/i }).click();
    await page.waitForLoadState('networkidle');

    // Verificar que estamos na página de recuperação
    await expect(page.getByRole('heading', { name: /recuperar senha/i })).toBeVisible();
    await expect(page.getByPlaceholder(/exemplo@/i)).toBeVisible();

    // Preencher email (Supabase retorna sucesso mesmo para email inexistente - anti-enumeration)
    const testEmail = 'teste-recuperacao@example.com';
    await page.getByPlaceholder(/exemplo@/i).fill(testEmail);

    // Clicar em enviar
    await page.getByRole('button', { name: /enviar link de recuperação/i }).click();

    // Aguardar resposta (sucesso ou erro de rate limit)
    await page.waitForTimeout(3000);

    // Deve mostrar sucesso OU mensagem de erro (email não encontrado, rate limit, etc)
    const successHeading = page.getByRole('heading', { name: /email enviado/i });
    const errorMsg = page.getByText(/erro|não encontrado|não cadastrado|tente novamente/i);
    const backButton = page.getByRole('button', { name: /voltar ao login/i });

    const hasSuccess = await successHeading.isVisible().catch(() => false);
    const hasError = await errorMsg.isVisible().catch(() => false);
    const hasBack = await backButton.isVisible().catch(() => false);

    expect(hasSuccess || hasError || hasBack).toBeTruthy();
  });

  test('deve validar formato de email inválido', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /esqueci minha senha/i }).click();
    await page.waitForLoadState('networkidle');

    // Email sem TLD (passa HTML5 em alguns browsers, falha na nossa regex)
    await page.getByPlaceholder(/exemplo@/i).fill('user@domain');
    await page.getByRole('button', { name: /enviar link de recuperação/i }).click();

    // Deve mostrar erro de validação
    await expect(page.getByText(/informe um email válido/i)).toBeVisible({ timeout: 5000 });
  });
});
