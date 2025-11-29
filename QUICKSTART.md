# Quick Start Guide

## Windows Users

On Windows, you can use either:
- **PowerShell** (recommended) - comes with Windows 10/11
- **Command Prompt (cmd)** - also works
- **Git Bash** - if you have Git installed, provides a Linux-like experience

All commands below work the same in PowerShell, Command Prompt, and Git Bash. The main difference is that `curl` might not be available in Command Prompt - you can use PowerShell's `Invoke-WebRequest` instead, or install curl for Windows.

---

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
- Verify backend is running on port 3001:
  - **Windows PowerShell**: `Invoke-WebRequest http://localhost:3001/health`
  - **Windows Command Prompt**: Open browser to `http://localhost:3001/health`
  - **Git Bash/Linux/Mac**: `curl http://localhost:3001/health`
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

---

## Windows-Specific Notes

### Prerequisites
1. **Docker Desktop for Windows** - Download from [docker.com](https://www.docker.com/products/docker-desktop/)
   - Make sure WSL 2 is enabled (Docker Desktop will guide you)
   - Start Docker Desktop before running `docker-compose` commands

2. **Node.js** - Download from [nodejs.org](https://nodejs.org/)
   - Choose the LTS version
   - This includes npm

3. **Git** (optional but recommended) - Download from [git-scm.com](https://git-scm.com/download/win)
   - Provides Git Bash terminal with Linux-like commands

### Running Commands on Windows

**PowerShell (Recommended):**
```powershell
# Navigate to project directory
cd C:\path\to\Heidi-BBQ-Chicken

# Start Docker services
docker-compose up -d

# Start frontend (in new PowerShell window)
cd frontend\my-react-app
npm install
npm run dev
```

**Command Prompt:**
```cmd
# Navigate to project directory
cd C:\path\to\Heidi-BBQ-Chicken

# Start Docker services
docker-compose up -d

# Start frontend (in new Command Prompt window)
cd frontend\my-react-app
npm install
npm run dev
```

**Git Bash:**
```bash
# Navigate to project directory
cd /c/path/to/Heidi-BBQ-Chicken

# Start Docker services
docker-compose up -d

# Start frontend (in new Git Bash window)
cd frontend/my-react-app
npm install
npm run dev
```

### Path Separators
- Windows uses backslashes (`\`) but forward slashes (`/`) also work in most cases
- In Git Bash, always use forward slashes (`/`)
- In PowerShell and Command Prompt, both work, but backslashes are more common

### Testing Backend Health (Windows)
- **PowerShell**: `Invoke-WebRequest -Uri http://localhost:3001/health`
- **Browser**: Just open `http://localhost:3001/health` in your browser
- **Git Bash**: `curl http://localhost:3001/health`

### Troubleshooting "npm is not recognised" Error

If you see `'npm' is not recognized as an internal or external command`, this means Node.js is not installed or not in your PATH.

**Solution 1: Install Node.js**
1. Download Node.js from [nodejs.org](https://nodejs.org/)
2. Choose the **LTS (Long Term Support)** version
3. Run the installer and follow the setup wizard
4. **Important**: Make sure to check "Add to PATH" during installation
5. Restart your terminal/PowerShell/Command Prompt after installation
6. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

**Solution 2: Add Node.js to PATH (if already installed)**
1. Find where Node.js is installed (usually `C:\Program Files\nodejs\`)
2. Open System Properties → Environment Variables
3. Under "System variables", find "Path" and click "Edit"
4. Click "New" and add: `C:\Program Files\nodejs\`
5. Click "OK" on all dialogs
6. **Restart your terminal** (close and reopen PowerShell/Command Prompt)
7. Verify:
   ```powershell
   node --version
   npm --version
   ```

**Solution 3: Use Node Version Manager (nvm-windows)**
If you need to manage multiple Node.js versions:
1. Download nvm-windows from [github.com/coreybutler/nvm-windows/releases](https://github.com/coreybutler/nvm-windows/releases)
2. Install nvm-windows
3. Install Node.js through nvm:
   ```powershell
   nvm install lts
   nvm use lts
   ```

**After fixing npm:**
- Close and reopen your terminal
- Navigate to the project directory
- Try `npm --version` to confirm it works
- Then proceed with `npm install` in the frontend and backend directories

