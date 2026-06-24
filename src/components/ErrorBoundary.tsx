import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Dashboard render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card" style={{ borderColor: 'var(--danger)' }}>
          <div className="section-title">Something went wrong</div>
          <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>{this.state.error.message}</p>
          <button type="button" className="btn btn-primary" onClick={() => this.setState({ error: null })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
