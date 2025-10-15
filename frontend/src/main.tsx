import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { msalInstance } from './config/authConfig';
import App from './App';
import './index.css';

// Initialize MSAL
msalInstance.initialize().then(() => {
  // Configure React Query
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <QueryClientProvider client={queryClient}>
          <FluentProvider theme={webLightTheme}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </FluentProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </MsalProvider>
    </React.StrictMode>
  );
});
