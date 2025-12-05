import { test, expect } from '@playwright/test';

/**
 * Testes E2E para verificar carregamento de recursos
 * e ausência de erros 404
 */
test.describe('Carregamento de Recursos', () => {
  test('deve carregar a página inicial sem erros', async ({ page }) => {
    // Interceptar requisições para verificar erros 404
    const failedRequests: string[] = [];
    
    page.on('response', (response) => {
      if (response.status() === 404) {
        failedRequests.push(response.url());
      }
    });

    await page.goto('/');

    // Verificar que não há erros 404
    expect(failedRequests.length).toBe(0);
  });

  test('deve carregar o arquivo CSS principal', async ({ page }) => {
    const cssLoaded = page.waitForResponse(
      (response) => 
        response.url().includes('index.css') || 
        response.url().includes('.css'),
      { timeout: 5000 }
    ).catch(() => null);

    await page.goto('/');
    const response = await cssLoaded;

    // CSS deve ser carregado (pode ser inline ou arquivo separado)
    expect(response).toBeTruthy();
  });

  test('deve ter o elemento root no DOM', async ({ page }) => {
    await page.goto('/');
    
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();
  });

  test('deve carregar o React sem erros no console', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    
    // Aguardar um pouco para o React carregar
    await page.waitForTimeout(1000);

    // Verificar que não há erros críticos no console
    // (podem haver warnings, mas não erros que quebrem a aplicação)
    const criticalErrors = consoleErrors.filter(
      (error) => 
        !error.includes('Warning') && 
        !error.includes('should not be used in production')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('deve verificar ausência de erros 404 para recursos estáticos', async ({ page }) => {
    const failedResources: string[] = [];
    
    page.on('response', (response) => {
      if (response.status() === 404) {
        const url = response.url();
        // Ignorar recursos de terceiros que podem não estar disponíveis
        if (!url.includes('aistudiocdn.com') && !url.includes('fonts.googleapis.com')) {
          failedResources.push(url);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Não deve haver erros 404 para recursos locais
    expect(failedResources.length).toBe(0);
  });

  test('deve renderizar o App corretamente', async ({ page }) => {
    await page.goto('/');
    
    // Aguardar o React carregar
    await page.waitForTimeout(2000);

    // Verificar que o root contém conteúdo (React renderizou)
    const rootContent = await page.locator('#root').innerHTML();
    expect(rootContent.length).toBeGreaterThan(0);
  });

  test('deve carregar fontes do Google sem erros', async ({ page }) => {
    const fontLoaded = page.waitForResponse(
      (response) => response.url().includes('fonts.googleapis.com'),
      { timeout: 5000 }
    ).catch(() => null);

    await page.goto('/');
    const response = await fontLoaded;

    // Fontes devem ser carregadas
    expect(response).toBeTruthy();
  });
});

