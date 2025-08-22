# JSON Places Import Guide

This guide explains how to import places data from JSON files into your Supabase database.

## Prerequisites

1. **Database Setup**: Apply the database migration to add German sports support
2. **Environment Variables**: Set up required Supabase environment variables
3. **Dependencies**: Install the tsx package for running the import script

## Step 1: Database Migration

First, you need to update your database schema to support the German sports from your JSON data:

```sql
-- Run this migration in your Supabase SQL editor
-- File: migrations/add-german-sports.sql

ALTER TYPE sport_type ADD VALUE IF NOT EXISTS 'fußball';
ALTER TYPE sport_type ADD VALUE IF NOT EXISTS 'tischtennis';
ALTER TYPE sport_type ADD VALUE IF NOT EXISTS 'boule';
ALTER TYPE sport_type ADD VALUE IF NOT EXISTS 'skatepark';
```

**Important**: After running this migration, you'll need to regenerate your TypeScript types from Supabase or manually update them as we've done.

## Step 2: Environment Setup

Make sure you have these environment variables set:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The service role key is needed for admin operations during import.

## Step 3: Install Dependencies

```bash
npm install tsx --save-dev
```

## Step 4: Prepare Your JSON Data

Your JSON file should follow this format:

```json
{
  "places": [
    {
      "attributes": {
        "name": "Place Name",
        "district": "District Name",
        "fußballplätze": "2",           // Number or null
        "platzbelag_fußball": "Wiese",   // Surface type for football
        "basketballplätze": "1",         // Number or null
        "bouleplätze": null,               // Number or null
        "skatepark_elemente": null,      // Number or null
        "tischtennisplatten": "3"        // Number or null
      },
      "geometry": {
        "x": 7.012481767734089,  // Longitude
        "y": 50.863084651420266  // Latitude
      }
    }
  ]
}
```

## Step 5: Run the Import

### Test with Sample Data First
```bash
npm run import-places data/sample-places.json
```

### Import Your Real Data
```bash
npm run import-places path/to/your/places.json
```

## Data Mapping

The import script maps your JSON fields as follows:

| JSON Field | Database Field | Notes |
|------------|----------------|-------|
| `attributes.name` | `places.name` | Place name |
| `attributes.district` | `places.district` | District/area |
| `geometry.x` | `places.longitude` | Longitude coordinate |
| `geometry.y` | `places.latitude` | Latitude coordinate |
| `attributes.fußballplätze` | `courts.quantity` | Creates football court if not null |
| `attributes.platzbelag_fußball` | `courts.surface` | Football court surface |
| `attributes.basketballplätze` | `courts.quantity` | Creates basketball court if not null |
| `attributes.bouleplätze` | `courts.quantity` | Creates boule court if not null |
| `attributes.skatepark_elemente` | `courts.quantity` | Creates skatepark if not null |
| `attributes.tischtennisplatten` | `courts.quantity` | Creates table tennis courts if not null |

## Import Process

1. **Duplicate Detection**: Checks for existing places within ~10m radius
2. **Place Creation**: Creates place record with basic info
3. **Court Creation**: Creates individual court records for each sport found
4. **Error Handling**: Logs and continues on errors, provides summary at end

## System User

The import script creates or uses a system user for attribution:
- **ID**: `00000000-0000-0000-0000-000000000000`
- **Name**: "System Import"
- **Purpose**: Attributed as the creator of imported places

You can modify the `SYSTEM_USER_ID` in the script if needed.

## Import Results

The script provides a detailed summary:
- ✅ Successful imports
- ⚠️ Skipped duplicates  
- ❌ Errors with details
- 📊 Total processed

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   Error: Missing Supabase configuration
   ```
   Solution: Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

2. **Database Enum Error**
   ```
   Error: invalid input value for enum sport_type
   ```
   Solution: Run the database migration to add German sports

3. **Permission Errors**
   ```
   Error: new row violates row-level security policy
   ```
   Solution: Ensure you're using the service role key, not anon key

4. **Invalid JSON Format**
   ```
   Error: Invalid JSON format
   ```
   Solution: Ensure your JSON has the `places` array at the root level

### Debug Mode

For detailed logging, you can modify the import script to log more information or run with verbose settings.

## Post-Import

After successful import:

1. **Verify Data**: Check the places appear correctly on your map
2. **Test Features**: Ensure sport icons and badges work with German sports  
3. **Performance**: Consider adding database indexes if you have many places

## Rollback

If you need to remove imported data:

```sql
-- Remove places imported from JSON (be careful!)
DELETE FROM places WHERE source = 'json_import';
```

## Next Steps

- Consider automating imports with cron jobs for regular data updates
- Add data validation rules for your specific use case
- Implement conflict resolution strategies for duplicate handling