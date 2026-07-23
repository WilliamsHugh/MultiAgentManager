# 🎨 Phase 2.3: Frontend Polish & Optimization

**Worktree:** `wt_ui`
**Branch:** `phase/2.3-frontend`
**Target dirs:** `frontend/`
**Based on commit:** `05cb0ad` (Phase 2.1)

---

## 🎯 Mục Tiêu

Cải thiện UI/UX, fix vulnerabilities, tối ưu frontend code.

## 📋 Nhiệm Vụ Chi Tiết

### Task 1: ErrorBoundary Component

**File mới:** `frontend/app/error.tsx`

**Rules:**
- Tạo ErrorBoundary cho Next.js App Router
- Hiển thị UI thân thiện khi có lỗi
- Có nút "Try Again"

```tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-red-400 mb-2">
          Something went wrong!
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
```

### Task 2: Loading Skeleton States

**File:** `frontend/app/page.tsx`

**Rules:**
- Thêm loading skeleton cho sidebar task list khi API đang load
- Skeleton UI: 3-4 row items với animation pulse
- Sử dụng Tailwind `animate-pulse`

**Vị trí thêm:**
- Trong phần sidebar task list, khi `tasks` đang empty và `connectionError === null`:
```tsx
{/* Loading Skeleton */}
{isLoading && (
  <div className="space-y-2 p-2">
    {[1, 2, 3].map(i => (
      <div key={i} className="animate-pulse p-3 rounded-lg bg-slate-800/30">
        <div className="h-4 bg-slate-700/50 rounded w-3/4 mb-2" />
        <div className="h-3 bg-slate-700/30 rounded w-1/2" />
      </div>
    ))}
  </div>
)}
```

Thêm state: `const [isLoading, setIsLoading] = useState(true);`
Set `setIsLoading(false)` sau khi `getTasks()` hoàn thành (cả success và error).

### Task 3: Remove Dead Code

**File:** `frontend/package.json`

**Rules:**
- Remove `lucide-react` dependency (không được dùng trong code, page.tsx dùng inline SVGs)
- Không cần uninstall, chỉ cần xóa khỏi package.json

**File:** `frontend/app/page.tsx`

**Rules:**
- Dòng 1: Remove unused import của `TaskEvent` từ `@/lib/socket` (vì không dùng)
- Kiểm tra `lucide-react` import - nếu có thì xóa

### Task 4: Fix tsconfig Paths Alias

**File:** `frontend/tsconfig.json`

**Rules:**
- Fix path alias `@/*` từ `./src/*` thành `./app/*` (vì frontend không có src/ directory)

**Before:**
```json
"paths": {
  "@/*": ["./src/*"]
}
```

**After:**
```json
"paths": {
  "@/*": ["./app/*"]
}
```

### Task 5: Fix npm Vulnerabilities

```bash
cd /home/hughwilliams/projects/MultiAgentManager/frontend
npm audit fix --force
```

**Lưu ý:** `--force` sẽ update Next.js từ 15.1.7 lên 15.5.21. Kiểm tra build vẫn hoạt động.

Nếu `--force` gây lỗi build, rollback bằng `npm install next@15.1.7` và thông báo.

---

## 🧪 Kiểm Tra

```bash
cd /home/hughwilliams/projects/MultiAgentManager/frontend
npm run build
```

Build phải thành công không lỗi.

## 🔗 Phụ Thuộc

- Độc lập với các worktree khác
- Chỉ sửa files trong `frontend/`
