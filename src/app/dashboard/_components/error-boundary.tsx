"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (this.props.onError) this.props.onError(error, info);
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;
      return (
        <div className="border rounded-md p-6 text-center">
          <p className="font-semibold">Something went wrong</p>
          <p className="text-sm text-muted-foreground mt-1">Please try again.</p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={this.reset}>Retry</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
