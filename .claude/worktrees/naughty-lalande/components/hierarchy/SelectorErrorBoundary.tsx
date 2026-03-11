import React from 'react';

interface SelectorErrorBoundaryState {
  hasError: boolean;
}

interface SelectorErrorBoundaryProps {
  children: React.ReactNode;
  fallbackLabel: string;
}

class SelectorErrorBoundary extends React.Component<SelectorErrorBoundaryProps, SelectorErrorBoundaryState> {
  state: SelectorErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SelectorErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[SelectorErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-3 py-1.5 rounded-md border border-red-300 bg-red-50 text-red-700 text-xs">
          Falha no seletor de {this.props.fallbackLabel.toLowerCase()}.
        </div>
      );
    }
    return this.props.children;
  }
}

export default SelectorErrorBoundary;
