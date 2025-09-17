# 🔗 Streak Invitation Links Feature

## ✅ **Auto-Populate Code from URL**

Users can now share direct invitation links that automatically populate the streak code!

### **How it Works:**

**Share Link Format:**
```
https://streakzilla.com/join-group?code=75A117
```

**User Experience:**
1. User clicks the invitation link
2. They are taken to the join streak page
3. **The code is automatically filled in** from the URL parameter
4. They see a helpful message: "Code pre-filled from your invitation link"
5. They just need to click "Join Streak" - no typing required!

### **Benefits:**
- ✅ **Seamless sharing** - no need to copy/paste codes separately
- ✅ **Reduced friction** - users can join with one click
- ✅ **Better UX** - clear visual feedback when code is pre-filled
- ✅ **Error reduction** - no typos in manual code entry

### **Technical Implementation:**
- Uses `useSearchParams()` hook to read URL parameters
- Automatically populates and formats the code (uppercase, trimmed)
- Shows helpful indicator when code is pre-filled
- Backwards compatible - manual entry still works if no URL parameter

### **Usage:**
When users create a streak, they can share the join link like:
`https://streakzilla.com/join-group?code=ABCD123`

This makes streak sharing much more user-friendly! 🎉
