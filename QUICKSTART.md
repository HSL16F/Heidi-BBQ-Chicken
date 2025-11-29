# Quick Start Guide

## Option 1: Using Docker (Recommended)

This will start MySQL, OpenEMR, and the backend API all together.

### Step 1: Start Docker services
```bash
# From the project root directory
docker-compose up -d
```

This starts:
- MySQL database (port 3306)
- OpenEMR (ports 80, 443)
- Backend API (port 3001)

### Step 2: Start the frontend
Open a new terminal and run:
```bash
cd frontend/my-react-app
npm install  # Only needed the first time
npm run dev
```

### Step 3: Open the app
Open your browser and go to:
```
http://localhost:5173
```
(Vite usually runs on port 5173, check the terminal output for the exact URL)

---

## Option 2: Run Everything Locally (Without Docker)

### Step 1: Start MySQL and OpenEMR with Docker
```bash
docker-compose up mysql openemr -d
```

### Step 2: Start the backend API
Open a terminal and run:
```bash
cd backend
npm install  # Only needed the first time
npm run dev
```

### Step 3: Start the frontend
Open another terminal and run:
```bash
cd frontend/my-react-app
npm install  # Only needed the first time
npm run dev
```

### Step 4: Open the app
Open your browser and go to:
```
http://localhost:5173
```

---

## Troubleshooting

### Backend won't start
- Make sure MySQL is running: `docker-compose ps`
- Check backend logs: `docker-compose logs backend`
- If running locally, ensure MySQL is accessible at `localhost:3306`

### Frontend can't connect to backend
- Verify backend is running on port 3001: `curl http://localhost:3001/health`
- Check the Vite proxy configuration in `vite.config.js`

### Port already in use
- Change the port in `docker-compose.yml` or stop the conflicting service

---

## Stopping the Services

To stop all Docker services:
```bash
docker-compose down
```

To stop and remove volumes (clears database):
```bash
docker-compose down -v
```

