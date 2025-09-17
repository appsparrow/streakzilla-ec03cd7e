# 🔥 Streakzilla User Flow

## 🎯 **What Streakzilla Is**
A gamified habit tracking app where users form groups ("streaks") to build habits together through:
- **Powers**: Daily habits to track (exercise, reading, meditation, etc.)
- **Gems**: Points earned by completing powers  
- **Lives**: Safety net for missed days
- **Streakmates**: Friends who join your streak challenge

---

## 🚀 **Complete User Journey**

### **1. Landing Experience**
**Route**: `/landing` (default for non-authenticated users)

**What Users See**:
- Hero section explaining Streakzilla's value proposition
- Key features: Build streaks, earn gems, challenge friends
- How it works in 4 simple steps
- Clear call-to-action buttons

**User Actions**:
- Learn about the app
- Click "Start Your Streak Journey" → Goes to `/auth`
- Click "Learn How It Works" → Scrolls to explanation

---

### **2. Authentication**
**Route**: `/auth`

**What Users Can Do**:
- **Sign Up**: Create new account with full name, display name, email, password
- **Sign In**: Log in with existing credentials
- See Streakzilla branding and "Join the ultimate habit challenge" tagline

**After Auth Success**:
- Redirects to `/` (dashboard)

---

### **3. Main Dashboard** 
**Route**: `/` (protected)

**For New Users**:
- Shows empty state with "Create New Streak" and "Join Streak" buttons
- Encourages getting started

**For Existing Users**:
- Shows their active streaks
- Quick actions to create/join more streaks
- Navigation to existing streak dashboards

---

### **4. Create a Streak**
**Route**: `/create-group` (protected)

**What Users Do**:
- Enter streak name
- Set start date (when the challenge begins)
- Set duration (how many days the streak runs)
- Get a unique streak code to share with friends

**After Creation**:
- Automatically navigates to power selection
- Can share streak code with friends

---

### **5. Join a Streak**
**Route**: `/join-group` (protected)

**What Users Do**:
- Enter streak code received from friend
- Join existing streak challenge

**After Joining**:
- Automatically navigates to power selection for that streak

---

### **6. Select Powers (Critical Step)**
**Route**: `/groups/:groupId/habits` (protected)

**What This Accomplishes**:
- Users choose which habits (powers) they want to track
- Search through hundreds of habits or create custom ones
- Filter by difficulty: Hard, Medium, Soft, Custom, All
- Each power has gem values based on difficulty

**Key Rules**:
- **First-time setup**: Must select powers before streak starts
- **Modification window**: Can change powers until `start_date + 3 days`
- **After day 3**: Power selection is locked for consistency

**Power Categories**:
- **Hard**: Exercise, meditation, complex skills (higher gems)
- **Medium**: Reading, journaling, moderate activities  
- **Soft**: Basic wellness, simple habits
- **Custom**: User-created habits

---

### **7. Streak Dashboard**
**Route**: `/groups/:groupId` (protected)

**Before Streak Starts**:
- Shows countdown: "You're All Set! Your streak starts in X days"
- Displays selected powers and total gem potential
- No check-in interface until start date

**During Active Streak**:
- **Daily Check-in**: Mark completed powers, earn gems
- **Progress Tracking**: 7-day visual progress chart
- **Streak Stats**: Current streak count, total gems earned, lives remaining
- **Leaderboard**: See how you rank vs streakmates
- **Use Life Feature**: Recover from missed days with confirmation

**Post Check-in**:
- Shows "WOOHOO! Already Checked In!" celebration
- Mission accomplished state with encouraging messages

---

### **8. Profile & Settings**
**Route**: `/profile` (protected)

**User Profile Features**:
- View all streaks (past and present)
- Total achievements and stats
- Access to app settings
- Create/join more streaks

**Streak Management**:
- **Admin powers** (streak creator): Edit name, dates, duration (until day 3)
- **Member view**: See streak details, leave streak
- **Danger zone**: Delete streak (admin only)

---

## 🎮 **Gamification Elements**

### **🔹 Powers System**
- Habits are called "powers" to feel empowering
- Users "select powers to begin tracking"
- Different difficulty levels = different gem rewards

### **🔹 Gems & Lives**
- **Gems**: Points earned daily by completing powers
- **Lives**: Safety net - can be used to mark missed days as complete
- **Strategic element**: Limited lives force users to be consistent

### **🔹 Social Competition**
- **Streakmates**: Fellow participants in your streak
- **Leaderboard**: Rankings based on total gems earned
- **Member details**: Click on others to see their powers and progress
- **Group encouragement**: Shared journey creates accountability

### **🔹 Streak Mechanics**
- **Streak counter**: Days of consecutive check-ins
- **Missed day recovery**: Use lives to maintain streak
- **Progress visualization**: 7-day chart shows consistency patterns

---

## ✅ **What Users CAN Do**
- ✅ Join unlimited streaks (free plan allows 1 streak creation)
- ✅ Customize power selection within first 3 days
- ✅ Use lives strategically to maintain streaks
- ✅ Compete with friends on leaderboards
- ✅ Create custom powers for personalized tracking
- ✅ Check in daily with photo and notes
- ✅ See detailed progress and streak history
- ✅ Leave or delete streaks (with proper permissions)

## ❌ **What Users CANNOT Do**
- ❌ Change powers after day 3 of streak (locked for fairness)
- ❌ Check in before streak start date
- ❌ Check in multiple times per day
- ❌ Edit other members' data
- ❌ Delete streaks they didn't create (unless admin)
- ❌ Recover unlimited missed days (lives are limited)

---

## 🎯 **Success Metrics**
- **Engagement**: Daily check-in rate
- **Retention**: Users returning day after day  
- **Social**: Streaks with multiple active members
- **Achievement**: Completed streaks and maintained habits
- **Growth**: Users creating/joining multiple streaks

This flow creates a complete gamified habit tracking experience that's social, engaging, and designed for long-term behavior change.
