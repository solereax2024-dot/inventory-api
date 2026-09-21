# 🎮 Gamification System Guide

## Overview

The Sole Reax PH gamification system enables customers to earn points and badges without requiring signup. Customers can optionally set a username to track their progress and redeem rewards.

---

## 🚀 Quick Start

### For Customers

1. **Set Username** (Optional)
   - Click "🎮 Set Username" in the header
   - Enter any username you prefer
   - Username is stored locally (in browser)

2. **Earn Points**
   - **Daily Spin Wheel**: Spin once per day → 5-30 points
   - **Make Purchase**: Each purchase earns 1 point per ₱10 spent
   - **Leave Review**: 5-star review → 20 points bonus
   - **Refer Friends**: Each successful referral → 50 points

3. **Unlock Badges**
   - Automatic badges appear as you reach milestones
   - Each badge awards bonus points
   - View your badges in the profile panel

4. **Redeem Points**
   - 100 points ≈ ₱10 discount
   - Use points during checkout

5. **View Leaderboard**
   - See top 10 players by points at `/gamification`

---

## 🎯 Badge System

### Available Badges

| Badge | Icon | Condition | Bonus Points |
|-------|------|-----------|-------------|
| Sneakerhead | 🥾 | Buy 5+ items | +50 |
| Collector | 👟 | Buy all colors of one shoe | +30 |
| 5-Star Reviewer | ⭐ | Leave a 5-star review | +20 |
| Early Bird | 🎯 | Make purchase on first day | +15 |
| Gift Giver | 💝 | Refer 3+ friends | +75 |

---

## 📱 Frontend Components

### 1. GamificationBar (`GamificationBar.jsx`)
- **Location**: Header (always visible)
- **Features**:
  - Username setup
  - Points balance display
  - Badge counter
  - Profile popup showing detailed stats

**Usage**:
```jsx
import { GamificationBar } from "../../components/gamification";

<GamificationBar />
```

### 2. SpinWheel (`SpinWheel.jsx`)
- **Location**: `/gamification` page
- **Features**:
  - Daily spin wheel (once per day)
  - Animated wheel with rewards
  - Result notification

**Rewards**:
- 5, 10, 15, 20, 25, 10, 15, 30 points

### 3. CheckPointsWidget (`CheckPointsWidget.jsx`)
- **Location**: Header + Gamification page (prominent button)
- **Features**:
  - Enter any username to check points (no permanent set)
  - View detailed stats (purchases, reviews, referrals)
  - See all badges (earned & locked)
  - Show points-to-discount calculation
  - Clean modal interface

### 4. GamificationPage (`GamificationPage.jsx`)
- **Route**: `/gamification`
- **Features**:
  - Check Points widget (hero section)
  - Spin wheel
  - How it works guide
  - Badge info
  - Points table
  - Leaderboard info

### 4. AdminGamificationSection (`AdminGamificationSection.jsx`)
- **Location**: Admin dashboard
- **Features**:
  - View all customers
  - See leaderboard
  - Check points/purchases/reviews

---

## 🔧 Backend APIs

### Public Endpoints (No Auth Required)

#### Get Customer Profile
```
GET /api/public/gamification/profile?username=john_doe
Response:
{
  "id": 1,
  "username": "john_doe",
  "pointsBalance": 250,
  "totalPointsEarned": 500,
  "purchasesCount": 5,
  "reviewsCount": 2,
  "referralsCount": 1,
  "unlockedBadgesCount": 2,
  "badges": [
    {
      "id": 1,
      "code": "SNEAKERHEAD",
      "name": "Sneakerhead",
      "iconEmoji": "🥾",
      "pointsReward": 50,
      "earned": true
    }
  ]
}
```

#### Spin Wheel
```
POST /api/public/gamification/spin?username=john_doe
Response:
{
  "pointsEarned": 20,
  "message": "🎉 You won 20 points!",
  "newBalance": 270
}
```

#### Record Purchase
```
POST /api/public/gamification/record-purchase?username=john_doe&points=10
(Call after successful order)
```

#### Record Review
```
POST /api/public/gamification/record-review?username=john_doe&rating=5
(Call after customer leaves review)
```

#### Record Referral
```
POST /api/public/gamification/record-referral?username=john_doe
(Call when referred friend makes purchase)
```

#### Redeem Points
```
POST /api/public/gamification/redeem?username=john_doe&points=100
Response:
{
  "message": "Points redeemed successfully!"
}
```

#### Get Leaderboard
```
GET /api/public/gamification/leaderboard
Response: [{ customer1 }, { customer2 }, ...]
```

---

### Admin Endpoints (Auth Required)

#### Get All Customers
```
GET /api/admin/gamification/customers
(Requires admin token)
```

#### Get Customer Details
```
GET /api/admin/gamification/customers/{username}
```

#### Get Leaderboard
```
GET /api/admin/gamification/leaderboard
```

#### Award Points to Customer
```
POST /api/admin/gamification/customers/{username}/award-points?points=50
```

#### Reset Customer Points
```
DELETE /api/admin/gamification/customers/{username}/points
```

#### Get All Badge Definitions
```
GET /api/admin/gamification/badges
```

#### Create/Update Badge
```
POST /api/admin/gamification/badges
Body: {
  "code": "CUSTOM_BADGE",
  "name": "Custom Badge",
  "description": "...",
  "iconEmoji": "🎯",
  "conditionType": "PURCHASES",
  "conditionThreshold": 10,
  "pointsReward": 75,
  "active": true
}
```

---

## 💾 Database Schema

### Tables

1. **customer_profiles**
   - Stores customer username, points, and counters
   - No authentication required

2. **badge_definitions**
   - Predefined badge types
   - Condition logic (PURCHASES, REVIEWS, REFERRALS, EARLY_BIRD)

3. **customer_badges**
   - Links customers to earned badges
   - Tracks when each badge was earned

4. **daily_activities**
   - Records all point-earning activities
   - Activity type, points earned, date

5. **points_redemptions**
   - Tracks when points are redeemed
   - Redemption type and amount

---

## 🔄 Integration Steps

### 1. After Purchase
```javascript
// Call after successful order creation
const username = localStorage.getItem("customerUsername");
if (username) {
  const points = Math.floor(orderTotal / 10); // 1 point per ₱10
  await apiRequest(`/api/public/gamification/record-purchase?username=${username}&points=${points}`, {
    method: "POST"
  });
}
```

### 2. After Review
```javascript
// Call after customer submits product review
const username = localStorage.getItem("customerUsername");
if (username && rating === 5) {
  await apiRequest(`/api/public/gamification/record-review?username=${username}&rating=${rating}`, {
    method: "POST"
  });
}
```

### 3. Referral Link
```javascript
// Share this link with friends
const referralLink = `https://solereax.com/collections?ref=${username}`;

// When friend purchases, call:
await apiRequest(`/api/public/gamification/record-referral?username=${username}`, {
  method: "POST"
});
```

---

## 📊 Example Scenarios

### Scenario 1: New Customer Makes First Purchase
1. Customer enters username: "sneakerhead_123"
2. Makes ₱500 purchase → 50 points earned
3. Purchase is on first day → Unlocks "Early Bird" badge (+15 bonus)
4. Profile now shows: 65 points, 1 badge unlocked

### Scenario 2: Customer Leaves 5-Star Review
1. Customer leaves 5-star review on product
2. System records: +20 points for review
3. If this is their 1st 5-star review → Unlocks "5-Star Reviewer" badge
4. Total: 20 + 20 (badge bonus) = 40 points earned

### Scenario 3: Customer Reaches Milestone
1. After 5th purchase → Unlocks "Sneakerhead" badge (+50 bonus)
2. Previous points: 100
3. New points: 100 + 50 = 150 points
4. Can now redeem for discount

---

## 🛠️ Development Notes

### Frontend
- Uses React hooks (useState, useEffect)
- Stores username in localStorage: `customerUsername`
- All API calls via `apiRequest()` utility
- Responsive CSS for mobile and desktop

### Backend
- Spring Boot REST controllers
- JPA repositories for database
- Service layer for business logic
- Automatic badge checking on point changes
- Database migrations with Flyway

### Testing
- Test username setup
- Test daily spin (once per day limit)
- Test badge unlocking at thresholds
- Test points redemption
- Test leaderboard sorting

---

## 🎨 Customization

### Add New Badge
1. Go to Admin Dashboard
2. Click "Create Badge"
3. Fill in:
   - Code: `BADGE_CODE`
   - Name: Display name
   - Icon: Emoji
   - Condition: Type and threshold
   - Bonus Points: Reward amount

### Adjust Point Values
Edit in `GamificationService.java`:
```java
private static final int[] SPIN_WHEEL_REWARDS = {5, 10, 15, 20, 25, 10, 15, 30};
// Modify rewards array and redemption rates
```

### Change Spin Frequency
```java
private static final int SPIN_WHEEL_DAILY_LIMIT = 1; // Change to allow multiple spins
```

---

## 📝 Files Structure

```
frontend/
├── src/
| │   ├── components/
| │   │   ├── gamification/
| │   │   │   ├── GamificationBar.jsx
| │   │   │   ├── GamificationBar.css
| │   │   │   ├── SpinWheel.jsx
| │   │   │   ├── SpinWheel.css
| │   │   │   ├── CheckPointsWidget.jsx
| │   │   │   ├── CheckPointsWidget.css
| │   │   │   └── index.js
| │   │   └── admin/
│   │       ├── AdminGamificationSection.jsx
│   │       └── AdminGamification.css
│   ├── pages/
│   │   └── customer/
│   │       ├── GamificationPage.jsx
│   │       └── GamificationPage.css
│   └── App.jsx (updated)

backend/
├── src/main/java/com/solereax/inventory/gamification/
│   ├── CustomerProfile.java
│   ├── CustomerProfileRepository.java
│   ├── BadgeDefinition.java
│   ├── BadgeDefinitionRepository.java
│   ├── CustomerBadge.java
│   ├── CustomerBadgeRepository.java
│   ├── DailyActivity.java
│   ├── DailyActivityRepository.java
│   ├── PointsRedemption.java
│   ├── PointsRedemptionRepository.java
│   ├── GamificationService.java
│   ├── PublicGamificationController.java
│   ├── AdminGamificationController.java
│   └── dto/
│       ├── BadgeDTO.java
│       ├── CustomerProfileDTO.java
│       └── SpinWheelResultDTO.java
└── src/main/resources/db/migration/
    └── V39__create_gamification_schema.sql
```

---

## ✅ Checklist

- [x] Database schema created
- [x] Entity classes created
- [x] Repositories created
- [x] Service layer implemented
- [x] Public APIs created
- [x] Admin APIs created
- [x] Frontend components created
- [x] Responsive styling
- [x] Route added to App.jsx
- [x] GamificationBar integrated in header
- [x] Documentation

---

## 🚀 Deployment

1. Run database migrations: `mvn flyway:migrate`
2. Build backend: `mvn clean package`
3. Frontend builds automatically with Maven
4. Deploy to production

---

## 📞 Support

For issues or questions, check:
- Backend logs for API errors
- Browser console for frontend issues
- Database for data integrity

Happy gamifying! 🎮✨

