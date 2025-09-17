# 🚀 Streakzilla.com Deployment Configuration

## ✅ **Code Changes Made**
The code has been updated to use the correct redirect URL for production.

### **What Changed:**
- Created `src/lib/constants.ts` with production URL configuration
- Updated `src/pages/Auth.tsx` to use `getRedirectUrl()` function
- Now uses `https://streakzilla.com` in production, localhost in development

## 🔧 **Supabase Dashboard Configuration Required**

### **Step 1: Update Supabase Authentication Settings**

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Settings** → **URL Configuration**

### **Step 2: Update These Settings**

#### **Site URL**
```
https://streakzilla.com
```

#### **Redirect URLs** (Add all of these)
```
https://streakzilla.com/**
https://streakzilla.com/
http://localhost:8080/**
http://localhost:8081/**
http://localhost:8082/**
```

### **Step 3: Save Changes**
Click **Save** in the Supabase dashboard.

## 🎯 **How This Works**

### **Development (localhost)**
- Uses `http://localhost:8080/` for email redirects
- Allows local testing and development

### **Production (streakzilla.com)**
- Uses `https://streakzilla.com/` for email redirects
- Properly handles email verification in production

## ✅ **Verification Steps**

### **After Making Supabase Changes:**

1. **Deploy the updated code** to Cloudflare Pages (with custom domain)
2. **Test email signup** on https://streakzilla.com
3. **Check your email** - the verification link should now point to `streakzilla.com`
4. **Click the verification link** - it should redirect properly to your live site

## 🔄 **If You Change Domains Later**

Simply update the `SITE_URL` in `src/lib/constants.ts`:

```typescript
export const SITE_URL = import.meta.env.PROD 
  ? 'https://your-new-domain.com'  // <- Change this
  : 'http://localhost:8080';
```

## 🚨 **Common Issues & Solutions**

### **Issue**: Still getting localhost links
**Solution**: Make sure you've updated BOTH the code AND the Supabase dashboard settings

### **Issue**: "Invalid redirect URL" error
**Solution**: Double-check that your domain is listed in Supabase redirect URLs with `/**` wildcard

### **Issue**: Email verification not working
**Solution**: Clear browser cache and try with a fresh email address

---

## 📋 **Quick Checklist**

- ✅ Code updated (automatically done)
- ⏳ Update Supabase Site URL to `https://streakzilla.com`
- ⏳ Add redirect URLs in Supabase dashboard
- ⏳ Deploy to Cloudflare Pages with custom domain
- ⏳ Test email signup flow

**Your email verification should now work correctly on the live site!** 🎉
