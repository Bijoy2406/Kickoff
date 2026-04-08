

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` and set required values:
   `VITE_CONVEX_URL=your_convex_deployment_url`
   `VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key`
   `GEMINI_API_KEY=your_gemini_api_key`
3. Start Convex locally:
   `npx convex dev`
4. Run the app:
   `npm run dev`

### Optional: React Grab Visual Edit

React Grab is disabled by default to avoid noisy network requests.

To enable it in development, add this variable:
`VITE_ENABLE_REACT_GRAB=true`
