# RazorpayX FAV Demo — LendBridge Onboarding

A full-stack web application demonstrating **RazorpayX Fund Account Validation (FAV)** in a realistic lending firm onboarding flow. Users enter a UPI ID or phone number; the app calls RazorpayX FAV APIs to validate and return bank details for confirmation.

---

## Onboarding Flow

```
Welcome  →  Your Details  →  Verify Bank Account  →  Confirm Details  →  Success
```

1. **Welcome** — Loan product pitch with feature highlights
2. **Your Details** — Name, email, mobile, loan amount
3. **Verify Bank Account** — Enter UPI ID (e.g. `name@okhdfcbank`) or phone number
4. **Confirm Details** — Bank name, account number (masked), IFSC, registered name pulled via RazorpayX FAV
5. **Application Submitted** — Summary with application ID and next steps

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your RazorpayX credentials (optional — see Demo Mode below)
```

### 3. Run
```bash
npm start
# → http://localhost:3000
```

---

## Demo Mode (no API keys needed)

If `.env` is not configured, the app runs in **Demo Mode** with realistic mock data. A yellow "Demo Mode" badge appears in the header. All flows work end-to-end — great for demos and walkthroughs.

Demo UPI IDs to try:
| UPI ID | Bank |
|--------|------|
| `rahul@okhdfcbank` | HDFC Bank |
| `priya@okicici` | ICICI Bank |
| `amit@oksbi` | State Bank of India |
| `neha@ybl` | PhonePe / Yes Bank |
| `raj@paytm` | Paytm Payments Bank |
| `kiran@kotak` | Kotak Mahindra Bank |

---

## Live Mode (RazorpayX APIs)

Set these in `.env`:

```env
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXX
RAZORPAY_ACCOUNT_NUMBER=XXXXXXXXXXXXXXXXXX   # Your RazorpayX current account number
```

Get credentials from [RazorpayX Dashboard → Settings → API Keys](https://dashboard.razorpay.com/app/keys).

### What the live API returns for VPA validation

RazorpayX FAV for VPA (UPI ID) validates the address and returns:
- **Registered name** on the UPI account
- **Account status** — `active` / `inactive` / `invalid`
- **Fund Account ID** and **Validation ID** for audit trail

> Note: The raw bank account number and IFSC are not exposed by the VPA FAV API — these remain private to the account holder. In live mode the app shows registered name + status. In demo mode, illustrative masked account details are shown.

---

## API Reference

### `GET /api/config`
Returns `{ "demo": true|false }` — whether the server is in demo or live mode.

### `POST /api/validate`
Validates a UPI ID or phone number via RazorpayX FAV.

**Request body:**
```json
{
  "type":  "upi",              // "upi" | "phone"
  "value": "rahul@okhdfcbank", // UPI ID or 10-digit phone number
  "name":  "Rahul Kumar",
  "email": "rahul@company.com",
  "phone": "9876543210"
}
```

**Response (success):**
```json
{
  "success": true,
  "demo": false,
  "data": {
    "vpa": "rahul@okhdfcbank",
    "bankName": "HDFC Bank",
    "bankColor": "#004C8F",
    "registeredName": "Rahul Kumar",
    "accountStatus": "active",
    "accountVerified": true,
    "fundAccountId": "fa_XXXXXXXXXXXXXXXXXX",
    "validationId":  "fav_XXXXXXXXXXXXXXXXXX",
    "accountNumber": "50XXXXXXXX6789",   // demo mode only
    "ifscCode":      "HDFC0001234"       // demo mode only
  }
}
```

---

## RazorpayX API Flow (Live Mode)

```
1. POST /contacts              → Create applicant contact
2. POST /fund_accounts         → Create fund account with VPA
3. POST /fund_accounts/validation → Trigger FAV (penny-drop equivalent for UPI)
4. GET  /fund_accounts/validation/:id → Poll until terminal status
```

---

## Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla HTML/CSS/JS (no framework, no build step)
- **Fonts:** Inter (Google Fonts)
- **External APIs:** RazorpayX Fund Account Validation

---

## Project Structure

```
rzpx-fav-demo/
├── server.js          # Express server + RazorpayX API integration
├── package.json
├── .env.example       # Config template
└── public/
    ├── index.html     # Multi-step onboarding UI
    ├── style.css      # Custom CSS (fintech design)
    └── app.js         # Frontend state machine + API calls
```
