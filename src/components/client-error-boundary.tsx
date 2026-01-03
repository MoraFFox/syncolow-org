/**
 * Client Error Boundary
 *
 * Catches errors in the React component tree and displays a
 * fallback UI while logging the error.
 */

'use client';

import React, { Component, ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { clientLogger } from '@/lib/client-logger';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ClientErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        clientLogger.error(error, {
            component: this.props.componentName || 'ErrorBoundary',
            type: 'react_render_error',
            reactStack: errorInfo.componentStack,
        });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center p-6 min-h-[200px] rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/50">
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
                        Something went wrong
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-300 text-center max-w-md mb-6">
                        {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                            className="border-red-200 hover:bg-red-100 hover:text-red-900 dark:border-red-800 dark:hover:bg-red-900/50 dark:hover:text-red-100"
                        >
                            Reload Page
                        </Button>
                        <Button
                            onClick={this.handleRetry}
                            className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-600"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Try Again
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
