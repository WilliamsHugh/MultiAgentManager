# MultiAgentManager Brand Kit

## 1. POSITIONING & TAGLINE

**Positioning Statement:**  
MultiAgentManager là layer điều hành tập trung giúp người dùng phổ thông quản lý, phối hợp và tối ưu hóa công việc với nhiều AI agents thông qua một giao diện thống nhất. Khác với các công cụ chuyên biệt cho developer, MultiAgentManager hướng đến mọi người—từ những ai mới bắt đầu tới người dùng nâng cao.

**Tagline:**  
*Your Command Center for AI*

---

## 2. COLOR PALETTE

| Màu | Hex Code | Vai Trò | Mô Tả |
|-----|----------|--------|-------|
| **Primary: Iris** | `#6366F1` | Brand identity, CTA buttons, primary interaction | Biểu tượng năng lượng, thông minh, trí tuệ—màu chính cho logo, buttons, highlights |
| **Secondary: Emerald** | `#10B981` | Success states, confirmation, positive feedback | Tín hiệu thành công, tích cực, tiến bộ—dùng cho completion, available status |
| **Accent: Amber** | `#F59E0B` | Warnings, attention-needed, pending states | Cảnh báo nhẹ, yêu cầu chú ý—dùng cho pending tasks, warnings, notifications |
| **Dark Slate** | `#1E293B` | Text, backgrounds, dark mode | Text chính, backgrounds tối—dùng cho typography, dark mode foundations |
| **Light Neutral** | `#F8FAFC` | Backgrounds, cards, UI surfaces | Nền sáng, card surfaces—tạo clarity, minimal appearance |
| **Border/Divider** | `#CBD5E1` | Subtle borders, dividers, secondary UI | Phân chia nhẹ nhàng—dùng cho lines, subtle separations |

### Color Usage Guidelines
- **Iris** & **Emerald** là core emotional colors—tạo cảm giác intelligent + trustworthy
- **Amber** dùng tiết chế—chỉ cho states cần attention
- **Dark Slate** + **Light Neutral** tạo clean, minimal aesthetic (phù hợp với MultiAgentManager's organized, clear interface)

---

## 3. TYPOGRAPHY

### Font Pairing

| Loại | Font | Fallback | Weight | Dùng Cho |
|------|------|----------|---------|----------|
| **Heading** | Inter | -apple-system, BlinkMacSystemFont, "Segoe UI" | Bold (700), SemiBold (600) | H1, H2, H3, Labels, CTAs |
| **Body** | Inter | -apple-system, BlinkMacSystemFont, "Segoe UI" | Regular (400), Medium (500) | Paragraph, Body text, UI copy |

*Lý do chọn Inter:* Modern, highly readable on screen, geometric yet friendly—hoàn hảo cho AI product mang tính hiện đại

### Typography Scale

```
H1: 32px / 1.2 line-height / 700 weight
H2: 24px / 1.3 line-height / 700 weight
H3: 20px / 1.4 line-height / 600 weight
Body Large: 16px / 1.5 line-height / 400 weight
Body: 14px / 1.5 line-height / 400 weight
Body Small: 12px / 1.4 line-height / 400 weight
Label/UI: 12px / 1.4 line-height / 600 weight
```

---

## 4. TONE OF VOICE

### 5 Core Adjectives
1. **Intelligent** — speaks with clarity, avoids jargon for general users
2. **Approachable** — warm, conversational, not intimidating
3. **Empowering** — puts control in user's hands, celebrates capability
4. **Transparent** — clear about what Orchexa does & limitations
5. **Reliable** — confident, steady, predictable messaging

### Should / Shouldn't Guidelines

**SHOULD:**
- Use active voice & direct address ("You can orchestrate...", "Let's automate...")
- Celebrate user wins with genuine encouragement
- Explain *why* features matter, not just *what* they do

**SHOULDN'T:**
- Use hype language or over-promise AI capabilities ("revolutionary", "magic")
- Assume technical knowledge—explain concepts for newcomers without condescension
- Make it feel corporate or distant—MultiAgentManager is a *partner*, not a vendor

---

## 5. THREE MESSAGING PILLARS

### Pillar 1: **Command Without Complexity**
*Orchestrate multiple AI agents from one unified control center—no technical setup required.*

- Core message: Complexity belongs to the system, not to you
- For who: Users overwhelmed by juggling multiple tools
- Evidence: Single dashboard, natural language input, one-click workflows

### Pillar 2: **Your Agents, Your Rules**
*Delegate with confidence. MultiAgentManager handles the coordination; you stay in control.*

- Core message: Empower users to define roles, priorities & feedback loops for their agents
- For who: Users who value autonomy and transparency in automation
- Evidence: Customizable agent behaviors, audit logs, override capabilities

### Pillar 3: **Built for Everyone**
*Whether you're exploring AI for the first time or scaling across teams, MultiAgentManager grows with you.*

- Core message: No prerequisites, low floor, high ceiling
- For who: From curious individuals to power users
- Evidence: Onboarding templates, progressive disclosure, open-source community

---

## Brand Expression Examples

### How We Talk About Features
❌ *"Advanced multi-agent orchestration engine with LLM-native task decomposition"*  
✅ *"Break down your goals. MultiAgentManager assigns the right agent to each piece."*

### How We Describe Value
❌ *"Leverage synergistic AI coordination for productivity optimization"*  
✅ *"Do more with less mental load. Your agents handle the details."*

### How We Respond to Concerns
❌ *"Our system has 99.9% uptime SLA"*  
✅ *"You can see exactly what your agents are doing and step in anytime."*

---

## 6. DESIGN SYSTEM SPECIFICATIONS

### 6.1 Dark Mode Design Tokens

Mở rộng color palette cho dark mode, giữ nguyên hệ thống 6 màu gốc nhưng điều chỉnh cho nền tối:

| CSS Variable | Light Mode | Dark Mode | Vai Trò |
|-------------|-----------|-----------|---------|
| `--bg-primary` | `#F8FAFC` | `#0F172A` | Nền chính (Slate-900) |
| `--bg-secondary` | `#FFFFFF` | `#1E293B` | Card surfaces, panels |
| `--bg-tertiary` | `#F1F5F9` | `#334155` | Sidebar, hover states |
| `--text-primary` | `#1E293B` | `#F1F5F9` | Nội dung chính |
| `--text-secondary` | `#475569` | `#94A3B8` | Nội dung phụ, meta |
| `--text-muted` | `#94A3B8` | `#64748B` | Placeholder, disabled |
| `--border-default` | `#CBD5E1` | `#334155` | Dividers, borders |
| `--border-hover` | `#94A3B8` | `#475569` | Hover borders |
| `--iris-primary` | `#6366F1` | `#818CF8` | Primary color (sáng hơn trong dark mode) |
| `--iris-hover` | `#4F46E5` | `#6366F1` | Hover state của primary |
| `--emerald-primary` | `#10B981` | `#34D399` | Success states |
| `--amber-primary` | `#F59E0B` | `#FBBF24` | Warning states |

**Dark Mode Implementation Notes:**
- Đảm bảo tỷ lệ tương phản (contrast ratio) ≥ 4.5:1 cho text nhỏ và ≥ 3:1 cho text lớn (WCAG AA)
- Iris trong dark mode chuyển từ `#6366F1` → `#818CF8` (sáng hơn) để đủ contrast trên nền tối
- Không dùng pure `#000` cho background—Slate-900 (`#0F172A`) giảm mỏi mắt
- Border trong dark mode dùng `#334155` thay vì `#CBD5E1` để phân chia nhẹ nhàng

**Toggle Mechanism gợi ý:**
```css
:root {
  --bg-primary: #F8FAFC;
  /* ... light tokens ... */
}

[data-theme="dark"] {
  --bg-primary: #0F172A;
  /* ... dark tokens ... */
}
```

---

### 6.2 Spacing & Sizing Scale

Hệ thống spacing dựa trên **4px grid** (4px base unit), phù hợp với mọi màn hình và component:

| Token | px | rem (16px base) | Dùng Cho |
|-------|-----|-----------------|---------|
| `--space-0` | 0px | 0rem | Reset |
| `--space-1` | 4px | 0.25rem | Icon spacing, inline gaps nhỏ |
| `--space-2` | 8px | 0.5rem | Padding buttons nhỏ, gap giữa icon & text |
| `--space-3` | 12px | 0.75rem | Card padding nhỏ, form field spacing |
| `--space-4` | 16px | 1rem | Standard padding (cards, sections) |
| `--space-5` | 20px | 1.25rem | Section spacing nhẹ |
| `--space-6` | 24px | 1.5rem | Card groups, modal padding |
| `--space-8` | 32px | 2rem | Page section separation |
| `--space-10` | 40px | 2.5rem | Large section spacing |
| `--space-12` | 48px | 3rem | Page-level padding |
| `--space-16` | 64px | 4rem | Hero sections, major dividers |
| `--space-20` | 80px | 5rem | Maximum section spacing |

**Spacing Guidelines:**
- Luôn dùng token thay vì số ngẫu nhiên—giữ consistency toàn bộ UI
- Khoảng cách giữa các component cùng cấp: `--space-4` hoặc `--space-6`
- Khoảng cách giữa sections: `--space-8` hoặc `--space-10`
- Padding trong card: `--space-4` (desktop), `--space-3` (mobile)
- Gap trong form: `--space-3` giữa label và input, `--space-4` giữa các field

**Border Radius Tokens:**

| Token | Value | Dùng Cho |
|-------|-------|---------|
| `--radius-sm` | 4px | Input fields, small badges |
| `--radius-md` | 8px | Cards, buttons, dialogs |
| `--radius-lg` | 12px | Modals, drop-down panels |
| `--radius-xl` | 16px | Large containers, sidebars |
| `--radius-full` | 9999px | Pills, avatars, tags |

**Width/Height Tokens (cho layout):**

| Token | Value | Dùng Cho |
|-------|-------|---------|
| `--sidebar-width` | 280px | Sidebar navigation |
| `--content-max-width` | 1200px | Main content area |
| `--breakpoint-sm` | 640px | Mobile |
| `--breakpoint-md` | 768px | Tablet |
| `--breakpoint-lg` | 1024px | Desktop |
| `--breakpoint-xl` | 1280px | Wide desktop |

---

### 6.3 Component-Specific Guidelines

#### Buttons

| State | Primary (Iris) | Secondary (Outline) | Ghost | Danger |
|-------|---------------|-------------------|-------|--------|
| **Default** | `bg: #6366F1` / text white | `border: #CBD5E1` / text slate | `bg: transparent` / text slate | `bg: #EF4444` / text white |
| **Hover** | `bg: #4F46E5` | `border: #6366F1` / text iris | `bg: #F1F5F9` | `bg: #DC2626` |
| **Active** | `bg: #4338CA` | `bg: #EEF2FF` | `bg: #E2E8F0` | `bg: #B91C1C` |
| **Disabled** | `bg: #A5B4FC` / opacity 0.5 | `border: #E2E8F0` / text #94A3B8 | `bg: transparent` / text #CBD5E1 | `bg: #FCA5A5` / opacity 0.5 |
| **Loading** | Show spinner, disable click | Show spinner, disable click | Show spinner | Show spinner |

**Button Sizes:**
| Size | Height | Padding | Font |
|------|--------|---------|------|
| Sm | 32px (--space-8) | 12px 16px | 12px/600 |
| Md | 40px (--space-10) | 12px 24px | 14px/500 |
| Lg | 48px (--space-12) | 16px 32px | 16px/600 |

**Button Anatomy:**
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);          /* 8px gap between icon & text */
  border-radius: var(--radius-md);
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;   /* mượt mà, không quá chậm */
  border: 1px solid transparent;
}
```

#### Cards

| Element | Property | Value |
|---------|----------|-------|
| **Background** | `background` | `var(--bg-secondary)` |
| **Border** | `border` | `1px solid var(--border-default)` |
| **Radius** | `border-radius` | `var(--radius-md)` |
| **Padding** | `padding` | `var(--space-4)` |
| **Shadow** | `box-shadow` | `var(--shadow-sm)` (xem section 6.4) |
| **Header** | `font-weight` | 600 (SemiBold) |
| **Transition** | `transition` | `box-shadow 200ms ease, border-color 200ms ease` |

**Card Variants:**
| Variant | Khác biệt | Dùng khi |
|---------|-----------|----------|
| **Default** | Shadow nhẹ, border | Nội dung thông thường |
| **Bordered** | Shadow: none, border dày hơn | Trong form/settings |
| **Elevated** | Shadow lớn hơn (`--shadow-md`) | Cards cần nổi bật, hover effects |
| **Interactive** | Hover: shadow + border-color Iris | Clickable cards, agent cards |

#### Modals & Dialogs

| Element | Property | Value |
|---------|----------|-------|
| **Overlay** | `background` | `rgba(15, 23, 42, 0.5)` (Slate-900 với 50% opacity) |
| **Overlay** | `backdrop-filter` | `blur(4px)` (optional, tăng depth) |
| **Dialog** | `background` | `var(--bg-secondary)` |
| **Dialog** | `border-radius` | `var(--radius-lg)` |
| **Dialog** | `box-shadow` | `var(--shadow-xl)` |
| **Dialog** | `padding` | `var(--space-6)` |
| **Header** | `padding-bottom` | `var(--space-4)` |
| **Divider** | `border-bottom` | `1px solid var(--border-default)` |

**Modal Animation (gợi ý):**
```css
.modal-overlay {
  animation: fadeIn 150ms ease-out;
}

.modal-dialog {
  animation: slideUp 200ms ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```

#### Badges & Tags

| Variant | Background | Text Color | Dùng Cho |
|---------|-----------|-----------|----------|
| **Iris** | `#EEF2FF` | `#4F46E5` | Agent status, categories |
| **Emerald** | `#ECFDF5` | `#059669` | Success, active, completed |
| **Amber** | `#FFFBEB` | `#D97706` | Pending, warning, in-progress |
| **Slate** | `#F1F5F9` | `#475569` | Default, neutral info |

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius-full); /* 9999px - pill shape */
  line-height: 1.4;
  gap: 4px;
}
```

---

### 6.4 Elevation & Shadows System

Shadows tạo chiều sâu (depth) cho UI, giúp phân biệt layers:

| Token | Value (Light Mode) | Value (Dark Mode) | Dùng Cho |
|-------|-------------------|-------------------|---------|
| `--shadow-xs` | `0 1px 2px rgba(15, 23, 42, 0.05)` | `0 1px 2px rgba(0, 0, 0, 0.3)` | Subtle separation, table rows |
| `--shadow-sm` | `0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)` | `0 1px 3px rgba(0, 0, 0, 0.4)` | Cards, dropdowns |
| `--shadow-md` | `0 4px 6px rgba(15, 23, 42, 0.07), 0 2px 4px rgba(15, 23, 42, 0.04)` | `0 4px 6px rgba(0, 0, 0, 0.45)` | Elevated cards, popovers |
| `--shadow-lg` | `0 10px 15px rgba(15, 23, 42, 0.08), 0 4px 6px rgba(15, 23, 42, 0.04)` | `0 10px 15px rgba(0, 0, 0, 0.5)` | Modals, side panels |
| `--shadow-xl` | `0 20px 25px rgba(15, 23, 42, 0.1), 0 8px 10px rgba(15, 23, 42, 0.04)` | `0 20px 25px rgba(0, 0, 0, 0.55)` | Large modals, toast notifications |

**Shadow Usage Principles:**
| Depth Level | Token | Components |
|-------------|-------|-----------|
| **Ground (0)** | none | Page background, static sections |
| **Surface (1)** | `--shadow-xs` | Cards default state, table rows |
| **Raised (2)** | `--shadow-sm` | Cards hover, dropdown menus |
| **Overlay (3)** | `--shadow-md` | Popovers, tooltips, date pickers |
| **Modal (4)** | `--shadow-lg` | Dialogs, sidebars, slide-in panels |
| **Toast (5)** | `--shadow-xl` | Notifications, alerts (luôn ở trên cùng) |

**Dark Mode Shadow Notes:**
- Trong dark mode, tăng opacity của shadow lên (do nền đã tối, shadow cần mạnh hơn để thấy rõ)
- Dùng pure `rgba(0, 0, 0, ...)` trong dark mode thay vì Slate để tạo depth rõ rệt
- Không dùng white shadows—luôn là black với opacity thấp

**Transition Timing (cho interactive elements):**

| Context | Duration | Easing | Ví dụ |
|---------|----------|--------|-------|
| **Micro-interactions** | 150ms | ease | Button hover, icon spin |
| **Component transitions** | 200ms | ease-out | Card hover, border color |
| **Panel/Modal** | 250ms | ease-out | Sidebar slide, modal appear |
| **Page transitions** | 300ms | ease-in-out | Route changes, tab switch |
| **Notifications** | 400ms | ease-out | Toast slide in/out |

---

**Version:** 1.1  
**Last Updated:** July 2026  
**Steward:** MultiAgentManager Brand Team
