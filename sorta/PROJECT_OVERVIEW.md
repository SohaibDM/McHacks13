# Sorta - Project Overview

## What is Sorta?

Sorta is an intelligent cloud storage system designed for McHacks13. It combines the familiarity of Google Drive with AI-powered automatic file organization. When users upload files, they can optionally provide a description, and the AI agent will determine the best location for that file.

## Key Features Implemented

### ✅ User Authentication
- Registration with email, password, and name
- Login with JWT token authentication
- Protected routes (dashboard only accessible when logged in)
- Session persistence with localStorage
- PostgreSQL database for user storage

### ✅ Beautiful UI/UX
- **Dual Themes**: Light and dark mode with smooth transitions
- **Calm Design**: Minimal, professional interface with subtle accents
- **Color Palette**: Blue accent (#5b7fff) that's friendly and trustworthy
- **Responsive Layout**: Sidebar, file tree, and preview panel

### ✅ File Management Interface
- **File Tree View**: Hierarchical folder/file structure with expand/collapse
- **File Preview Panel**: Detailed view with metadata and AI insights
- **Smart Icons**: Different icons for different file types
- **Mock Data**: Sample files and folders to demonstrate functionality

### ✅ AI Integration (UI Ready)
- **AI Sort Toggle**: Users can enable/disable AI sorting during upload
- **Description Input**: Optional description helps AI make better decisions
- **AI Badges**: Visual indicators showing which files were AI-sorted
- **AI Reasoning**: Explanations for why files were placed where they are
- **Activity Indicators**: Non-intrusive notifications showing AI working

### ✅ Upload System (UI Complete)
- Modal interface for file uploads
- Toggle for AI smart sort
- Description field for context
- Manual folder selection when AI sort is off
- Visual feedback during upload

## Technical Architecture

### Frontend Stack
```
React 19 + TypeScript
├── React Router 7 (Navigation)
├── Context API (State Management)
│   ├── AuthContext (User authentication)
│   └── ThemeContext (Dark/Light mode)
├── Lucide React (Icons)
└── CSS Variables (Theming)
```

### Backend Stack
```
Node.js + Express + TypeScript
├── PostgreSQL (Database)
│   ├── Users table
│   ├── Folders table
│   └── Files table
├── JWT (Authentication)
├── bcrypt (Password hashing)
└── Ready for AWS S3 integration
```

## Database Schema

### Users Table
- id (serial primary key)
- email (unique, not null)
- password (hashed, not null)
- name (not null)
- created_at, updated_at (timestamps)

### Folders Table
- id (serial primary key)
- user_id (foreign key to users)
- name (not null)
- parent_id (foreign key to folders, for nesting)
- path (not null)
- created_at, updated_at (timestamps)

### Files Table
- id (serial primary key)
- user_id (foreign key to users)
- folder_id (foreign key to folders)
- name, original_name (not null)
- description (text)
- s3_key, s3_url (not null, for AWS S3)
- size, mime_type
- ai_sorted (boolean)
- ai_reason (text, explanation from AI)
- created_at, updated_at (timestamps)

## Component Structure

```
src/
├── components/
│   ├── Header.tsx              - Top navigation with search & theme toggle
│   ├── Sidebar.tsx             - Left sidebar with navigation & storage info
│   ├── FileTree.tsx            - File/folder tree with expand/collapse
│   ├── FilePreview.tsx         - Right panel showing file details
│   ├── UploadModal.tsx         - Upload interface with AI sort option
│   └── AIActivityIndicator.tsx - Bottom-right activity notifications
│
├── pages/
│   ├── Login.tsx               - Login form
│   ├── Register.tsx            - Registration form
│   └── Dashboard.tsx           - Main app interface
│
├── context/
│   ├── AuthContext.tsx         - Authentication state & methods
│   └── ThemeContext.tsx        - Theme (dark/light) management
│
└── App.tsx                     - Router & protected routes
```

## API Endpoints

### Currently Implemented
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout user

### Ready to Implement
- `GET /api/files` - Get user's files
- `POST /api/files/upload` - Upload file to S3
- `PUT /api/files/:id` - Update file metadata
- `DELETE /api/files/:id` - Delete file
- `GET /api/folders` - Get user's folders
- `POST /api/folders` - Create new folder
- `DELETE /api/folders/:id` - Delete folder

## Design Philosophy

### Colors
**Light Theme**
- Background: #ffffff, #f8f9fa
- Text: #212529, #495057
- Accent: #5b7fff (Blue)
- AI Badge: Light blue with blue text

**Dark Theme**
- Background: #1a1d24, #141720
- Text: #e9ecef, #adb5bd
- Accent: #6b85ff (Lighter blue)
- AI Badge: Dark blue with light blue text

### Typography
- System fonts for speed and familiarity
- Clear hierarchy with font weights
- Readable sizes (0.875rem - 1.5rem)

### Spacing
- Consistent padding/margins (0.5rem increments)
- Generous whitespace for clarity
- Comfortable touch targets (44px+)

### Interactions
- Smooth transitions (0.2s - 0.3s)
- Hover states on all interactive elements
- Visual feedback for all actions
- Non-intrusive animations

## What's Next?

### Immediate Priorities
1. **AWS S3 Integration**
   - Set up S3 bucket
   - Implement file upload to S3
   - Generate presigned URLs for downloads
   - Handle file deletion from S3

2. **AI Integration**
   - Connect to OpenAI API or similar
   - Analyze file descriptions
   - Generate folder suggestions
   - Provide reasoning for placements

3. **Real File Operations**
   - Complete CRUD operations for files
   - Complete CRUD operations for folders
   - Connect frontend to backend APIs
   - Real-time updates after uploads

### Future Enhancements
- File sharing (public/private links)
- Search functionality
- Starred/favorite files
- Recent files view
- Trash with recovery
- File versioning
- Bulk operations
- Mobile responsive design
- Progressive Web App (PWA)

## Development Workflow

### Starting Development
```bash
# Install dependencies
npm install

# Setup database (see QUICKSTART.md)
createdb sorta_db
psql -d sorta_db -f server/schema.sql

# Run both frontend and backend
npm run dev

# Or separately
npm run server  # Backend on :5000
npm start       # Frontend on :3000
```

### Testing the App
1. Visit http://localhost:3000
2. Register a new account
3. Login with credentials
4. Toggle dark/light theme
5. Explore the file tree
6. Click on files to preview
7. Watch for AI activity notifications
8. Click upload to see the modal

## Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sorta_db
DB_USER=postgres
DB_PASSWORD=postgres
```

### Future Variables
```env
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=sorta-files
OPENAI_API_KEY=your-openai-key
```

## Security Considerations

### Implemented
- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ HTTP-only cookies (configured)
- ✅ CORS protection
- ✅ SQL injection protection (parameterized queries)

### To Implement
- Rate limiting on auth endpoints
- File type validation
- File size limits
- Virus scanning for uploads
- HTTPS in production
- Environment variable validation
- Input sanitization
- CSP headers

## Performance Optimization

### Current
- CSS variables for instant theme switching
- React.memo potential for file tree
- Lazy loading for routes
- Debounced search (ready to implement)

### Future
- Virtual scrolling for large file lists
- Image thumbnails
- Caching strategies
- Code splitting
- Service worker for offline support
- CDN for static assets

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Modern browsers with ES6+ support

## License

MIT - Built for McHacks13

## Credits

Built with ❤️ using:
- React & TypeScript
- Express & PostgreSQL
- Lucide React for icons
- Create React App
