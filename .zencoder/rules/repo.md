---
description: Repository Information Overview
alwaysApply: true
---

# Farcaster Miniapp Information

## Summary
A Farcaster miniapp for tracking and ranking other miniapps, featuring real-time rankings, favorites, automatic updates, and a lottery system. The app provides analytics for Farcaster miniapps with category-based browsing and various promotional features.

## Structure
- **src/**: Main application code with React components, hooks, and utilities
- **public/**: Static assets and data files
- **prisma/**: Database schema and configuration
- **scripts/**: Automation scripts for notifications and lottery draws
- **migrations/**: SQL database migration files
- **lib/**: Shared library code for database access

## Language & Runtime
**Language**: TypeScript/JavaScript
**Version**: TypeScript 5.x
**Runtime**: Node.js (v22.x recommended)
**Framework**: Next.js 15.x
**Build System**: Next.js build system
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- `next`: ^15.4.2 - React framework
- `react`: 19.1.0 - UI library
- `@farcaster/auth-kit`: ^0.8.1 - Farcaster authentication
- `@farcaster/frame-sdk`: ^0.1.7 - Farcaster frame integration
- `@farcaster/miniapp-sdk`: ^0.1.8 - Farcaster miniapp integration
- `@prisma/client`: ^6.13.0 - Database ORM
- `@neondatabase/serverless`: ^1.0.1 - Serverless PostgreSQL client
- `wagmi`: ^2.16.1 - Web3 React hooks
- `viem`: ^2.33.2 - Ethereum library

**Development Dependencies**:
- `prisma`: ^6.13.0 - Database schema management
- `typescript`: ^5 - Type checking
- `eslint`: ^9 - Code linting
- `tailwindcss`: ^4 - CSS framework
- `hardhat`: ^2.26.1 - Ethereum development environment

## Build & Installation
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## Database
**Type**: PostgreSQL
**ORM**: Prisma
**Schema**: Located in `prisma/schema.prisma`
**Migrations**: SQL files in `migrations/` directory
**Connection**: Environment variable `DATABASE_URL`

## Environment Variables
**Required**:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXT_PUBLIC_FARCASTER_DOMAIN`: Farcaster domain for authentication
- `NEXT_PUBLIC_FARCASTER_RELAY`: Farcaster relay URL

**Optional**:
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: WalletConnect integration
- `EMAIL_SENDER`, `EMAIL_PASSWORD`, `EMAIL_RECIPIENT`: Email notification setup
- `NEYNAR_API_KEY`: Farcaster API access
- `BACKEND_WALLET_PRIVATE_KEY`: For claim signatures

## Automation
**GitHub Actions**: 
- Scheduled cron jobs for data updates and notifications
- Lottery draws and promotional notifications
- Configured in `.github/workflows/` directory

## Python Components
**Purpose**: Data processing and notifications
**Dependencies**: 
- `requests`: 2.31.0
- `psycopg2-binary`: 2.9.7
- `python-dotenv`: 1.0.0

## Main Entry Points
- `src/app/page.tsx`: Main application page
- `src/app/layout.tsx`: Root layout with providers
- `scripts/sendLottoNotifications.ts`: Lottery notification script
- `scripts/sendNotifications.ts`: General notification script