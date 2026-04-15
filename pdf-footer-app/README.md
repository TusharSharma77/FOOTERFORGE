# FooterForge — PDF Footer Replacer

A full-stack MERN-style web application that replaces the footer of every page in a PDF with custom name and enrollment number text.

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18 + Vite                   |
| Backend   | Node.js + Express                 |
| PDF       | pdf-lib                           |
| Uploads   | Multer (multipart/form-data)      |

---

## Project Structure

```
pdf-footer-app/
├── backend/
│   ├── server.js          # Express API
│   ├── uploads/           # Temp storage (auto-created, auto-cleaned)
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx         # Main React component
    │   ├── App.css         # Styles
    │   ├── main.jsx        # Entry point
    │   └── index.css       # Global styles + CSS variables
    ├── vite.config.js      # Vite config + dev proxy
    └── package.json
```

---

## Running Locally

### Prerequisites
- Node.js v18+ (tested on v22)
- npm

### 1. Install & start the backend

```bash
cd backend
npm install
node server.js
# → Server running at http://localhost:5000
```

### 2. Install & start the frontend (dev mode)

```bash
cd frontend
npm install
npm run dev
# → App running at http://localhost:5173
```

> The Vite dev server proxies `/upload` and `/health` to `localhost:5000` automatically.

### 3. (Optional) Production build — single server

```bash
# Build the frontend
cd frontend && npm run build

# Run only the backend — it serves the built frontend too
cd ../backend && node server.js
# → Open http://localhost:5000
```

---

## API Reference

### `POST /upload`

Accepts a multipart/form-data request.

| Field             | Type   | Required | Description                    |
|-------------------|--------|----------|--------------------------------|
| `pdf`             | File   | ✅       | PDF file (max 10 MB)           |
| `name`            | String | ✅       | Name to stamp in footer        |
| `enrollmentNumber`| String | ✅       | Enrollment number for footer   |

**Success response:** Binary PDF file download (`Content-Type: application/pdf`)

**Error responses:**

| Status | Reason                          |
|--------|---------------------------------|
| 400    | Missing file, name, or enrollment number; invalid file type |
| 413    | File exceeds 10 MB              |
| 500    | PDF processing failure          |

### `GET /health`

Returns `{ "status": "ok" }`.

---

## How It Works

For each page of the uploaded PDF, the backend:
1. Draws a **white rectangle** over the bottom 28pt to cover any existing footer
2. Draws a thin **separator line** at the top of the footer zone
3. Renders the text `Name: <name>   |   Enrollment: <enrollment>` centered in Helvetica Bold 10pt

The rest of the page content is untouched.

---

## Environment Variables

| Variable | Default              | Description         |
|----------|----------------------|---------------------|
| `PORT`   | `5000`               | Backend server port |

---

## Limitations / Notes

- Encrypted / password-protected PDFs will fail with a 500 error
- Uploaded files are deleted immediately after processing (no storage)
- File size limit: 10 MB
