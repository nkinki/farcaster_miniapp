# Neon Database Setup

## 1. Create Neon Database

1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project
3. Copy the connection string from the dashboard

## 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
DATABASE_URL="postgresql://username:password@hostname:port/database?sslmode=require"
```

## 3. Run Database Migration

```bash
# Connect to your Neon database and run the migration
psql "your-neon-connection-string" -f migrations/001_create_promotions_table.sql
```

Or use the Neon SQL Editor to run the migration manually.

## 4. Database Schema

### Tables Created:

1. **promotions** - Stores promotion campaigns
2. **shares** - Tracks individual shares and rewards
3. **users** - User statistics and earnings

### Key Features:

- Automatic timestamp updates
- Foreign key relationships
- Indexes for performance
- Data validation constraints

## 5. API Endpoints

- `GET /api/promotions` - Get all active promotions
- `GET /api/promotions?fid=123` - Get user's promotions
- `POST /api/promotions` - Create new promotion
- `GET /api/shares?fid=123` - Get user's shares
- `POST /api/shares` - Create new share
- `GET /api/users?fid=123` - Get user stats
- `POST /api/users` - Create/update user

## 6. Deploy to Vercel

1. Add `DATABASE_URL` to Vercel environment variables
2. Deploy the application
3. The database will be automatically connected 