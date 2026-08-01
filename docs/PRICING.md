# 💰 MultiAgentManager — Pricing Strategy

> **Document Type:** Pricing Analysis  
> **Phase:** 2 — Design & Analysis  
> **Status:** 📝 Draft  
> **Version:** 1.0  
> **Last Updated:** July 2026  

---

## 1. Executive Summary

MultiAgentManager áp dụng mô hình **Open-Source Core + SaaS** — vừa xây dựng cộng đồng mã nguồn mở, vừa tạo doanh thu từ các tính năng enterprise và dịch vụ đám mây. Chiến lược này phù hợp với triết lý **"Built for Everyone"** (Pillar 3) trong brand kit — low floor, high ceiling.

---

## 2. Market Positioning

### 2.1 Competitive Landscape

| Đối thủ | Phân khúc | Mô hình giá | Điểm yếu |
|---------|-----------|-------------|----------|
| **GitHub Copilot** | Developer tool | $10-39/user/month | Chỉ hỗ trợ code, không orchestration |
| **Cursor** | AI IDE | $20-40/user/month | IDE-bound, không multi-agent |
| **Replit** | Cloud IDE | $0-200/user/month | Vendor lock-in, không self-hosted |
| **AutoGPT** | Open-source agent | Free | Không GUI, không team features |
| **LangChain** | Framework | Free (self-host) | Cần technical expertise, không có dashboard |
| **MultiAgentManager** | **Command Center** | **Free + Premium** | Mới, cần xây dựng ecosystem |

### 2.2 Target Audience

| Segment | Mô tả | Willingness to Pay | Kênh tiếp cận |
|---------|-------|---------------------|----------------|
| **Individual Developers** | Lập trình viên solo muốn automation | Thấp ($0-10) | GitHub, Dev.to, Hacker News |
| **Small Teams (2-10)** | Startup/team nhỏ cần CI/CD multi-agent | Trung bình ($10-50) | Product Hunt, Twitter/X |
| **Mid-Size Teams (10-50)** | Công ty công nghệ, agency | Cao ($50-200) | LinkedIn, tech conferences |
| **Enterprise (50+)** | Tổ chức lớn cần compliance, audit | Rất cao ($200+) | Sales team, case studies |

---

## 3. Pricing Tiers

### Tier 1: Community 🌱 — Free

> *For individual developers and open-source contributors*

| Feature | Included |
|---------|----------|
| **Agent Orchestration Engine** | ✅ Full |
| **Dashboard UI** | ✅ Full |
| **Real-Time Log Streaming** | ✅ Full |
| **Git Worktree Integration** | ✅ Full |
| **Task Queue (max 2 concurrent)** | ✅ 2 workers |
| **AI Models** | ✅ All models |
| **Community Support** | ✅ GitHub Issues + Discord |
| **Self-Hosted** | ✅ Full (MIT License) |
| **Commercial Use** | ✅ Allowed |

**Price:** **$0** — mã nguồn mở (MIT License)

> *"Complexity belongs to the system, not to you."*

### Tier 2: Pro 🚀 — $29/month

> *For professionals and small teams who need more power*

| Feature | Included |
|---------|----------|
| **Everything in Community** | ✅ |
| **Concurrent Workers** | ✅ Up to 10 |
| **Priority Queue** | ✅ High-priority tasks first |
| **Project History** | ✅ 90-day retention |
| **Advanced Analytics** | ✅ Task duration, success rate, agent efficiency |
| **Custom Agent Templates** | ✅ Save & reuse agent configurations |
| **Email Support** | ✅ 24h response |
| **API Access** | ✅ Rate: 1000 req/min |

**Price:** **$29/month** (or **$290/year** — save 2 months)

> *"Delegate with confidence. More power, more control."*

### Tier 3: Team 👥 — $99/month (up to 5 users)

> *For small teams building together*

| Feature | Included |
|---------|----------|
| **Everything in Pro** | ✅ |
| **Team Workspace** | ✅ Shared projects & agents |
| **Concurrent Workers** | ✅ Up to 25 |
| **Role-Based Access** | ✅ Admin/Member/Viewer |
| **Shared Templates** | ✅ Team-wide agent configs |
| **Audit Log** | ✅ Full action history |
| **Project History** | ✅ 1-year retention |
| **Slack Integration** | ✅ Notifications to Slack |
| **Priority Support** | ✅ 8h response |
| **Additional Members** | ✅ $20/user/month |

**Price:** **$99/month** (base) + **$20/user/month** (extra)

> *"Built for everyone — from curious individuals to scaling teams."*

### Tier 4: Enterprise 🏢 — Custom

> *For organizations with advanced security, compliance, and scale requirements*

| Feature | Included |
|---------|----------|
| **Everything in Team** | ✅ |
| **Unlimited Workers** | ✅ Auto-scale |
| **Unlimited Projects** | ✅ |
| **On-Premise / VPC** | ✅ Docker/Kubernetes deployment |
| **SSO / OAuth** | ✅ SAML, Google, GitHub, GitLab |
| **Custom AI Models** | ✅ Bring your own LLM |
| **Audit Compliance** | ✅ SOC2-ready logging |
| **SLA Guarantee** | ✅ 99.95% uptime |
| **Dedicated Support** | ✅ 24/7 with account manager |
| **Custom Integration** | ✅ Webhook, API, CI/CD pipeline |
| **Data Residency** | ✅ Choose region |
| **Training & Onboarding** | ✅ Dedicated session |

**Price:** **Custom** (starting at $499/month)

> *"Your Command Center for AI — tailored to your organization."*

---

## 4. Pricing Visual Summary

```
                    ┌──────────┬──────────┬──────────┬──────────┐
                    │Community │   Pro    │   Team   │Enterprise│
                    │   🌱     │   🚀     │   👥     │   🏢     │
┌───────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Price             │   $0     │   $29    │   $99    │ Custom   │
├───────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Workers           │    2     │   10     │   25     │   ∞      │
│ Projects          │    5     │   50     │   ∞      │   ∞      │
│ History           │  7 days  │ 90 days  │  1 year  │   ∞      │
│ Team Members      │    1     │    1     │    5     │   ∞      │
│ Support           │Community │  Email   │ Priority │ Dedicated│
│ Self-Hosted       │    ✅    │    ✅    │    ✅    │   ✅     │
│ Cloud Hosted      │    -     │    ✅    │    ✅    │   ✅     │
│ SSO               │    -     │    -     │    -     │   ✅     │
│ Audit Log         │    -     │    -     │    ✅    │   ✅     │
│ SLA               │    -     │    -     │    -     │   ✅     │
└───────────────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## 5. Revenue Model

### 5.1 Revenue Streams

| Stream | Mô tả | Estimated % |
|--------|-------|-------------|
| **SaaS Subscriptions** | Pro + Team tiers (monthly/yearly) | 60% |
| **Enterprise Contracts** | Custom pricing, annual commitments | 25% |
| **Cloud Credits** | Pay-as-you-go for cloud-hosted agents | 10% |
| **Professional Services** | Training, onboarding, custom integration | 5% |

### 5.2 Pricing Psychology

| Tactic | Áp dụng | Lý do |
|--------|---------|-------|
| **Decoy Effect** | Pro ($29) làm "decoy" cho Team ($99) | Team có value hơn nhiều chỉ với $70 thêm |
| **Annual Discount** | 2 tháng free khi trả năm | Tăng retention, giảm churn |
| **Free Tier** | Community với workers limit | Giới thiệu sản phẩm, tạo community |
| **Usage-Based Ceiling** | Workers limit thay vì usage-based | Dễ hiểu, không gây bill shock |
| **Enterprise "Custom"** | Không public price | Linh hoạt cho deal lớn, negotiate |

### 5.3 Cost Structure

| Cost Item | Per User/Month | Notes |
|-----------|---------------|-------|
| **AI API (GPT-4o)** | ~$5-15 | Based on average task complexity |
| **Cloud Hosting** | ~$3-8 | Server + WebSocket + DB |
| **Storage (logs)** | ~$1-3 | 90-day retention policy |
| **Support** | ~$2-5 | Tier 1 + Tier 2 |
| **Infrastructure** | ~$4-10 | CDN, monitoring, CI/CD |
| **Total COGS** | **~$15-41** | Giảm dần theo scale |

### 5.4 Unit Economics

| Metric | Pro | Team | Enterprise |
|--------|-----|------|------------|
| **ARPU** | $29 | $39 (avg 5 users) | $500+ |
| **COGS** | $15-20 | $20-30 | $50-100 |
| **Gross Margin** | 31-48% | 23-49% | 80-90% |
| **CAC** | $50 (self-serve) | $150 (product-led) | $2000 (sales-led) |
| **LTV** (12mo) | $348 | $468 | $6000+ |
| **LTV/CAC** | 7:1 | 3:1 | 3:1 |
| **Payback Period** | 1.7 months | 3.8 months | 4 months |

---

## 6. Go-To-Market Strategy

### 6.1 Launch Phases

| Phase | Timeline | Target | Tactic |
|-------|----------|--------|--------|
| **Alpha** | Month 1-2 | 100 developers | GitHub early access, Discord community |
| **Beta** | Month 3-4 | 500 users | Product Hunt launch, Hacker News |
| **Public** | Month 5-6 | 2000 users | Content marketing, dev tool directories |
| **Growth** | Month 7-12 | 10000 users | Partnerships, enterprise outreach |

### 6.2 Community Edition Strategy

- **MIT License** — Tối đa adoption
- **GitHub Sponsors** — Donation-based support
- **Community Plugins** — Ecosystem growth
- **Documentation** — Comprehensive guides, video tutorials
- **Self-Hosted Focus** — Enterprise trust, no vendor lock-in

### 6.3 Conversion Funnel

```
Visit Website (10,000)
  ↓ 30%
Download/Self-Host (3,000)
  ↓ 20%
Active Users (600)
  ↓ 15%
Trial Pro (90)
  ↓ 40%
Paid Conversion (36)
  ↓ 80%
Retention (29)
```

**Key Metrics:**
- Free → Pro conversion: **3-5%**
- Pro → Team upgrade: **10-15%**
- Monthly churn: **< 5%**
- Net Revenue Retention: **> 120%**

---

## 7. Open Source Licensing

| Component | License | Ghi chú |
|-----------|---------|---------|
| **Core Engine** | MIT | Full source available |
| **Dashboard** | MIT | Full source available |
| **Backend Server** | MIT | Full source available |
| **Pro Features** | Proprietary | Source-available with license key |
| **Enterprise Features** | Proprietary | Custom license |

---

## 8. Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| **AI API cost vượt quá giá thuê bao** | Cao | Usage caps, caching, model tiering |
| **Open-source fork cạnh tranh** | Trung bình | Maintain brand, focus on UX, cloud value |
| **Enterprise không muốn self-host** | Thấp | Offer cloud + hybrid deployment |
| **Churn rate cao** | Cao | Annual discount, onboarding, value-add features |
| **Competitor price war** | Trung bình | Differentiate on multi-agent orchestration |

---

## 9. Pricing Experiments (Future)

| Experiment | Hypothesis | Metric |
|------------|------------|--------|
| **Usage-Based Pro** | "Pay per task completed" | Conversion rate |
| **Team Free Trial** | "14-day Team trial no credit card" | Upgrade rate |
| **Student Discount** | "50% off for students" | Brand awareness |
| **Annual Only Enterprise** | "Enterprise annual commitment discount" | Contract value |

---

*This document serves as the pricing milestone for MultiAgentManager. All tiers must deliver clear value at each price point while maintaining the brand promise: "Your Command Center for AI."*
