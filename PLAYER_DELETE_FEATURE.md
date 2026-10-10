# Player Delete Feature - Implementation Summary

## Overview
Added delete functionality for players on the admin page's Giveaway/Gaming section. Admins can now:
1. **Delete individual players** - Remove specific players from the registered players table
2. **Delete all players** - Remove all registered players at once with a confirmation dialog

## Backend Changes

### 1. **TetrisLeaderboardRepository.java**
- **File**: `/src/main/java/com/solereax/inventory/tetris/TetrisLeaderboardRepository.java`
- **Changes**: Added `deleteByPlayerName(String playerName)` method to support deletion of tetris leaderboard data by player username

### 2. **GamingService.java**
- **File**: `/src/main/java/com/solereax/inventory/settings/GamingService.java`
- **Changes**: Added two transactional methods:
  - `deletePlayer(Long userId)` - Deletes a specific player's account and related tetris leaderboard data
  - `deleteAllPlayers()` - Deletes all customer/registered player accounts and their tetris leaderboard data

### 3. **AdminGamingSettingsController.java**
- **File**: `/src/main/java/com/solereax/inventory/settings/AdminGamingSettingsController.java`
- **Changes**: 
  - Added `DeleteMapping` import
  - Added two new REST endpoints:
    - `DELETE /api/admin/settings/gaming/players/{userId}` - Delete a specific player
    - `DELETE /api/admin/settings/gaming/players` - Delete all players

## Frontend Changes

### 1. **RegisteredPlayersTable.jsx**
- **File**: `/frontend/src/pages/admin/components/RegisteredPlayersTable.jsx`
- **Changes**:
  - Added delete state management (`deleteConfirm`) for individual player deletion
  - Updated component props to accept:
    - `onDeletePlayer` - Callback for deleting a specific player
    - `onDeleteAllPlayers` - Callback for deleting all players
    - `isDeletingPlayers` - Loading state flag
  - Added delete button column to the table (13th column)
  - Added "Delete All Players" button in the table header (shown only when players exist)
  - Added confirmation dialog for individual player deletion
  - Updated table header and loading states to accommodate new delete column
  - Both delete buttons are disabled while deletion is in progress

### 2. **AdminPage.jsx**
- **File**: `/frontend/src/pages/admin/AdminPage.jsx`
- **Changes**:
  - Added state management:
    - `isDeletingPlayers` - Track deletion operation status
    - `deleteAllPlayersConfirm` - Confirmation state for bulk deletion
  - Added two new async functions:
    - `deletePlayer(playerId)` - Calls API to delete a specific player and refreshes the players list
    - `requestDeleteAllPlayers()` - Opens confirmation dialog for bulk deletion
    - `confirmDeleteAllPlayers()` - Executes bulk deletion after confirmation
  - Updated `GamingSettingsSection` component call to pass:
    - `onDeletePlayer={deletePlayer}`
    - `onDeleteAllPlayers={confirmDeleteAllPlayers}`
    - `isDeletingPlayers={isDeletingPlayers}`

### 3. **GamingSettingsSection.jsx**
- **File**: `/frontend/src/pages/admin/components/GamingSettingsSection.jsx`
- **Changes**:
  - Updated component props to accept delete-related callbacks:
    - `onDeletePlayer`
    - `onDeleteAllPlayers`
    - `isDeletingPlayers`
  - Added local state for delete confirmation dialog
  - Updated `RegisteredPlayersTable` component call to pass delete callbacks
  - Added delete confirmation modal for "Delete All Players" action

## API Endpoints

### Delete a Single Player
```
DELETE /api/admin/settings/gaming/players/{userId}
Authorization: Bearer {token}

Response:
{
  "message": "Player deleted successfully"
}
```

### Delete All Players
```
DELETE /api/admin/settings/gaming/players
Authorization: Bearer {token}

Response:
{
  "message": "All players deleted successfully"
}
```

## User Experience Flow

### Delete Individual Player
1. Admin navigates to Giveaway section in admin page
2. Registered Players table displays with "Delete" column
3. Admin clicks "Delete" button on a player row
4. Confirmation dialog appears asking to confirm deletion
5. Admin confirms - player account and all related data are deleted
6. Table refreshes and success message is displayed

### Delete All Players
1. Admin navigates to Giveaway section in admin page
2. "Delete All Players" button appears in the table header
3. Admin clicks "Delete All Players" button
4. Confirmation dialog appears warning about permanent deletion
5. Admin confirms - all player accounts and related data are deleted
6. Table refreshes and success message is displayed

## Data Deleted
When a player is deleted, the following are permanently removed:
- Player account (AppUser entity)
- Player tetris leaderboard data (TetrisLeaderboard entity)
- Player bonus proof data (stored in AppUser entity):
  - Follow proof image path and status
  - Review proof image path and status

## Security & Validation
- Deletion is transactional - either all data is deleted or nothing is deleted
- API calls require authentication token
- Operations are performed server-side with proper transaction management
- UI shows loading state while deletion is in progress to prevent duplicate actions

## Testing Recommendations
1. Test deleting a single player and verify all related data is removed
2. Test deleting all players and verify database is cleaned up
3. Test canceling confirmation dialogs
4. Test UI disabling during deletion operations
5. Test error handling for failed deletions
6. Verify success messages appear after deletion
7. Test refresh of player list after deletion

