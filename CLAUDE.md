# rzpx-fav-demo — Project Guide

## Project Overview

**LendBridge** is a full-stack demo app showcasing RazorpayX Fund Account Validation (FAV) in a realistic lending firm onboarding flow. It is used both by the Razorpay sales team in live demos and by prospective customers evaluating RazorpayX FAV directly.

**Stack:** Node.js + Express backend · Vanilla HTML/CSS/JS frontend (no framework, no build step)
**Entry points:** `server.js` (backend), `public/index.html` + `public/style.css` + `public/app.js` (frontend)
**Default port:** 3000

## Running the App

```bash
npm install
cp .env.example .env   # optional — works without credentials in Demo Mode
npm start              # or: npm run dev (nodemon)
# → http://localhost:3000
```

Demo Mode is active when `.env` credentials are absent. All flows work end-to-end with mock data.

## Design Context

### Users
Two equally important audiences:
1. **Razorpay sales team** — running live demos to prospects in calls or events. The app must be instantly impressive, work flawlessly without real credentials, and clearly communicate the FAV value proposition.
2. **Prospective customers** — business owners or developers evaluating RazorpayX FAV. They need to understand the product quickly and feel confident about the technology.

**Job to be done:** Demonstrate that bank account verification via UPI is instant, seamless, and zero-friction compared to traditional penny drop or NACH mandate flows.

### Brand Personality
**Trustworthy · Modern · Fast**

LendBridge should feel like a polished, credible fintech — not a toy demo. Every detail signals reliability. The experience should move quickly without feeling rushed. Financial anxiety is real; the UI should reduce it, not add to it.

### Aesthetic Direction
**Refine, don't reinvent.** The current blue/white card layout with Inter typography is correct. Future improvements should polish what exists: tighten spacing, elevate micro-interactions, improve typographic hierarchy, and ensure every element earns its place. Avoid gratuitous decoration.

**Existing design tokens (CSS variables in `style.css`):**
- Primary: `#1D4ED8` / hover `#1E40AF` / light `#EFF6FF`
- Success: `#059669` / bg `#ECFDF5`
- Warning: `#D97706` / bg `#FFFBEB`
- Danger: `#DC2626` / bg `#FEF2F2`
- Text: primary `#111827` · secondary `#6B7280` · muted `#9CA3AF`
- Border: `#E5E7EB` · Page bg: `#F3F4F6` · Card bg: `#FFFFFF`
- Radius: `12px` (card) · `8px` (inputs/buttons)
- Font: Inter 400/500/600/700/800

### Design Principles

1. **Trust through detail.** Every verification step, badge, and status indicator reinforces that this is real, secure, and NPCI-backed. Never leave users wondering if something worked.

2. **Speed is a feature.** Loading states, progress indicators, and transitions should feel snappy and purposeful — not just spinners. Reflect the actual speed of the FAV API.

3. **Demo-safe by default.** All UI states must work perfectly in Demo Mode. If a feature can't be demoed without live credentials, it shouldn't ship or must have a convincing mock path.

4. **Mobile-first, vanilla-always.** Design for a 375px viewport first, then scale up to 640px. No frameworks, no build step. Every interaction must work with plain HTML/CSS/JS.

5. **Accessible and inclusive.** Target WCAG AA as a minimum: sufficient color contrast, keyboard navigation, visible focus states, and screen reader-friendly semantics. Financial products must be usable by everyone.
