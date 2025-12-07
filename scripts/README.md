# Development Utility Scripts

This directory contains standalone scripts for development, debugging, and data management tasks.

## Available Scripts

### Order Management
- **delete-orders.js** - Batch delete orders using Firebase Admin SDK
  - Requires: Firebase Admin credentials via `GOOGLE_APPLICATION_CREDENTIALS` or Application Default Credentials
  - Usage: `node scripts/delete-orders.js`
  - Deletes both `orders` and `orders_search` collections

- **delete-orders-client.js** - Batch delete orders using Firebase Client SDK
  - Requires: Firebase client config in `.env` (see `.env.example`)
  - Usage: `node scripts/delete-orders-client.js`
  - Alternative to Admin SDK for environments without service account access

### Debugging
- **debug-delivery-date.js** - Test delivery date calculation logic
  - Usage: `node scripts/debug-delivery-date.js`
  - Helps debug region-based delivery scheduling

### Data Conversion
- **convert-xlsx-to-csv.js** - Convert Excel files to CSV format
  - Usage: `node scripts/convert-xlsx-to-csv.js <input.xlsx> <output.csv>`
  - Useful for data imports and migrations

- **generate-test-xlsx.ts** - Generate test Excel files for development
  - Usage: `tsx scripts/generate-test-xlsx.ts`

## Environment Setup

Most scripts require environment variables from `.env`:
```bash
cp .env.example .env
# Edit .env with your credentials
```

See `.env.example` for required variables per script.

## Security Warning

⚠️ **Never commit `.env` files or credentials to version control.**
⚠️ **Order deletion scripts are destructive - use with caution in production.**
