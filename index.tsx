import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

if (!convexUrl || !clerkPublishableKey) {
  root.render(
    <React.StrictMode>
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
        <section
          style={{
            width: '100%',
            maxWidth: '720px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '20px',
            color: '#e2e8f0',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <h1 style={{ marginTop: 0 }}>Configuration required</h1>
          <p>KickOff is missing required environment variables, so the app cannot connect to auth/database services yet.</p>
          <p style={{ marginBottom: 8 }}>Create or update <strong>.env.local</strong> with:</p>
          <pre style={{ background: '#020617', padding: '12px', borderRadius: '8px', overflowX: 'auto' }}>
{`VITE_CONVEX_URL=your_convex_deployment_url
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key`}
          </pre>
          <p style={{ marginBottom: 0 }}>Then run <strong>npx convex dev</strong> and restart <strong>npm run dev</strong>.</p>
        </section>
      </main>
    </React.StrictMode>
  );
} else {
  const convex = new ConvexReactClient(convexUrl);

  root.render(
    <React.StrictMode>
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        appearance={{
          layout: {
            unsafe_disableDevelopmentModeWarnings: true,
          },
        }}
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </React.StrictMode>
  );
}