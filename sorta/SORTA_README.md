# Sorta - AI-Powered Cloud Storage

Sorta is an intelligent cloud storage system that automatically organizes your files and folders using AI. The system provides a clean, minimal interface with both dark and light themes.

## Features

- **User Authentication**: Secure login and registration with PostgreSQL
- **AI-Powered File Organization**: Files are automatically sorted based on descriptions
- **Manual Upload Option**: Choose to upload without AI sorting
- **File Tree View**: Navigate through folders and files easily
- **File Preview Panel**: View file details and AI organization reasons
- **Dark/Light Theme**: Toggle between themes
- **AI Activity Indicators**: See what the AI is doing in real-time
- **Storage Management**: Track your storage usage

## Tech Stack

### Frontend
- React with TypeScript
- React Router for navigation
- Axios for API calls
- Lucide React for icons
- CSS with CSS Variables for theming

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- bcrypt for password hashing
- AWS S3 integration (ready for implementation)

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Database Setup

1. Install PostgreSQL if you haven't already
2. Create a database named `sorta_db`:
```bash
createdb sorta_db
```

3. Run the schema file to create tables:
```bash
psql -d sorta_db -f server/schema.sql
```

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update the `.env` file with your database credentials and secrets

4. Install dependencies (from project root):
```bash
npm install
```

5. Start the backend server:
```bash
npx ts-node server/index.ts
```

The server will run on `http://localhost:5000`

### Frontend Setup

1. The dependencies are already installed from project setup

2. Start the React development server:
```bash
npm start
```

The app will run on `http://localhost:3000`

## Project Structure

```
sorta/
├── public/
├── server/
│   ├── routes/
│   │   └── auth.ts          # Authentication routes
│   ├── db.ts                # Database connection
│   ├── index.ts             # Express server
│   ├── schema.sql           # Database schema
│   └── .env                 # Environment variables
├── src/
│   ├── components/
│   │   ├── AIActivityIndicator.tsx
│   │   ├── FilePreview.tsx
│   │   ├── FileTree.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── UploadModal.tsx
│   ├── context/
│   │   ├── AuthContext.tsx  # Authentication state
│   │   └── ThemeContext.tsx # Theme management
│   ├── pages/
│   │   ├── Dashboard.tsx    # Main app view
│   │   ├── Login.tsx        # Login page
│   │   └── Register.tsx     # Registration page
│   ├── App.tsx              # Main app component
│   ├── index.tsx            # Entry point
│   └── index.css            # Global styles & theme
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Future Endpoints (To be implemented)
- `GET /api/files` - Get user files
- `POST /api/files/upload` - Upload file
- `DELETE /api/files/:id` - Delete file
- `GET /api/folders` - Get user folders
- `POST /api/folders` - Create folder

## Design Philosophy

Sorta is designed to be:
- **Calm**: Non-intrusive AI that works quietly in the background
- **Intelligent**: Smart file organization based on content and context
- **Minimal**: Clean interface with only essential elements
- **Trustworthy**: Clear explanations of AI actions
- **Fast**: Quick uploads and responsive interface

## Color Palette

### Light Theme
- Primary: `#5b7fff` (Blue)
- Background: `#ffffff` / `#f8f9fa`
- Text: `#212529` / `#495057`

### Dark Theme
- Primary: `#6b85ff` (Lighter Blue)
- Background: `#1a1d24` / `#141720`
- Text: `#e9ecef` / `#adb5bd`

## Next Steps

1. **Implement AWS S3 Integration**
   - Add file upload to S3
   - Generate signed URLs for downloads
   - Implement file deletion from S3

2. **Add AI Sorting Logic**
   - Integrate with OpenAI or similar API
   - Analyze file descriptions
   - Suggest folder placements

3. **Complete File Management**
   - Real file CRUD operations
   - Folder management
   - File search functionality

4. **Enhanced Features**
   - File sharing
   - Starred files
   - Recent files view
   - Trash/recovery system

## Development

To run both frontend and backend together, you can use two terminal windows:

Terminal 1 (Backend):
```bash
npx ts-node server/index.ts
```

Terminal 2 (Frontend):
```bash
npm start
```

## License

MIT

## Contributors

Built for McHacks13
