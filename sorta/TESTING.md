# Sorta - Testing Guide

## Manual Testing Checklist

### 1. Authentication Flow

#### Registration
- [ ] Navigate to http://localhost:3000/register
- [ ] Enter name: "Test User"
- [ ] Enter email: "test@example.com"
- [ ] Enter password: "password123"
- [ ] Confirm password: "password123"
- [ ] Click "Sign up"
- [ ] Should redirect to dashboard
- [ ] User name should appear in header

#### Login
- [ ] Log out using logout button in header
- [ ] Should redirect to login page
- [ ] Enter email: "test@example.com"
- [ ] Enter password: "password123"
- [ ] Click "Sign in"
- [ ] Should redirect to dashboard
- [ ] User session should persist on page refresh

#### Error Handling
- [ ] Try registering with existing email - should show error
- [ ] Try login with wrong password - should show error
- [ ] Try password mismatch on registration - should show error
- [ ] Try password less than 6 characters - should show error

### 2. Theme System

#### Light/Dark Toggle
- [ ] Click sun/moon icon in header
- [ ] Theme should switch smoothly
- [ ] All colors should update
- [ ] Theme preference should persist on refresh
- [ ] Check that all components look good in both themes:
  - [ ] Login/Register pages
  - [ ] Header
  - [ ] Sidebar
  - [ ] File Tree
  - [ ] File Preview
  - [ ] Upload Modal
  - [ ] AI Activity Indicator

### 3. UI Components

#### Header
- [ ] Logo displays "Sorta"
- [ ] Search bar is present (not functional yet)
- [ ] Upload button is visible
- [ ] Theme toggle works
- [ ] User name displays correctly
- [ ] Logout button works

#### Sidebar
- [ ] "My Files" shows as active
- [ ] Other menu items are visible:
  - [ ] Starred
  - [ ] Recent
  - [ ] Trash
- [ ] Storage info displays
- [ ] Storage bar shows 35% usage
- [ ] Text reads "3.5 GB of 10 GB used"

#### File Tree
- [ ] Folders display with folder icon
- [ ] Files display with appropriate icons
- [ ] Clicking folder expands/collapses children
- [ ] AI badges appear on AI-sorted files
- [ ] Hovering AI badge shows reasoning (title attribute)
- [ ] Tree indentation works correctly
- [ ] Scrolling works with many items

#### File Preview
- [ ] Initially shows empty state with message
- [ ] Clicking file shows preview
- [ ] File name displays correctly
- [ ] File type shows
- [ ] File size shows
- [ ] Dates display (Modified, Created)
- [ ] AI section appears for AI-sorted files
- [ ] AI reason displays
- [ ] Suggested location shows
- [ ] Action buttons work:
  - [ ] Download button (no action yet)
  - [ ] Share button (no action yet)
  - [ ] Delete button (no action yet)

### 4. Upload Modal

#### Opening Modal
- [ ] Click "Upload" button in header
- [ ] Modal appears with overlay
- [ ] Clicking outside modal closes it
- [ ] X button closes modal

#### File Selection
- [ ] Click upload area to select file
- [ ] File name displays after selection
- [ ] File size displays after selection

#### Description Field
- [ ] Can type description
- [ ] Placeholder text is helpful
- [ ] Field is optional

#### AI Sort Toggle
- [ ] Toggle is on by default
- [ ] Clicking toggle switches state
- [ ] When off, folder selection appears
- [ ] When on, AI section shows

#### Upload Actions
- [ ] Cancel button closes modal
- [ ] Upload button is disabled without file
- [ ] Upload button shows "Uploading..." during upload
- [ ] Modal closes after successful upload

### 5. AI Activity Indicator

#### Appearance
- [ ] Wait 3 seconds after page load
- [ ] Indicator appears in bottom-right
- [ ] Shows "AI Activity" header with sparkle icon
- [ ] Activity message displays

#### Behavior
- [ ] Spinner shows for processing activities
- [ ] Check mark shows for completed activities
- [ ] Indicator fades away after 5 seconds
- [ ] Multiple activities can stack (max 3 visible)
- [ ] Indicator reappears with new activities

#### Sample Messages
Look for these messages appearing:
- [ ] "Analyzing 'Financial Report Q4.pdf'..."
- [ ] "Moving 'Vacation Photos.jpg' to Personal/Photos"
- [ ] "Organizing recent downloads..."
- [ ] "Creating 'Tax Documents 2026' folder"
- [ ] "Sorted 3 files into Work/Projects"

### 6. Responsive Behavior

#### Layout
- [ ] Dashboard has proper spacing
- [ ] Components don't overflow
- [ ] Scrolling works where needed
- [ ] No horizontal scrolling on page

#### Visual Polish
- [ ] Borders are consistent
- [ ] Border radius is consistent (8-12px)
- [ ] Shadows are subtle
- [ ] Colors are harmonious
- [ ] Transitions are smooth (0.2-0.3s)
- [ ] Hover states work on all interactive elements

### 7. Database Operations

#### Check Database
```bash
# Connect to database
psql -U postgres -d sorta_db

# Check users table
SELECT * FROM users;

# Should see your registered user
# Password should be hashed

# Check folders table
SELECT * FROM folders;

# Should see root folder for your user

# Exit
\q
```

#### Verify Tables Exist
- [ ] users table
- [ ] folders table
- [ ] files table
- [ ] All indexes created
- [ ] All triggers created

### 8. API Endpoints

#### Test with curl or Postman

**Register**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"api@test.com","password":"test123","name":"API Test"}'
```

**Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"api@test.com","password":"test123"}'
```

**Get Current User**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Health Check**
```bash
curl http://localhost:5000/api/health
```

### 9. Browser Console

#### Check for Errors
- [ ] Open browser DevTools (F12)
- [ ] Go to Console tab
- [ ] Should see no errors
- [ ] Backend logs should show:
  - [ ] "✅ Connected to PostgreSQL database"
  - [ ] "🚀 Server running on port 5000"

#### Network Tab
- [ ] API calls to /api/auth/* succeed
- [ ] Response codes are appropriate:
  - [ ] 201 for registration
  - [ ] 200 for login
  - [ ] 401 for invalid credentials
  - [ ] 400 for validation errors

### 10. Security Checks

#### Password Handling
- [ ] Passwords not visible in UI
- [ ] Passwords hashed in database
- [ ] Can't log in with wrong password

#### Token Handling
- [ ] Token stored in localStorage
- [ ] Token sent with API requests
- [ ] Protected routes redirect when not authenticated
- [ ] Can't access dashboard without login

#### CORS
- [ ] Frontend can make requests to backend
- [ ] CORS headers properly configured

## Performance Checks

### Page Load
- [ ] Initial load is fast (< 2 seconds)
- [ ] No layout shift
- [ ] Theme applies immediately

### Interactions
- [ ] Button clicks are responsive
- [ ] Theme toggle is instant
- [ ] File tree expand/collapse is smooth
- [ ] Modal open/close is smooth

### Animations
- [ ] AI activity indicator slides in smoothly
- [ ] Upload modal has smooth backdrop
- [ ] Hover states have smooth transitions

## Known Limitations (By Design)

These are features not yet implemented:
- ❌ Actual file uploads to S3
- ❌ Real AI sorting logic
- ❌ Search functionality
- ❌ File download/delete/share
- ❌ Folder creation/deletion
- ❌ Starred/Recent/Trash views
- ❌ File preview thumbnails
- ❌ Real storage calculations

## Bug Report Template

If you find issues, report using this format:

**Issue**: [Brief description]

**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected**: [What should happen]

**Actual**: [What actually happened]

**Environment**:
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- Theme: [Light/Dark]

**Console Errors**: [Any errors from browser console]

**Screenshots**: [If applicable]

## Test Results Summary

Date: _____________

Tester: _____________

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Authentication | ☐ | ☐ | |
| Theme System | ☐ | ☐ | |
| UI Components | ☐ | ☐ | |
| Upload Modal | ☐ | ☐ | |
| AI Activity | ☐ | ☐ | |
| Database | ☐ | ☐ | |
| API Endpoints | ☐ | ☐ | |
| Security | ☐ | ☐ | |

**Overall Assessment**: _______________

**Critical Issues**: ___________________

**Recommendations**: __________________
