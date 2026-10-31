import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-red-50 p-8">
          <div className="max-w-2xl rounded-lg bg-white p-6 shadow-lg">
            <h1 className="mb-4 text-2xl font-bold text-red-600">
              应用发生错误
            </h1>
            <div className="mb-4 rounded bg-red-100 p-4">
              <p className="font-mono text-sm text-red-800">
                {this.state.error?.message}
              </p>
            </div>
            {this.state.error?.stack && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-600">
                  错误堆栈
                </summary>
                <pre className="mt-2 max-h-60 overflow-auto rounded bg-gray-100 p-4 text-xs">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            {this.state.errorInfo?.componentStack && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-600">
                  组件堆栈
                </summary>
                <pre className="mt-2 max-h-60 overflow-auto rounded bg-gray-100 p-4 text-xs">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              onClick={() => window.location.reload()}
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
