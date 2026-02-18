# Database Data SYNC APP

A modular, full-stack application for managing database data synchronization from multiple sources. The first module, **VMS PLUS USER SYNC**, handles syncing user data from uploaded Excel/CSV files to SQL Server.

## Features

- **Modular Architecture** - Extensible platform designed to support multiple data sync modules
- **Admin Authentication** - Session-based authentication with secure cookies
- **File Upload** - Drag-and-drop support for Excel (.xlsx) and CSV files
- **Data Validation** - Comprehensive validation before database insertion
- **Transaction Safety** - All-or-nothing database operations with automatic rollback
- **Sync History** - Track all synchronization operations with detailed results
- **Error Logging** - Detailed error tracking for failed records
- **Database Testing** - Built-in testing page for database connectivity and schema verification
- **Responsive UI** - Mobile-friendly interface built with shadcn/ui

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: SQL Server with mssql driver
- **Authentication**: Custom session-based with HTTP-only cookies
- **File Processing**: XLSX and PapaParse for Excel/CSV parsing

## Getting Started

### Prerequisites

- Node.js 18+
- SQL Server instance (local or remote)
- pnpm (or npm/yarn)

### Installation

1. Clone the repository and install dependencies:
```bash
pnpm install
```

2. Create a `.env.local` file based on `.env.local.example`:
```bash
cp .env.local.example .env.local
```

3. Configure your SQL Server connection in `.env.local`:
```env
SQL_SERVER=your-server-name
SQL_DATABASE=DataSyncDB
SQL_USER=sa
SQL_PASSWORD=your-password
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
SESSION_SECRET=your-random-secret
```

### Running Locally

Start the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Initial Setup

1. **Login**: Use the credentials from your `.env.local` file (default: admin/admin123)
2. **Initialize Database**: Go to Dashboard → Database Tests → Click "Initialize Schema"
3. **Run Tests**: Click "Run Tests" to verify database connectivity
4. **Upload Data**: Use the VMS PLUS USER SYNC module to upload user data files

## Project Structure

```
/app
  /api
    /auth                           # Authentication endpoints
      /login
      /logout
      /session
  /dashboard                        # Home screen with module cards
  /modules
    /vms-plus-user-sync
      /db
        schema.ts                   # Database schema definitions
        utils.ts                    # Database operations
        tests.ts                    # Database test utilities
      /api
        /upload                     # File upload endpoint
        /sync-history               # Sync history endpoint
        /tests                       # Database test endpoint
        /init                        # Schema initialization endpoint
      /tests
        page.tsx                    # Database test page
      page.tsx                      # Module main page
  /page.tsx                         # Login page
  /layout.tsx
  /middleware.ts
/components
  login-form.tsx                    # Login component
  module-card.tsx                   # Module card component
  upload-zone.tsx                   # File upload component
  sync-status-display.tsx           # Sync result display
  sync-history.tsx                  # Sync history table
/lib
  db.ts                             # Database connection manager
  session.ts                        # Session management
  utils.ts                          # Utility functions
```

## VMS PLUS USER SYNC Module

### Expected File Format

Upload Excel or CSV files with the following columns:

| Column | Required | Type | Example |
|--------|----------|------|---------|
| Email | Yes | String | user@example.com |
| FirstName | No | String | John |
| LastName | No | String | Doe |
| Department | No | String | Engineering |
| Status | No | String | Active |

**Valid Status values**: `Active`, `Inactive`, `Pending`

### Database Schema

#### VMS_Users
Main table storing synced user data
- `UserID` (INT, PK) - Unique identifier
- `Email` (NVARCHAR(255), UNIQUE) - Email address
- `FirstName` (NVARCHAR(100)) - First name
- `LastName` (NVARCHAR(100)) - Last name
- `Department` (NVARCHAR(100)) - Department
- `Status` (NVARCHAR(50)) - User status
- `CreatedAt` (DATETIME) - Creation timestamp
- `UpdatedAt` (DATETIME) - Last update timestamp
- `SyncedFromFile` (NVARCHAR(255)) - Source file name
- `SyncBatchID` (INT) - Sync batch reference

#### VMS_SyncHistory
Tracks synchronization operations
- `SyncID` (INT, PK) - Unique sync operation ID
- `FileName` (NVARCHAR(255)) - Uploaded file name
- `UploadedAt` (DATETIME) - Upload timestamp
- `TotalRecords` (INT) - Total records in file
- `SuccessCount` (INT) - Successfully synced records
- `FailureCount` (INT) - Failed records
- `Status` (NVARCHAR(50)) - Sync status (Success, Partial, Failed)
- `ErrorDetails` (NVARCHAR(MAX)) - Error summary
- `UploadedByUser` (NVARCHAR(255)) - Username who uploaded
- `SyncBatchID` (INT, UNIQUE) - Unique batch identifier

#### VMS_SyncErrorLog
Detailed error tracking for failed records
- `ErrorID` (INT, PK) - Error identifier
- `SyncID` (INT, FK) - Reference to sync operation
- `RowNumber` (INT) - Row number in file
- `ErrorMessage` (NVARCHAR(MAX)) - Error description
- `ProblematicData` (NVARCHAR(MAX)) - Row data as JSON

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/logout` - Logout and destroy session
- `GET /api/auth/session` - Get current session

### VMS PLUS USER SYNC
- `POST /modules/vms-plus-user-sync/api/upload` - Upload and sync file
- `GET /modules/vms-plus-user-sync/api/sync-history` - Get sync history
- `POST /modules/vms-plus-user-sync/api/tests` - Run database tests
- `POST /modules/vms-plus-user-sync/api/init` - Initialize database schema

## Error Handling

The application handles various error scenarios:

1. **File Validation Errors** - Invalid file format or missing required columns
2. **Data Validation Errors** - Invalid email format, missing required fields
3. **Database Errors** - Connection issues, constraint violations
4. **Row-Level Errors** - Individual records that fail to insert (partial success)

All errors are logged with detailed information for debugging.

## Database Testing

Use the Database Test Page to verify:
1. SQL Server connectivity
2. VMS tables exist and are accessible
3. Table schema integrity
4. Sample data insertion capability

## Security Considerations

- **Session Security**: HTTP-only cookies with same-site protection
- **SQL Injection Prevention**: Parameterized queries throughout
- **Input Validation**: Comprehensive validation on all user inputs
- **Authentication**: Protected routes require valid session
- **File Validation**: File type and size validation
- **Error Messages**: User-friendly errors without sensitive details

## Extending with New Modules

To add a new module, follow this structure:

1. Create module directory: `/app/modules/your-module-name/`
2. Define schema: `/app/modules/your-module-name/db/schema.ts`
3. Create utilities: `/app/modules/your-module-name/db/utils.ts`
4. Add API routes: `/app/modules/your-module-name/api/`
5. Create main page: `/app/modules/your-module-name/page.tsx`
6. Add to modules list in `/app/dashboard/page.tsx`

## Troubleshooting

### Database Connection Failed
- Verify SQL_SERVER, SQL_USER, SQL_PASSWORD in `.env.local`
- Ensure SQL Server is running and accessible
- Check firewall rules for port 1433 (SQL Server default)
- Use the Database Test Page for diagnostics

### Tables Don't Exist
- Run "Initialize Schema" from the Database Test Page
- Check that the database user has CREATE TABLE permissions

### Upload Fails with Validation Errors
- Ensure your file has required columns: Email, FirstName, LastName, Department, Status
- Check that Email column contains valid email addresses
- Verify Status values are: Active, Inactive, or Pending

## Development

### Available Scripts

```bash
pnpm dev       # Start development server
pnpm build     # Build for production
pnpm start     # Start production server
pnpm lint      # Run ESLint
```

### Database Debugging

Enable detailed logging by checking the console for `[v0]` prefixed messages. These provide insights into:
- Database connection status
- Query execution
- Transaction handling
- Validation errors

## Deployment

1. Build the application:
```bash
pnpm build
```

2. Set production environment variables in your hosting platform

3. Deploy to your hosting service (Vercel, etc.)

## License

This project is proprietary and confidential.

## Support

For issues or questions, refer to the Database Test Page for diagnostics or check the console logs for detailed error messages.
