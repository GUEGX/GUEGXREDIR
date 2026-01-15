# GEMINI.md - Project GUEGXREDIR

## Project Overview

This project is a sophisticated URL shortener and analytics tracker. It's built as a serverless application using Netlify Functions and uses Google Firestore as its database. The primary functionality is to shorten long URLs and then track detailed information about the users who click on the shortened links.

The application is architected to be multi-tenant, with data partitioned by `appId` and `userId`.

### Core Technologies

*   **Hosting & Serverless Functions:** Netlify
*   **Database:** Google Firestore
*   **Node.js Dependencies:**
    *   `firebase-admin`: To interact with Firestore from the Netlify functions.
    *   `nanoid`: To generate short, unique slugs for the URLs.
    *   `@netlify/neon`: Netlify's serverless driver for Neon Postgres (although the code is using Firestore).

### Architecture

The application is composed of three main Netlify Functions:

1.  **`create-link`**: An API endpoint for creating new shortened links. It takes a long URL, an optional custom slug, a user ID, and an app ID, and it stores the link data in Firestore.
2.  **`redirect`**: This is the main entry point for all shortened links. When a user clicks a shortened link, this function is invoked. It doesn't perform the redirect itself. Instead, it serves an HTML page with a JavaScript-based tracker.
3.  **`log-and-redirect`**: The client-side tracker sends a POST request to this function with the collected data. This function then logs all the data to Firestore, increments the click count for the link, and returns the original long URL to the client. The client-side script then performs the final redirect.

**Data Collection and Privacy:**

It is important to note that this application collects a significant amount of data from the user's browser, including:

*   User-Agent, Referrer, Language, Timezone
*   Screen resolution and viewport size
*   Connection details (effective type, RTT, downlink)
*   Hardware details (CPU cores, device memory)
*   Browser capabilities (vendor, online status, Do Not Track status, touch support)
*   Performance metrics (latency, DNS lookup, TCP connect, etc.)
*   A list of browser plugins and MIME types
*   IP Address and Country (from Netlify headers)

This data is stored in a `logs` collection in Firestore, associated with the `appId` and `userId` that created the link. This is a privacy-sensitive application, and the data collected should be handled responsibly.

## Building and Running

This is a serverless project, so there's no traditional "build" or "run" command for local development. To work with this project, you'll need to use the Netlify CLI.

### Prerequisites

*   Node.js and npm installed
*   [Netlify CLI](https://docs.netlify.com/cli/get-started/) installed: `npm install netlify-cli -g`
*   A Firebase project with Firestore enabled.

### Local Development

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Set up environment variables:**
    You'll need to create a `.env` file in the root of the project and add your Firebase service account credentials as a single-line JSON string:
    ```
    FIREBASE_SERVICE_ACCOUNT={"type": "service_account", ...}
    ```
    You can get this from your Firebase project settings.

3.  **Run the Netlify development server:**
    ```bash
    netlify dev
    ```
    This will start a local server that emulates the Netlify environment, including the serverless functions.

## Development Conventions

### Creating a new link

To create a new link, you would send a POST request to the `/.netlify/functions/create-link` endpoint with a JSON body like this:

```json
{
  "longUrl": "https://www.google.com",
  "customSlug": "my-custom-slug",
  "userId": "user-123",
  "appId": "app-abc"
}
```

The `customSlug` is optional. If you don't provide one, a random 6-character slug will be generated.

### Accessing a shortened link

You would access the shortened link by going to `http://<your-netlify-site-url>/<slug>`. This will trigger the `redirect` function and start the tracking and redirection process.
