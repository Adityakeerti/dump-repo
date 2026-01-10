# 🚀 Campus Intelligence System - Complete Setup Guide

> **For:** Fresh Windows PC with nothing installed  
> **Time Required:** ~30-45 minutes  
> **Difficulty:** Beginner-friendly 🟢

---

## 📋 Table of Contents

1. [Prerequisites to Install](#-step-1-install-prerequisites)
2. [Clone the Repository](#-step-2-clone-the-repository)
3. [Database Setup](#-step-3-database-setup)
4. [Configuration Files](#-step-4-create-configuration-files)
5. [Install Dependencies](#-step-5-install-project-dependencies)
6. [Run the Application](#-step-6-run-the-application)
7. [Troubleshooting](#-troubleshooting)

---

## 📦 Step 1: Install Prerequisites

You need to install these programs. Click each link to download.

### 1.1 Git (Version Control)
- **Download:** https://git-scm.com/download/win
- **Install:** Run the installer, click "Next" for all options (defaults are fine)
- **Verify:** Open Command Prompt and type:
  ```bash
  git --version
  ```

### 1.2 Java JDK 17+ (For Spring Boot backends)
- **Download:** https://adoptium.net/temurin/releases/ (Select Windows x64, JDK 17)
- **Install:** Run the installer, **CHECK the box** that says "Set JAVA_HOME variable"
- **Verify:** Open a NEW Command Prompt and type:
  ```bash
  java -version
  ```

### 1.3 Python 3.10+ (For AI/OCR services)
- **Download:** https://www.python.org/downloads/
- **Install:** Run installer, **CHECK "Add Python to PATH"** at the bottom!
- **Verify:** Open a NEW Command Prompt and type:
  ```bash
  python --version
  pip --version
  ```

### 1.4 Node.js 18+ (For frontends)
- **Download:** https://nodejs.org/ (LTS version recommended)
- **Install:** Run the installer with defaults
- **Verify:** Open a NEW Command Prompt and type:
  ```bash
  node --version
  npm --version
  ```

### 1.5 MySQL 8.0 (Main database)
- **Download:** https://dev.mysql.com/downloads/installer/
- Choose "MySQL Installer for Windows"
- **Install:**
  1. Select "Developer Default" or "Server only"
  2. Set root password to something you'll remember (e.g., `yourpassword`)
  3. Keep port as `3306`
  4. Complete installation
- **Verify:** Open MySQL Command Line Client and enter your password

### 1.6 MongoDB 7.0 (For AI chat memory)
- **Download:** https://www.mongodb.com/try/download/community
- **Install:**
  1. Run installer
  2. Choose "Complete" installation
  3. **CHECK "Install MongoDB as a Service"**
  4. Install MongoDB Compass (optional GUI tool)
- **Verify:** Open Command Prompt and type:
  ```bash
  mongod --version
  ```

### 1.7 Visual Studio Code (Recommended Editor)
- **Download:** https://code.visualstudio.com/
- **Extensions to install:** Java Extension Pack, Python, ES7+ React snippets

---

## 📂 Step 2: Clone the Repository

1. Open Command Prompt or PowerShell
2. Navigate to where you want the project:
   ```bash
   cd C:\Projects
   ```
3. Clone the repository:
   ```bash
   git clone <REPOSITORY_URL>
   cd "FINAL ASSEMBLY"
   ```

---

## 🗄️ Step 3: Database Setup

### 3.1 MySQL Setup

1. Open MySQL Command Line Client (or MySQL Workbench)
2. Login with your root password
3. Create the database:
   ```sql
   CREATE DATABASE connect_college;
   ```
4. Import the schema (run in Command Prompt, NOT MySQL):
   ```bash
   mysql -u root -p connect_college < database/connect_college_schema.sql
   ```
   Enter your MySQL password when prompted.

### 3.2 MongoDB Setup

MongoDB should already be running as a Windows service. Verify:
```bash
sc query MongoDB
```
You should see `STATE: RUNNING`. If not:
```bash
net start MongoDB
```

---

## ⚙️ Step 4: Create Configuration Files

The repository includes `.example` files. You need to create the real config files with your passwords.

### 4.1 Backend-AI Configuration

1. Navigate to: `backend-ai/src/main/resources/`
2. Copy `application.yml.example` and rename to `application.yml`
3. Edit `application.yml` and update:
   ```yaml
   spring:
     datasource:
       password: YOUR_MYSQL_PASSWORD    # <-- Change this!
     security:
       user:
         password: admin               # <-- Change if you want
   
   jwt:
     secret: GenerateA256BitSecretHere  # <-- Generate a secure key
   ```

### 4.2 Backend-Chat Configuration

1. Navigate to: `backend-chat/src/main/resources/`
2. Copy `application.properties.example` and rename to `application.properties`
3. Edit and update your MySQL password:
   ```properties
   spring.datasource.password=YOUR_MYSQL_PASSWORD
   ```

### 4.3 Backend-Meeting Configuration

1. Navigate to: `backend-meeting/src/main/resources/`
2. Copy `application.properties.example` and rename to `application.properties`
   (This file doesn't have secrets, but copy it anyway)

### 4.4 Agent1 (AI Chat) Configuration

1. Navigate to: `Agent1/`
2. Copy `.env.example` and rename to `.env`
3. Edit `.env` and update:
   ```env
   GOOGLE_API_KEY=your_google_gemini_api_key
   HUGGINGFACEHUB_API_TOKEN=your_huggingface_token
   JWT_SECRET=SameSecretAsBackendAI
   ```

   **Getting API Keys:**
   - **Google Gemini:** https://aistudio.google.com/app/apikey
   - **HuggingFace:** https://huggingface.co/settings/tokens

---

## 📥 Step 5: Install Project Dependencies

### Option A: Run the Setup Script (Recommended)

Double-click `setup.bat` or run in Command Prompt:
```bash
setup.bat
```
This will install all dependencies automatically.

### Option B: Manual Installation

#### 5.1 Python Dependencies

```bash
# Agent1 (AI Chat)
cd Agent1
pip install -r requirements.txt
cd ..

# Backend-OCR
cd backend-ocr
pip install -r requirements.txt
cd ..

# Backend-Lib
cd backend-lib
pip install -r requirements.txt
cd ..
```

#### 5.2 Node.js Dependencies

```bash
# Landing Page
cd Landing
npm install
cd ..

# Web Frontend
cd frontend/web
npm install
cd ..
```

#### 5.3 Java Dependencies

Maven will download dependencies automatically when you run the Spring Boot apps.

---

## ▶️ Step 6: Run the Application

### Start All Servers

Double-click `start_servers.bat` or run:
```bash
start_servers.bat
```

This will start:
| Service | Port | Description |
|---------|------|-------------|
| Main Backend | 8080 | Core API (auth, users) |
| Meeting Service | 8082 | Video meetings |
| Chat Service | 8083 | Messaging |
| OCR Service | 8000 | Marksheet extraction |
| AI Chat Agent | 8010 | AI assistant |
| Library Service | 8002 | Book management |
| Mobile Scanner | 9443 | HTTPS scanner |
| VBoard | 9444 | Virtual board |

### Start Frontends (in separate terminals)

```bash
# Landing Page
cd Landing
npm run dev

# Web App
cd frontend/web
npm run dev
```

### Access the Application

- **Landing Page:** http://localhost:5173 (or as shown in terminal)
- **Web App:** http://localhost:5174 (or as shown in terminal)

---

## 🔧 Troubleshooting

### "java is not recognized"
- Reinstall Java JDK and ensure "Set JAVA_HOME" is checked
- OR manually add Java to PATH:
  1. Search "Environment Variables" in Windows
  2. Edit "PATH" under System Variables
  3. Add the path to your Java `bin` folder (e.g., `C:\Program Files\Eclipse Adoptium\jdk-17\bin`)

### "python is not recognized"
- Reinstall Python and check "Add Python to PATH"
- Or add manually via Environment Variables

### "npm is not recognized"
- Reinstall Node.js
- Or restart your terminal/PC

### MySQL connection refused
- Ensure MySQL service is running: `net start mysql`
- Check your password in config files matches your MySQL root password

### MongoDB connection error
- Start the service: `net start MongoDB`
- Check if port 27017 is available

### Port already in use
- The `start_servers.bat` automatically kills processes on used ports
- Or manually: `netstat -ano | findstr :8080` then `taskkill /PID <PID> /F`

---

## 📞 Need Help?

Contact the team:
- **Adityakeerti** - Team Lead
- Create an issue on the repository

---

**Happy Coding! 🎉**
