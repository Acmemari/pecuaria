/**
 * Sistema de logging estruturado
 * Centraliza todos os logs da aplicação com níveis e contexto
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  component?: string;
  userId?: string;
  action?: string;
  duration?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment = import.meta.env?.DEV === true;
  private isProduction = import.meta.env?.PROD === true;

  /**
   * Log interno com formatação
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      context,
    };

    if (error) {
      logEntry.error = {
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    }

    // Em desenvolvimento, log colorido e detalhado no console
    if (this.isDevelopment) {
      this.logToConsole(level, message, context, error);
    }

    // Em produção, apenas errors e warns
    if (this.isProduction && (level === 'error' || level === 'warn')) {
      console.error(JSON.stringify(logEntry));

      // Aqui você pode enviar para serviço externo
      // this.sendToExternalService(logEntry);
    }
  }

  /**
   * Log colorido para desenvolvimento
   */
  private logToConsole(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const colors = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m', // green
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
    };

    const reset = '\x1b[0m';
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const prefix = `${colors[level]}[${level.toUpperCase()}]${reset} ${timestamp}`;

    if (context?.component) {
      console.log(`${prefix} [${context.component}]`, message);
    } else {
      console.log(`${prefix}`, message);
    }

    if (context && Object.keys(context).length > 0) {
      console.log('  Context:', context);
    }

    if (error) {
      console.error('  Error:', error.message);
      if (error.stack) {
        console.error('  Stack:', error.stack);
      }
    }
  }

  /**
   * Enviar para serviço externo (Sentry, LogRocket, etc.)
   */
  private sendToExternalService(logEntry: LogEntry) {
    // Implementar integração com serviço de monitoramento
    // Exemplo: Sentry.captureException(logEntry);
  }

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }

  /**
   * Log de informação
   */
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  /**
   * Log de aviso
   */
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  /**
   * Log de erro
   */
  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, context, error);
  }

  /**
   * Medir performance de uma operação
   */
  async measureAsync<T>(operation: () => Promise<T>, operationName: string, context?: LogContext): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      this.info(`${operationName} completed`, {
        ...context,
        duration: `${duration.toFixed(2)}ms`,
      });

      // Alertar se operação demorou muito
      if (duration > 3000) {
        this.warn(`Slow operation: ${operationName}`, {
          ...context,
          duration: `${duration.toFixed(2)}ms`,
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.error(`${operationName} failed`, error instanceof Error ? error : new Error(String(error)), {
        ...context,
        duration: `${duration.toFixed(2)}ms`,
      });

      throw error;
    }
  }

  /**
   * Criar logger com contexto fixo
   */
  withContext(defaultContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) => this.debug(message, { ...defaultContext, ...context }),
      info: (message: string, context?: LogContext) => this.info(message, { ...defaultContext, ...context }),
      warn: (message: string, context?: LogContext) => this.warn(message, { ...defaultContext, ...context }),
      error: (message: string, error?: Error, context?: LogContext) =>
        this.error(message, error, { ...defaultContext, ...context }),
    };
  }
}

export const logger = new Logger();
