# Referral API Backend

Backend API server for handling referral form submissions.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials if needed.

## Development

Run the development server with hot reload:
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## Production

Build the TypeScript code:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## API Endpoints

### POST /api/referral

Submit a referral form.

**Request Body:**
```json
{
  "pid": "string",
  "reason": "string",
  "referralDate": "YYYY-MM-DD",
  "referToFirstName": "string",
  "referToLastName": "string",
  "referByFirstName": "string",
  "referByLastName": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Referral inserted successfully. Transaction ID: 123",
  "transactionId": 123
}
```

### GET /health

Health check endpoint.

## Docker

To run with Docker Compose (from project root):
```bash
docker-compose up backend
```

For development with hot reload:
```bash
docker-compose -f docker-compose.dev.yml up
```

