# Frontend Troubleshooting Guide

## 🔍 Common Issues & Solutions

### Issue 1: Port Already in Use
**Error**: `Port 8000 is already in use`

**Solution**:
```powershell
# Kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F

# Or use a different port
cd frontend
npm run dev -- -p 8001
```

### Issue 2: Module Not Found / Import Errors
**Error**: `Cannot find module` or `Module not found`

**Solution**:
```powershell
cd frontend
# Clear cache and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npm run dev
```

### Issue 3: TypeScript Errors
**Error**: TypeScript compilation errors

**Solution**:
```powershell
cd frontend
# Check for TypeScript errors
npx tsc --noEmit

# If errors persist, try:
npm run build
```

### Issue 4: Backend Connection Failed
**Error**: `Network error - Is the backend running?`

**Solution**:
1. **Verify Backend is Running**:
   - Check terminal for: `Application running on http://localhost:9000`
   - Visit: `http://localhost:9000/api` (Swagger UI)

2. **Check API Configuration**:
   - Frontend API URL: `http://localhost:9000` (in `frontend/app/services/api.ts`)
   - Backend Port: `9000` (in `backend/src/main.ts`)

3. **Test Backend Connection**:
   ```powershell
   # Test if backend is responding
   curl http://localhost:9000/api
   # Or open in browser: http://localhost:9000/api
   ```

### Issue 5: Next.js Build Errors
**Error**: Build or compilation errors

**Solution**:
```powershell
cd frontend
# Clear Next.js cache
Remove-Item -Recurse -Force .next
npm run dev
```

---

## 🚀 Proper Startup Sequence

### Step 1: Start Backend First
```powershell
cd backend
npm run dev
```
**Wait for**: `Application running on http://localhost:9000`

### Step 2: Start Frontend
```powershell
cd frontend
npm run dev
```
**Wait for**: `Ready - started server on 0.0.0.0:8000`

---

## ✅ Verification Steps

1. **Backend Health Check**:
   - Open: `http://localhost:9000/api`
   - Should see Swagger UI

2. **Frontend Health Check**:
   - Open: `http://localhost:8000`
   - Should see login page or dashboard

3. **Check Browser Console** (F12):
   - Look for: `[API] Base URL: http://localhost:9000`
   - Check for any red errors

4. **Check Network Tab**:
   - Open DevTools → Network
   - Try logging in
   - Verify API calls go to `http://localhost:9000`

---

## 🔧 Quick Fixes

### Clear Everything and Restart
```powershell
# Stop all Node processes
taskkill /F /IM node.exe

# Backend
cd backend
Remove-Item -Recurse -Force dist
npm run dev

# Frontend (in new terminal)
cd frontend
Remove-Item -Recurse -Force .next
npm run dev
```

### Check for Port Conflicts
```powershell
# Check what's using port 8000
netstat -ano | findstr :8000

# Check what's using port 9000
netstat -ano | findstr :9000
```

---

## 📝 Expected Output

### Backend Terminal Should Show:
```
[Nest] Application running on http://localhost:9000
[Nest] Swagger running on http://localhost:9000/api
Incoming Request: GET /api
```

### Frontend Terminal Should Show:
```
▲ Next.js 16.0.10
- Local:        http://localhost:8000
- Ready in X.Xs
```

---

## 🆘 Still Not Working?

**Please share**:
1. Exact error message from terminal
2. Browser console errors (F12 → Console)
3. Network tab errors (F12 → Network)
4. Which step fails (backend startup, frontend startup, or runtime)

