<div align="center">
  <img src="logo.png" alt="StellarSettle Logo" width="200"/>

  # StellarSettle Web App

  **Web interface for decentralized invoice financing and creator-key markets on Stellar**

  [![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
  [![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
  [![Stellar](https://img.shields.io/badge/Stellar-testnet-0066CC)](https://stellar.org)
</div>

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Feature Areas](#feature-areas)
  - [Authentication & Wallet](#authentication--wallet)
  - [KYC](#kyc)
  - [Invoice Marketplace (Sellers & Investors)](#invoice-marketplace-sellers--investors)
  - [Creator Keys](#creator-keys)
  - [Admin Panel](#admin-panel)
  - [Notifications & Activity](#notifications--activity)
- [API Layer](#api-layer)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Continuous Integration](#continuous-integration)
- [Contributing](#contributing)
- [License](#license)

## Overview

StellarSettle is a Next.js (App Router) frontend built on two related product surfaces:

1. **Invoice financing marketplace** — sellers publish invoices for funding, investors browse and invest, funded invoices are tracked through settlement and payout, all gated behind a KYC flow.
2. **Creator Keys** — a tokenized creator-economy layer: buyable/burnable "keys" per creator with governance voting, vesting schedules, whitelisting, dividend distribution, and admin-controlled trading pauses/timelocks.

Both surfaces share a wallet-based auth layer (Stellar via Freighter), a common API client (`lib/api/index.ts`), and an admin panel that reviews invoices, manages settlements, and controls key trading.

> Note: this Readme was rewritten from the actual current codebase (routes, `lib/api` exports, `package.json` scripts) rather than the project's original template copy, which described only the invoice-marketplace half and referenced scripts/tooling (Playwright e2e, a11y tests, Docker, Vercel CLI steps) that aren't present in this repo. See [Getting Started](#getting-started) and [Available Scripts](#available-scripts) below for what actually exists today.

## Tech Stack

| Concern | Library |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack dev server) |
| UI runtime | React 19 |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`) |
| Component primitives | Radix UI + `radix-ui`, styled as shadcn/ui ("New York" style) |
| Icons | lucide-react |
| Data fetching / cache | TanStack React Query 5 |
| HTTP client | axios |
| Forms | React Hook Form + `@hookform/resolvers` |
| Validation | Zod |
| Charts | Recharts |
| Dates | date-fns |
| Toasts | sonner |
| Theming | next-themes |
| Stellar wallet | `@stellar/freighter-api` |
| Stellar SDK | `stellar-sdk` |
| Unit/component testing | Vitest 4 + Testing Library (React, DOM, user-event) + jsdom |
| Lint | ESLint (`eslint-config-next`) |

## Project Structure

```
app/
├── page.tsx                    # Landing page — top-investors leaderboard + recently-viewed invoices
├── layout.tsx, error.tsx, not-found.tsx, globals.css
├── (auth)/
│   ├── connect-wallet/         # Freighter connection step
│   ├── login/
│   └── register/
├── (dashboard)/
│   ├── seller/                 # Seller dashboard
│   │   ├── edit/[id]/          # Edit a published invoice
│   │   ├── invoices/[id]/edit/
│   │   └── publish/            # Publish flow + success page
│   └── investor/               # Investor dashboard (portfolio)
│       └── notifications/
├── admin/
│   ├── invoices/                # Admin invoice queue
│   └── review/                  # Admin invoice review
├── kyc/
│   ├── start/
│   ├── reapply/
│   └── confirmed/
├── keys/[keyId]/                # Creator key detail page
├── marketplace/
│   └── [id]/                    # Invoice detail
├── profile/
└── api/                         # (currently unused — .gitkeep only; the app calls an external API via lib/api)

components/
├── ui/                # shadcn/ui primitives: button, card, input, select, dialog(dropdown/popover), badge, skeleton, sonner, switch, textarea, separator, label
├── layout/             # Navbar, NotificationBellBadge, GoToMarketplaceButton
├── marketplace/        # invoice-card, filter-bar/FilterPanel, countdown-timer, recently-viewed, TopInvestorsLeaderboard
├── invoices/           # PublishInvoiceForm, EditInvoiceForm, InvoiceDetail, InvestDialog/InvestmentModal, DocumentUpload/DocumentPreview, FundingProgressBar, InvoiceStatusBadge, SettlementReturnCard, ShareInvoiceButton, ErrorBoundary
├── dashboard/           # SellerDashboard, InvestorPortfolio, PositionCard, PayoutHistoryTable, KycStatusBanner, KycSubmissionForm, NotificationList/Preferences, OnboardingChecklist, UserProfile, WalletActivityFeed, VestingProgressWidget, KeyTransferModal, HoldingActionsMenu
├── keys/                # BuyKeyPanel, CreatorKeyDetail, CreatorRevenueSection, CreatorVestingSection, GovernanceTab, VoteModal, CreateProposalModal, SupplyCapSection/Settings, WhitelistManager, BurnKeyModal, DistributeDividendsPanel
├── admin/               # AdminInvoiceReview(s), AdminSettlements, AuditLogViewer, TimelockProposalsPanel, TradingControlsPanel
├── wallet/              # WalletChip
└── providers.tsx        # App-wide providers (React Query, theming, etc.)

context/
└── AuthContext.tsx      # Wallet/session auth state

hooks/                   # One hook per data domain — useAuth, useStellarWallet, useInvoices, useInvestments,
                          # usePortfolio, useSellerDashboard, useCreatorKeys, useCreatorRevenue, useVesting,
                          # useWhitelist, useTimelockProposals, useTradingPause, useWalletActivity,
                          # useNotifications, useNotificationPreferences, useLeaderboard, useRecentlyViewed,
                          # useCountdown, usePageTitle, usePageLoadPerformanceLog

lib/
├── api/index.ts          # Single API client module — every network call + response/request type (see below)
├── stellar/index.ts       # connectWallet/getNetwork/getAddress/truncateAddress via Freighter
├── auth.ts, format.ts, logger.ts, performance-logger.ts, portfolio.ts, recentlyViewed.ts, utils.ts
└── validation/            # deadline.ts, face-value.ts, investment-amount.ts (Zod schemas)
```

## Feature Areas

### Authentication & Wallet

- `(auth)/connect-wallet`, `(auth)/login`, `(auth)/register` handle onboarding.
- `lib/stellar/index.ts` wraps `@stellar/freighter-api`: `connectWallet()`, `getNetwork()`, `getAddress()`, plus a `truncateAddress()` display helper.
- `context/AuthContext.tsx` + `hooks/useAuth.ts` / `useStellarWallet.ts` hold the session/wallet state consumed across the app (e.g. `components/wallet/WalletChip.tsx` in the navbar).

### KYC

- `app/kyc/start`, `app/kyc/reapply`, `app/kyc/confirmed` implement the seller KYC flow.
- `submitKyc()` and `fetchSellerKycStatus()` in `lib/api/index.ts`; status is one of the values in `SellerKycStatusValue`, surfaced via `KycStatusBanner`/`KycSubmissionForm`.

### Invoice Marketplace (Sellers & Investors)

- **Sellers**: `(dashboard)/seller` — publish (`PublishInvoiceForm`, `publishInvoice()`), edit, and track invoices via `SellerDashboard`/`fetchSellerDashboard()`.
- **Investors**: `/marketplace` browse + filter (`FilterPanel`, `filter-bar`), `/marketplace/[id]` detail + invest (`InvestDialog`/`InvestmentModal` → `investInInvoice()`), `(dashboard)/investor` portfolio (`InvestorPortfolio`, `fetchPortfolio()`), payout history (`PayoutHistoryTable`, `fetchInvestorPayouts()`).
- Invoices carry `status`: `"open" | "funded" | "settled" | "rejected" | "draft"`, a `yield_percentage`, and support position transfer between investors (`transferInvoicePosition()`).
- Documents attach via `uploadDocumentToIpfs()` (`DocumentUpload`/`DocumentPreview`).
- A leaderboard (`TopInvestorsLeaderboard`, `useLeaderboard`) and a recently-viewed list (`useRecentlyViewed`, backed by `lib/recentlyViewed.ts`) appear on the landing page.

### Creator Keys

A parallel tokenized system, per creator:

- **Buying/burning**: `BuyKeyPanel` → `buyCreatorKey()`; `BurnKeyModal` → `burnCreatorKey()`; transfer via `KeyTransferModal` → `transferCreatorKey()`.
- **Supply**: `KeySupply`, `SupplyCapSection`/`SupplyCapSettings` → `fetchKeySupply()`, `updateKeySupplyCap()`.
- **Governance**: `GovernanceTab`, `CreateProposalModal`, `VoteModal` → `fetchKeyProposals()`, `createGovernanceProposal()`, `castGovernanceVote()`.
- **Vesting**: `VestingProgressWidget`, `CreatorVestingSection`, `useVesting` → `fetchVestingSchedule()`, `claimVestedKeys()`.
- **Whitelisting**: `WhitelistManager`, `useWhitelist` → `fetchKeyWhitelistStatus()`, `fetchKeyWhitelist()`, `addWhitelistAddress()`, `removeWhitelistAddress()`, `updateWhitelistMode()`.
- **Revenue & dividends**: `CreatorRevenueSection`, `useCreatorRevenue` → `fetchCreatorRevenue()` (with `MonthlyRevenue` breakdowns); `DistributeDividendsPanel` → `distributeDividend()`.
- `app/keys/[keyId]` is the public creator-key detail page (`CreatorKeyDetail`, `fetchCreatorKeyDetail()`).

### Admin Panel

`app/admin` (invoice queue, review) plus components under `components/admin/`:

- **Invoice review**: `AdminInvoiceReview(s)` → `fetchAdminInvoices()`, `approveAdminInvoice()`, `rejectAdminInvoice()`.
- **Settlements**: `AdminSettlements` → `fetchSettlements()`, `proposeSettlement()`, `approveSettlement()`.
- **Key trading controls**: `TradingControlsPanel`, `useTradingPause` → `fetchAdminKeyControls()`, `proposeKeyPause()`, `approveKeyPause()` (trading status: `"active" | "pause_pending" | "paused"`).
- **Timelock proposals**: `TimelockProposalsPanel`, `useTimelockProposals` → `fetchTimelockProposals()`, `executeTimelockProposal()`, `cancelTimelockProposal()`.
- **Audit log**: `AuditLogViewer` → `fetchAuditLog()`.

### Notifications & Activity

- `NotificationList`, `NotificationPreferences`, `NotificationBellBadge`, `useNotifications`/`useNotificationPreferences` → `fetchNotificationPreferences()`, `updateNotificationPreference()`. Notification events: `"new_invoice" | "funding_milestone" | "settlement"`; channels: `"email" | "in_app"`.
- `WalletActivityFeed`, `useWalletActivity` → `fetchWalletActivity()` (typed `WalletActivityEvent`/`WalletActivityType`).

## API Layer

`lib/api/index.ts` is the single module every hook/component calls into for network access — it has no framework dependency of its own (plain `fetch`/`axios` + typed request/response interfaces) and is the first place to look when tracing a feature end-to-end. It centralizes: invoices, protocol status, notifications, IPFS document upload, portfolio, seller dashboard/KYC, admin invoice + settlement + key-control + timelock + audit endpoints, creator-key detail/governance/whitelist/supply/vesting/revenue, payouts, and wallet activity — see the file directly for exact request/response shapes; every exported function and type is grep-able there in one place (`export async function` / `export interface`).

## Getting Started

### Prerequisites

- Node.js (a version compatible with Next.js 15 / React 19 — Node 18+ is the practical floor)
- A Stellar wallet browser extension for local testing (Freighter)

### Installation

```bash
npm install
cp .env.example .env.local
# edit .env.local with real values
npm run dev
# open http://localhost:3000
```

`npm run dev` uses Next.js with Turbopack.

## Environment Variables

From `.env.example`:

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_API_VERSION=v1

# Stellar
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Smart Contracts
NEXT_PUBLIC_ESCROW_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_TOKEN_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

## Available Scripts

Exactly what's defined in `package.json` — nothing more:

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | `next lint` |
| `npm run type-check` | `tsc --noEmit` |
| `npm test` | `vitest run` |
| `npm run shadcn:add` | Installs the full shadcn/ui component set (form, dialog, sheet, toast, table, tabs, tooltip, etc.) beyond the base components already in `components/ui/` — run `npm cache clean --force` first if you hit a "Lock compromised"/npm cache error |

There is no `test:e2e`, `test:a11y`, `test:coverage`, Docker, or Vercel-CLI script in this repo at present — if you need those workflows, add them rather than assuming they exist.

## Testing

- **Runner**: Vitest 4, `jsdom` environment, configured in `vitest.config.ts` / `vitest.setup.ts`.
- **Component testing**: `@testing-library/react` + `@testing-library/user-event` + `@testing-library/dom` + `@testing-library/jest-dom` matchers.
- Tests live alongside the code they cover, in `__tests__/` directories: `app/__tests__`, `app/admin/invoices/__tests__`, `app/marketplace/__tests__`, `components/*/__tests__`, `hooks/__tests__`, `lib/__tests__`, `lib/validation/__tests__`, `context/__tests__`.
- Run everything with `npm test`.

## Continuous Integration

GitHub Actions workflows in `.github/workflows/`:

- `app-ci.yml` / `ci.yml` — lint, type-check, test, build on PRs.
- `pr-target-check.yml` — enforces the branch-targeting rule below (PRs against `main` are closed automatically).

## Contributing

Full detail in [CONTRIBUTING.md](CONTRIBUTING.md); the essentials:

- **`dev` is the default/active branch.** `main` is production-only. Branch off `dev`, and target `dev` in your PR — a PR opened against `main` is closed automatically.
- Branch naming: `feature/…`, `fix/…`, `docs/…`, `test/…`, `refactor/…`, `chore/…`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(scope): …`, `fix(scope): …`).
- Before opening a PR, run locally (see [DEVELOPMENT.md](DEVELOPMENT.md)): `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test`.
- PRs to `dev` need CI green + 1 approval; `dev` → `main` release PRs need 2 approvals (maintainer-driven; contributors don't need to manage releases).

## License

No `LICENSE` file is currently present in this repository. Treat licensing as unspecified until the maintainers add one — don't assume MIT (or any other license) from this document alone.

---

Built on Stellar.
