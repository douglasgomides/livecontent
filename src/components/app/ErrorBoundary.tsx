import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="font-serif text-2xl">Algo deu errado</h1>
            <p className="text-muted-foreground text-sm">
              A tela encontrou um erro inesperado. Seus dados estão salvos — recarregue a página
              para continuar.
            </p>
            <Button onClick={() => window.location.reload()} className="bg-gold-gradient text-primary-foreground">
              Recarregar
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
