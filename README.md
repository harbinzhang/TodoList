# TodoList App

A professional todo list application built with React, TypeScript, Vite, and Firebase. Features a clean, modern UI inspired by Todoist with full task management capabilities.

## Features

### ✅ Core Functionality
- **Task Management**: Create, edit, complete, and delete tasks
- **Priority System**: 4-level priority system with color coding
- **Due Dates**: Set and track task due dates
- **Organization**: Organize tasks with projects and labels
- **Real-time Updates**: Instant synchronization across devices

### 🎨 User Interface
- **Clean Design**: Professional, minimalist interface
- **Responsive Layout**: Works on desktop and mobile
- **Intuitive Navigation**: Sidebar with collapsible sections
- **Modern Styling**: Built with Tailwind CSS

### 🔥 Firebase Integration
- **Authentication**: Email/password and Google OAuth
- **Cloud Firestore**: Real-time database for tasks, projects, and labels
- **Hosting**: Ready for Firebase Hosting deployment
- **Security**: Firestore security rules for data protection

### 🔍 Advanced Features
- **Search**: Full-text search across all tasks
- **Filters**: Filter by project, label, priority, and completion status
- **Views**: Inbox, Today, Upcoming, Project, and Label views
- **Subtasks**: Break down complex tasks (UI ready)

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, Heroicons
- **State Management**: Zustand
- **Backend**: Firebase (Firestore, Auth, Hosting)
- **Date Handling**: date-fns
- **Forms**: React Hook Form

## Engineering Standards

This repo now treats [Firebase + Vite + React Reference Guide](./docs/firebase-vite-react-reference.md) as the canonical baseline for Firebase wiring, environment safety, testing layers, and operational scripts.

Local development is emulator-first by default. Use `npm run dev` for the combined app + emulator workflow, and `npm run seed:local:apply` when you want deterministic local data before testing flows.

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase CLI
- A Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd TodoList
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   ```bash
   # Install Firebase CLI globally if not installed
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Initialize Firebase (if not already done)
   firebase init
   ```

4. **Environment Configuration**
   - Copy `.env.example` to `.env.local` for local development
   - Fill in your Firebase configuration values:
   ```env
   VITE_APP_ENV=local
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=
   VITE_USE_EMULATOR=true
   ```
   - Use `.env.development`, `.env.staging`, and `.env.production` to keep local, staging, and production behavior separate

5. **Firestore Setup**
   - Enable Firestore in your Firebase console
   - Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

6. **Authentication Setup**
   - Enable Email/Password authentication in Firebase console
   - Enable Google Sign-in provider
   - Add your domain to authorized domains

### Development

```bash
# Start app + Firebase emulators together
npm run dev

# Start only the Vite app
npm run dev:app

# Start only the Firebase emulators
npm run dev:emulators

# Seed deterministic local emulator data
npm run seed:local:apply

# Build for production
npm run build

# Build for staging
npm run build:staging

# Preview production build
npm run preview
```

### Deployment

```bash
# Build and deploy to Firebase Hosting
npm run deploy

# Deploy everything (hosting + firestore rules + indexes + storage + functions)
firebase deploy
```

## Usage Guide

### Creating Tasks
1. Click "Add task" in the sidebar or main content area
2. Enter task title and optional description
3. Set priority level (P1-P4)
4. Add due date if needed
5. Click "Add task" to save

### Organizing with Projects
1. Click the "+" icon next to "Projects" in sidebar
2. Enter project name and choose a color
3. Tasks can be assigned to projects during creation
4. View project tasks by clicking on the project name

### Using Labels
1. Click the "+" icon next to "Labels" in sidebar
2. Create labels for cross-project organization
3. Add labels to tasks during creation or editing
4. Filter tasks by clicking on label names

### Navigation Views
- **Inbox**: Tasks not assigned to any project
- **Today**: Tasks due today
- **Upcoming**: Tasks with future due dates
- **Projects**: Tasks organized by project
- **Labels**: Tasks filtered by labels

## Project Structure

```
src/
├── components/
│   ├── auth/
│   │   └── AuthForm.tsx          # Authentication component
│   ├── common/
│   │   └── SearchBar.tsx         # Search functionality
│   ├── labels/
│   │   └── LabelForm.tsx         # Label creation form
│   ├── layout/
│   │   ├── MainContent.tsx       # Main content area
│   │   └── Sidebar.tsx           # Navigation sidebar
│   ├── projects/
│   │   └── ProjectForm.tsx       # Project creation form
│   └── tasks/
│       ├── TaskForm.tsx          # Task creation/editing
│       ├── TaskItem.tsx          # Individual task display
│       └── TaskList.tsx          # Task list container
├── firebase/
│   └── config.ts                 # Firebase configuration
├── services/
│   ├── labelService.ts           # Label CRUD operations
│   ├── projectService.ts         # Project CRUD operations
│   └── taskService.ts            # Task CRUD operations
├── store/
│   ├── authStore.ts              # Authentication state
│   └── taskStore.ts              # Task management state
├── types/
│   └── index.ts                  # TypeScript type definitions
├── App.tsx                       # Main application component
└── main.tsx                      # Application entry point
```

## License

This project is licensed under the MIT License.

---

Built with ❤️ using React, TypeScript, and Firebase
