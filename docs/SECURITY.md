# Security Guidelines

## Environment Variables

### Overview
All sensitive credentials and API keys must be stored in environment variables, never hardcoded in source files.

### Setup Instructions

1. **Copy the template**:
   ```bash
   cp .env.example .env
   ```

2. **Configure Firebase credentials** in `.env`:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. **Verify `.gitignore`** excludes `.env` files (already configured)

### Scripts Requiring Environment Variables

The following development scripts require Firebase credentials:

- **`delete-orders-client.js`** - Uses Firebase Client SDK
  - Requires all 6 Firebase environment variables
  - Validates variables on startup
  - Exits with error if any are missing

- **`delete-orders.js`** - Uses Firebase Admin SDK
  - Requires `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - Uses Application Default Credentials for authentication
  - Validates project ID on startup

### Security Best Practices

✅ **DO**:
- Store all credentials in `.env` file
- Use `.env.example` as a template
- Keep `.env` in `.gitignore`
- Rotate credentials regularly
- Use different credentials for development/production

❌ **DON'T**:
- Commit `.env` files to version control
- Hardcode API keys in source code
- Share credentials via chat/email
- Use production credentials in development
- Commit files with exposed secrets

### Verification

Run these checks to ensure no credentials are exposed:

```bash
# Search for Firebase API keys
grep -r "AIzaSy" --exclude-dir=node_modules --exclude-dir=.git .

# Search for project IDs
grep -r "synergyflow-pvqrj" --exclude-dir=node_modules --exclude-dir=.git .

# Verify .env is ignored
git check-ignore .env
```

### Emergency Response

If credentials are accidentally committed:

1. **Immediately rotate** all exposed credentials in Firebase Console
2. **Remove from git history**:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/file" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. **Force push** to remote (coordinate with team)
4. **Update** `.env` with new credentials
5. **Notify** team members to pull changes

### Environment Variable Reference

| Variable | Required By | Purpose |
|----------|-------------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | App, delete-orders-client.js | Firebase authentication |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | App, delete-orders-client.js | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | App, both scripts | Firebase project identifier |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | App, delete-orders-client.js | Firebase storage |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | App, delete-orders-client.js | Firebase messaging |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App, delete-orders-client.js | Firebase app identifier |

### Additional Resources

- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/basics)
- [Environment Variables in Next.js](https://nextjs.org/docs/basic-features/environment-variables)
- [.env.example](./.env.example) - Complete template
