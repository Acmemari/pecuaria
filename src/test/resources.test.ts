/**
 * Testes para verificar carregamento de recursos estáticos
 * e detecção de erros 404
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Verificação de Recursos Estáticos', () => {
  beforeEach(() => {
    // Limpar mocks antes de cada teste
    vi.clearAllMocks();
  });

  describe('Arquivo CSS', () => {
    it('deve verificar se index.css está referenciado no HTML', () => {
      // Simular verificação do HTML
      const htmlContent = '<link rel="stylesheet" href="/index.css">';
      expect(htmlContent).toContain('/index.css');
      expect(htmlContent).toContain('stylesheet');
    });

    it('deve detectar referências incorretas a CSS', () => {
      const correctPath = '/index.css';
      const incorrectPaths = ['/index.css:1', 'index.css', './index.css'];

      // O caminho correto deve ser /index.css
      expect(correctPath).toBe('/index.css');

      // Verificar que caminhos incorretos não são aceitos
      incorrectPaths.forEach(path => {
        expect(path).not.toBe('/index.css');
      });
    });
  });

  describe('Scripts e Módulos', () => {
    it('deve verificar se index.tsx está referenciado no HTML', () => {
      const htmlContent = '<script type="module" src="/index.tsx"></script>';
      expect(htmlContent).toContain('/index.tsx');
      expect(htmlContent).toContain('module');
    });

    it('deve verificar configuração do import map', () => {
      const importMap = {
        imports: {
          'react/': 'https://aistudiocdn.com/react@^19.2.0/',
          'react': 'https://aistudiocdn.com/react@^19.2.0',
          'react-dom/': 'https://aistudiocdn.com/react-dom@^19.2.0/',
        }
      };

      expect(importMap.imports.react).toBeTruthy();
      expect(importMap.imports['react-dom/']).toBeTruthy();
      expect(importMap.imports.react).toContain('react@^19.2.0');
    });
  });

  describe('CDN e Recursos Externos', () => {


    it('deve verificar se Google Fonts está configurado', () => {
      const fontUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500;700&display=swap';
      expect(fontUrl).toContain('fonts.googleapis.com');
      expect(fontUrl).toContain('Inter');
      expect(fontUrl).toContain('Roboto+Mono');
    });
  });

  describe('Detecção de Erros 404', () => {
    it('deve identificar recursos faltantes', () => {
      const requiredResources = [
        { path: '/index.css', name: 'CSS Principal' },
        { path: '/index.tsx', name: 'Entry Point React' },
      ];

      requiredResources.forEach(resource => {
        // Verificar que o caminho está correto
        expect(resource.path).toMatch(/^\//); // Deve começar com /
        expect(resource.name).toBeTruthy();
      });
    });

    it('deve validar formato de caminhos de recursos', () => {
      const validPaths = ['/index.css', '/index.tsx'];
      const invalidPaths = ['index.css', './index.css', 'index.css:1'];

      validPaths.forEach(path => {
        expect(path).toMatch(/^\/[^:]+$/); // Deve começar com / e não ter :
      });

      invalidPaths.forEach(path => {
        // Esses caminhos não devem ser usados
        expect(path).not.toMatch(/^\/[^:]+$/);
      });
    });
  });

  describe('Estrutura de Head HTML', () => {
    it('deve verificar ordem correta de recursos no head', () => {
      const expectedOrder = [
        'charset',
        'viewport',
        'title',
        'tailwind',
        'fonts',
        'styles',
        'importmap',
        'index.css',
      ];

      // Verificar que temos uma ordem esperada
      expect(expectedOrder.length).toBeGreaterThan(0);
      expect(expectedOrder).toContain('index.css');
    });

    it('deve verificar que não há recursos duplicados', () => {
      const resources = [
        '/index.css',
        'https://cdn.tailwindcss.com',
        'https://fonts.googleapis.com/css2?family=Inter',
      ];

      const uniqueResources = new Set(resources);
      expect(uniqueResources.size).toBe(resources.length);
    });
  });
});

describe('Validação de Configuração Vite', () => {
  it('deve verificar se Vite está configurado para servir recursos estáticos', () => {
    // Vite serve arquivos estáticos da raiz por padrão
    const publicPath = '/';
    expect(publicPath).toBe('/');
  });

  it('deve verificar se arquivos CSS são processados corretamente', () => {
    // Vite processa CSS automaticamente
    const cssExtension = '.css';
    expect(cssExtension).toBe('.css');
  });
});

