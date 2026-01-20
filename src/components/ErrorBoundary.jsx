import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 bg-brand-dark text-center">
          <h2 className="text-brand-gold text-2xl font-serif mb-4">
            אופס, משהו קטן השתבש...
          </h2>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-brand-gold text-black px-8 py-2 rounded-full font-bold"
          >
            רענן דף
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
