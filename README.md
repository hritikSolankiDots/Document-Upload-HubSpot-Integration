# Document Upload & HubSpot Integration

This project allows users to upload documents via a web form, which are then uploaded to HubSpot as file attachments and associated with a contact. It uses Node.js, Express, Multer, and the HubSpot API.

## Features

- Secure document upload form with progress and notifications
- Upload up to 5 documents per submission
- Files are uploaded to HubSpot and associated with a contact
- HubSpot note is created with file attachments
- Responsive UI with Tailwind CSS

## Getting Started

### 1. Install dependencies

```sh
npm install
```

### 2. Configure Environment Variables

Copy the sample environment file and fill in your HubSpot credentials:

```sh
cp .env.sample .env
```

Edit `.env` and set your `CLIENT_SECRET`, `HUBSPOT_API_KEY` or OAuth token, and any other required values.

### 3. Start the Server

```sh
npm run dev:full
```

This will start the server and an ngrok tunnel for webhook testing.

### 4. Configure HubSpot Webhook

Copy the ngrok URL (shown in your terminal) and add `/webhook/hubspot` to it.  
Paste this full URL into your HubSpot Workflow Webhook action.

## Project Structure

```
src/
  controllers/
    documentsController.js   # Handles upload logic and HubSpot integration
  routes/
    documents.js            # Express routes for upload and home
  utils/
    hubspot_utils.js        # Helper functions for HubSpot API
  views/
    upload-documents.ejs    # Upload form UI
    home.ejs                # Home page
.env.sample                 # Example environment config
```

## .gitignore

The project ignores:

- `node_modules/`
- `.env`
- `logs/`, `*.log`
- `dist/`, `build/`
- `.vscode/`
- `coverage/`
- `uploads/`, `tmp/`, `temp/`

## Notes

- Make sure your HubSpot API key or OAuth token has the correct scopes for files and contacts.
- For production, secure your endpoints and validate file types/sizes as needed.

---

**Need help?**  
Contact the project maintainer or open an issue.