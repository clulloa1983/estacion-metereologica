import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertTitle, Button, Box, Card, CardContent, Typography } from '@mui/material';
import { ErrorOutline as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error caught by ErrorBoundary in ${this.props.componentName || 'Unknown Component'}:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const componentName = this.props.componentName || 'Component';
      const isMLComponent = componentName.toLowerCase().includes('ml');

      return (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <ErrorIcon color="error" />
              <Typography variant="h6" color="error">
                {componentName} Error
              </Typography>
            </Box>
            
            <Alert severity={isMLComponent ? "info" : "error"}>
              <AlertTitle>
                {isMLComponent ? "Feature Under Development" : "Component Error"}
              </AlertTitle>
              {isMLComponent ? (
                <>
                  The Machine Learning alerts feature is currently under development. 
                  This is a known issue and the feature will be available in a future update.
                  <br /><br />
                  All other weather monitoring features continue to work normally.
                </>
              ) : (
                <>
                  An error occurred while loading this component. 
                  Please try refreshing or contact support if the problem persists.
                  <br /><br />
                  <strong>Error:</strong> {this.state.error?.message || 'Unknown error'}
                </>
              )}
            </Alert>

            <Box mt={2}>
              <Button
                variant={isMLComponent ? "outlined" : "contained"}
                color={isMLComponent ? "primary" : "error"}
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
              >
                Retry Loading
              </Button>
            </Box>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;