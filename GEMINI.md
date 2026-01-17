# GEMINI.md - Project GUEGXREDIR

## Project Overview

This project is a sophisticated URL shortener and analytics tracker. It's built as a serverless application using Netlify Functions and uses Google Firestore as its database. The primary functionality is to shorten long URLs, customize their social media appearance, and track detailed information about the users who click on them.

The application is architected to be multi-tenant, with data partitioned by `appId` and `userId`.

### Core Technologies

*   **Hosting & Serverless Functions:** Netlify
*   **Database:** Google Firestore
*   **Node.js Dependencies:**
    *   `firebase-admin`: To interact with Firestore from the Netlify functions.
    *   `nanoid`: To generate short, unique slugs for the URLs.
*   **Frontend:** Vanilla JavaScript with Tailwind CSS via CDN.

### Architecture

The application is composed of three main Netlify Functions:

1.  **`create-link`**: An API endpoint for creating new shortened links. It accepts:
    *   `longUrl`: The destination URL.
    *   `customSlug`: (Optional) A custom alias.
    *   `ogTitle`, `ogDescription`, `ogImage`: (Optional) Metadata for social media previews.
    *   `userId` & `appId`: For multi-tenancy.
2.  **`redirect`**: The entry point for shortened links (`/slug`).
    *   **Server-Side:** Lookups the link in Firestore to inject dynamic `<meta>` tags (Open Graph & Twitter Cards) for rich social previews.
    *   **Client-Side:** Serves an HTML page that executes a comprehensive tracker before redirecting.
3.  **`log-and-redirect`**: Receives browser data from the client-side tracker, logs it to Firestore, increments click counts, and returns the final destination URL.

**Security:**
*   **Dashboard Access:** The frontend (`index.html`) is protected by a simplistic client-side password overlay (SHA-256 hashed). Default password: `admin`.
*   **Firestore Rules:** Direct client access to Firestore (for the dashboard) requires proper security rules.

**Data Collection:**
The app collects extensive browser fingerprinting data including User-Agent, Screen/Viewport, Hardware concurrency, Connection details, Performance metrics, and IP/Country (via Netlify headers).

## Building and Running

### Prerequisites

*   Node.js and npm installed
*   [Netlify CLI](https://docs.netlify.com/cli/get-started/) (`npm install netlify-cli -g`)
*   A Firebase project with Firestore enabled.

### Local Development

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env` file with your Firebase service account:
    ```
    FIREBASE_SERVICE_ACCOUNT={"type": "service_account", ...}
    ```

3.  **Run Locally:**
    ```bash
    netlify dev
    ```

## Development Conventions

### Creating a new link

POST request to `/.netlify/functions/create-link`:

```json
{
  "longUrl": "https://www.google.com",
  "customSlug": "my-custom-slug",
  "ogTitle": "My Custom Title",
  "ogImage": "https://example.com/image.jpg",
  "userId": "user-123",
  "appId": "app-abc"
}
```

### Social Media Previews

To ensure links display with large images on Twitter/X and other platforms:
1.  Provide an `ogImage` URL (recommended size: 1200x630).
2.  The `redirect` function will automatically generate `twitter:card` set to `summary_large_image`.