# 🔐 Phase 3.1: Frontend Authentication UI

**Worktree:** `wt_auth_ui`
**Branch:** `phase/3.1-auth-ui`
**Target dirs:** `frontend/`
**Based on commit:** `3c3c320` (main)

---

## 🎯 Mục Tiêu

Thêm login/register flow cho Frontend Dashboard:
1. Login page (`/login`)
2. Register page (`/register`) 
3. Auth context (token management, user state)
4. Protected routes (redirect to login nếu chưa auth)
5. API client tự động gắn JWT token

## 📋 Nhiệm Vụ Chi Tiết

### Task 1: Tạo Auth Context

**File mới:** `frontend/lib/auth-context.tsx`

**Rules:**
- React Context cho auth state (user, token, login, logout, register)
- Token lưu trong localStorage
- Auto-attach token vào API calls
- Auto-refresh UI khi auth state thay đổi

```tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from './api';

const AUTH_TOKEN_KEY = 'ma-auth-token';
const AUTH_USER_KEY = 'ma-auth-user';

export interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token từ localStorage khi mount
  useEffect(() => {
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const savedUser = localStorage.getItem(AUTH_USER_KEY);
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    
    setIsLoading(false);
  }, []);

  // Cập nhật api singleton với token
  useEffect(() => {
    if (token) {
      api.setAuthToken(token);
    } else {
      api.clearAuthToken();
    }
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await api.login(username, password);
    const { user: userData, token: authToken } = response;
    
    localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
    
    setToken(authToken);
    setUser(userData);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const response = await api.register(username, password);
    const { user: userData, token: authToken } = response;
    
    localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
    
    setToken(authToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
    api.clearAuthToken();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token,
      isLoading,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Task 2: Cập nhật API Client

**File:** `frontend/lib/api.ts`

**Rules:**
- Thêm `setAuthToken()`, `clearAuthToken()` methods
- Thêm `login()`, `register()` API methods
- Tự động gắn Authorization header khi có token

**Thêm vào class api:**
```typescript
// Biến lưu token
let authToken: string | null = null;

export const api = {
  setAuthToken(token: string) {
    authToken = token;
  },
  
  clearAuthToken() {
    authToken = null;
  },
  
  // ... existing methods ...
  
  // Auth
  login: (username: string, password: string) =>
    fetchAPI<{ message: string; user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, password: string) =>
    fetchAPI<{ message: string; user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  
  // ... rest of existing methods ...
};

// Cập nhật fetchAPI để tự động gắn auth header
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  // Tự động gắn auth token nếu có
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  // ... rest of fetch implementation ...
}
```

**Lưu ý:** Cần export interface `User` từ api.ts hoặc import từ auth-context.tsx.

### Task 3: Tạo Login Page

**File mới:** `frontend/app/login/page.tsx`

**Rules:**
- Form đăng nhập với username + password
- Hiển thị lỗi khi login thất bại
- Redirect về `/` khi thành công
- Loading state khi submit
- Dark theme consistent với dashboard

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Nếu đã login, redirect về dashboard
  if (isAuthenticated) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Welcome Back</h1>
            <p className="text-sm text-slate-400 mt-1">Sign in to Multi-Agent Manager</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 border border-slate-700 focus:outline-none focus:border-cyan-500/50 transition-colors"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 border border-slate-700 focus:outline-none focus:border-cyan-500/50 transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Task 4: Tạo Register Page

**File mới:** `frontend/app/register/page.tsx`

**Rules:**
- Tương tự login page nhưng có thêm confirm password field
- Validate password match client-side
- Redirect về `/` sau khi register thành công
- Link về login page

### Task 5: Bảo vệ Dashboard Route

**File:** `frontend/app/page.tsx`

**Rules:**
- Import useAuth context
- Kiểm tra isAuthenticated ở đầu component
- Nếu chưa auth, redirect sang /login
- Sử dụng useRouter từ next/navigation

**Thêm vào page.tsx:**
```tsx
import { useAuth } from '@/lib/auth-context';

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  // Redirect nếu chưa login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-950">
      <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
    </div>;
  }
  
  if (!isAuthenticated) return null;
  
  // ... existing dashboard code ...
```

### Task 6: Cập nhật Layout để wrap AuthProvider

**File:** `frontend/app/layout.tsx`

**Rules:**
- Wrap children với AuthProvider
- Import AuthProvider từ auth-context

```tsx
import { AuthProvider } from '@/lib/auth-context';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## 🧪 Kiểm Tra

```bash
cd /home/hughwilliams/projects/MultiAgentManager/wt_auth_ui/frontend
npm run build
```

Build phải thành công.

---

## 🔗 Phụ Thuộc

- Phụ thuộc vào Agent B3 (auth server) vì cần API endpoints để test
- Có thể dev song song với Agent B3 (viết code trước, test sau)
