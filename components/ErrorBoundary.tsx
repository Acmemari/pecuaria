import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Aqui você pode enviar o erro para um serviço de logging
    // Ex: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-ai-surface">
          <div className="bg-white rounded-xl border border-ai-border shadow-sm p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-rose-500" />
              <h2 className="text-lg font-semibold text-ai-text">Algo deu errado</h2>
            </div>
            <p className="text-sm text-ai-subtext mb-6">
              Ocorreu um erro inesperado. Por favor, tente recarregar a página ou entre em contato com o suporte se o problema persistir.
            </p>
            {this.state.error && (
              <details className="mb-4">
                <summary className="text-xs text-ai-subtext cursor-pointer mb-2">
                  Detalhes do erro
                </summary>
                <pre className="text-xs bg-ai-surface p-3 rounded border border-ai-border overflow-auto max-h-32">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-ai-text text-white rounded-lg hover:bg-black transition-colors font-medium text-sm"
            >
              <RefreshCw size={16} />
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

