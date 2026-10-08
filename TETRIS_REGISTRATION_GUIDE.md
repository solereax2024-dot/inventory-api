# Tetris Game Registration System - Implementation Guide

## Overview
A complete user registration and authentication system for Tetris game with profile image upload, requiring users to register before playing.

## 📋 Features Implemented

### 1. **Registration Modal Popup**
- Beautiful neon-themed registration form
- Full Name field
- Profile Picture upload (Facebook screenshot for authenticity)
- Username field
- Password field (min 6 characters)
- Form validation and error handling
- Loading states and success messages

### 2. **Backend Registration Endpoint**
- **Endpoint:** `POST /api/auth/register`
- **Type:** Multipart form data
- **Parameters:**
  - `fullName` (required, min 2 chars)
  - `username` (required, min 3 chars, unique)
  - `password` (required, min 6 chars)
  - `profileImage` (optional, max 5MB)

### 3. **Database Schema Updates**
- Added columns to `app_users` table:
  - `full_name VARCHAR(255)` - User's full name
  - `profile_image_path VARCHAR(500)` - Path to uploaded image
  - `profile_image_filename VARCHAR(255)` - Original filename

### 4. **Authentication Protection**
- Users must register/login before accessing Tetris game
- JWT token-based authentication
- localStorage persistence of auth state
- Automatic session recovery on page reload

### 5. **Profile Image Handling**
- File upload validation (image only, max 5MB)
- Unique filename generation using UUID
- Secure storage in `/uploads/profile-images/`
- Automatic serving via existing MediaResourceConfig

## 🔧 Technical Stack

### Backend (Java)
- **AuthController.java** - Registration & login endpoints
- **RegistrationRequest.java** - DTO for registration input
- **RegistrationResponse.java** - DTO for registration response
- **AppUser.java** - Updated with profile fields
- **Database Migration** - V42__add_tetris_user_profile_fields.sql

### Frontend (React)
- **TetrisRegistrationModal.jsx** - Registration form component
- **TetrisRegistrationModal.css** - Neon-themed styling
- **useTetrisAuth.js** - Custom hook for auth state management
- **TetrisGameWrapper.jsx** - Auth protection wrapper
- **TetrisGamePage.jsx** - Updated with auth wrapper

## 📁 File Structure

```
Backend Files:
├── src/main/java/com/solereax/inventory/auth/
│   ├── AuthController.java (updated)
│   ├── RegistrationRequest.java (new)
│   └── RegistrationResponse.java (new)
├── src/main/java/com/solereax/inventory/user/
│   └── AppUser.java (updated)
├── src/main/resources/db/migration/
│   └── V42__add_tetris_user_profile_fields.sql (new)
└── src/main/resources/
    └── application.yaml (updated)

Frontend Files:
├── src/components/tetris/
│   ├── TetrisRegistrationModal.jsx (new)
│   ├── TetrisRegistrationModal.css (new)
│   ├── TetrisGameWrapper.jsx (new)
│   └── TetrisGamePage.jsx (updated)
├── src/hooks/
│   └── useTetrisAuth.js (new)
```

## 🚀 How It Works

### User Registration Flow

1. **User Visits Tetris Page**
   - `TetrisGamePage` is rendered with `TetrisGameWrapper`
   - Wrapper checks authentication status via `useTetrisAuth` hook

2. **Not Authenticated?**
   - `TetrisRegistrationModal` displays as fullscreen popup
   - Cannot close (onClose is null)
   - User must complete registration

3. **User Submits Form**
   - Frontend validates input
   - Sends multipart form data to `/api/auth/register`
   - Server validates and creates user account
   - Profile image is saved to disk with unique UUID filename

4. **Successful Registration**
   - JWT token returned from backend
   - Token + user info stored in localStorage
   - `useTetrisAuth.login()` called
   - Modal closes and Tetris game loads

5. **Subsequent Visits**
   - Token from localStorage automatically restores session
   - User sees Tetris game directly without registration

### Playing the Game

```javascript
// Before Game Loads:
- User must be registered (have valid token)
- Token stored in localStorage as "tetris_token"
- Username stored as "tetris_username"
- Full name stored as "tetris_fullName"

// Game Features:
- Player name/username displayed
- Profile picture stored for verification
- Scores tracked per user
- Leaderboard rankings based on registration

```

## ⚙️ Configuration

### Environment Variables (Optional)
```bash
# Profile images upload directory
PROFILE_IMAGES_UPLOAD_DIR=uploads/profile-images

# File upload limits (in application.yaml)
max-file-size: 5MB
max-request-size: 5MB
```

### Database
- Migration automatically runs on application startup
- Adds new columns to existing `app_users` table
- Backward compatible with existing users

## 🔐 Security Features

1. **Password Encryption**
   - Passwords hashed using Spring Security's PasswordEncoder
   - Never stored in plain text

2. **JWT Tokens**
   - Time-limited authentication tokens
   - Expiration configurable via environment

3. **File Upload Validation**
   - File type validation (images only)
   - File size limits (5MB max)
   - UUID-based filename to prevent conflicts

4. **Input Validation**
   - Server-side validation on all fields
   - Username uniqueness enforced at database level
   - Email-like validation patterns available

## 📱 Responsive Design

- ✅ Works on desktop (up to 520px width)
- ✅ Mobile optimized (340px+)
- ✅ Touch-friendly image upload
- ✅ Adaptive form layout
- ✅ Neon theme scales across devices

## 🧪 Testing the Feature

### Manual Testing

1. **Start Application**
   ```bash
   # Terminal 1: Start backend
   cd /Users/Domingo/Documents/inventory-api
   ./mvnw spring-boot:run
   
   # Terminal 2: Start frontend (if dev mode)
   cd frontend
   npm run dev
   ```

2. **Navigate to Tetris Page**
   - Go to `/tetris` or relevant game page
   - Should see registration modal

3. **Register New User**
   - Fill in Full Name (e.g., "John Doe")
   - Upload a JPG/PNG image
   - Choose username (e.g., "john_player")
   - Enter password (min 6 chars)
   - Click "Create Account & Play"

4. **Verify Registration**
   - Modal should close after success
   - Game should load
   - Username displays in game header
   - Player can start playing

5. **Test Session Persistence**
   - Refresh page
   - Should skip registration and show game
   - Session should be maintained

### API Testing with cURL

```bash
# Register new user
curl -X POST http://localhost:8080/api/auth/register \
  -F "fullName=John Doe" \
  -F "username=john_player" \
  -F "password=password123" \
  -F "profileImage=@/path/to/image.jpg"

# Response:
{
  "message": "Registration successful",
  "username": "john_player",
  "fullName": "John Doe",
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "role": "CUSTOMER"
}

# Login with credentials
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_player",
    "password": "password123"
  }'
```

## 🐛 Troubleshooting

### Issue: "Username already exists"
- **Cause:** Username is already registered
- **Solution:** Choose a different username

### Issue: "Profile image upload failed"
- **Cause:** File too large or wrong format
- **Solution:** Use JPG/PNG under 5MB

### Issue: Registration button disabled
- **Cause:** Form has validation errors
- **Solution:** Check all required fields are filled

### Issue: Token not persisting
- **Cause:** localStorage disabled or cleared
- **Solution:** Check browser settings, enable localStorage

### Issue: Images not serving
- **Cause:** Upload directory permissions
- **Solution:** Ensure `/uploads/profile-images/` is readable

## 📊 Database Schema

```sql
-- Updated app_users table structure
CREATE TABLE app_users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),                    -- NEW
  profile_image_path VARCHAR(500),          -- NEW
  profile_image_filename VARCHAR(255),      -- NEW
  role VARCHAR(20) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 Next Steps

### Optional Enhancements
1. **Email Verification**
   - Send verification email on registration
   - Require email confirmation before playing

2. **Social Login**
   - Google/Facebook OAuth integration
   - Automatic profile picture from social media

3. **Profile Management**
   - User profile page
   - Change password
   - Update profile picture

4. **User Statistics**
   - Total games played
   - Best scores
   - Play history
   - Achievements/badges

5. **Admin Panel**
   - Manage user accounts
   - View registration analytics
   - Disable/ban users

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the code comments in implementation files
3. Check browser console for error messages
4. Check server logs for backend errors

## ✅ Checklist

- [x] Database migration created
- [x] Backend registration endpoint implemented
- [x] Frontend registration modal created
- [x] Authentication protection added
- [x] Profile image upload working
- [x] Frontend/Backend builds successfully
- [x] Documentation completed

**Status:** ✅ Ready for Deployment

