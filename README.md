# Database Data SYNC APP

A modular, full-stack application for managing database data synchronization from multiple sources. The first module, **VMS PLUS USER SYNC**, handles syncing user data from uploaded Excel/CSV files to SQL Server.

## Architecture Overview

This application follows a strict separation of concerns:

1.  **Supabase**: Handles **Authentication** (Auth) and **Application Management** (Configuration). All module configurations (e.g., SQL Server connection details) are stored in Supabase tables.
2.  **Modules**: Independent units (like `vms-plus-user-sync`) that handle specific data synchronization tasks.
3.  **SQL Server**: The destination database where business data is synced to.

## Features

-   **Modular Architecture** - Extensible platform designed to support multiple data sync modules
-   **Admin Authentication** - Secure session-based authentication via **Supabase Auth**
-   **Dynamic Configuration** - Database connection settings are managed via the UI and stored in **Supabase**, allowing runtime updates without redeployment.
-   **File Upload** - Drag-and-drop support for Excel (.xlsx) and CSV files
-   **Data Validation** - Comprehensive validation before database insertion
-   **Row-Level Error Handling** - "Partial Success" model: valid records are synced while invalid ones are logged to **Supabase** for review.
-   **Sync History** - detailed logs of all sync operations stored in **Supabase**.
-   **Database Testing** - Built-in testing page for database connectivity and schema verification
-   **Responsive UI** - Mobile-friendly interface built with shadcn/ui

## Tech Stack

-   **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
-   **Backend**: Next.js API Routes
-   **Database (App State)**: Supabase (PostgreSQL)
-   **Database (Business Data)**: SQL Server with mssql driver
-   **Authentication**: Supabase Auth
-   **File Processing**: XLSX and PapaParse for Excel/CSV parsing

## Getting Started

### Prerequisites

-   Node.js 18+
-   SQL Server instance (local or remote)
-   pnpm (or npm/yarn)

### Installation

1.  Clone the repository and install dependencies:

    ```bash
    pnpm install
    ```

2.  Create a `.env.local` file based on `.env.local.example`:

    ```bash
    cp .env.local.example .env.local
    ```

3.  Configure your environment variables in `.env.local`:

    ```env
    # Supabase Configuration
    NEXT_PUBLIC_SUPABASE_URL=your-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

    # SQL Server Default Configuration (Fallback)
    # Note: Actual connection details can be overridden in the UI via Supabase
    SQL_SERVER=your-server-name
    SQL_DATABASE=DataSyncDB
    SQL_USER=sa
    SQL_PASSWORD=your-password
    ```

### Running Locally

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Initial Setup

1.  **Login**: Use an email and password from your Supabase project's Authentication table.
2.  **Configure Database**: Go to the Module Settings (e.g., VMS Sync -> Configuration) to set up SQL Server connection details. These are saved to Supabase.
3.  **Initialize Database**: Go to Dashboard → Database Tests → Click "Initialize Schema". This uses the config from Supabase.
4.  **Run Tests**: Click "Run Tests" to verify database connectivity.
5.  **Upload Data**: Use the VMS PLUS USER SYNC module to upload user data files.

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
      /config                       # Configuration UI & API
      /db
        schema.ts                   # Database schema definitions
        utils.ts                    # Database operations (Fetches config from Supabase)
        tests.ts                    # Database test utilities
      /api
        /upload                     # File upload endpoint
        /sync-history               # Sync history endpoint
        /tests                      # Database test endpoint
        /init                       # Schema initialization endpoint
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
  db.ts                             # Database connection manager (Supports dynamic config)
  session.ts                        # Session management
  utils.ts                          # Utility functions
```

## VMS PLUS USER SYNC Module

See [modules/vms-plus-user-sync/README.md](modules/vms-plus-user-sync/README.md) for detailed documentation.

### Expected File Format

Upload Excel or CSV files with the following columns:

| Column | Required | Type | Example |
| :--- | :--- | :--- | :--- |
| Email | Yes | String | user@example.com |
| FirstName | No | String | John |
| LastName | No | String | Doe |
| Department | No | String | Engineering |
| Status | No | String | Active |

**Valid Status values**: `Active`, `Inactive`, `Pending`

## Error Handling

The application handles various error scenarios:

1.  **File Validation Errors** - Invalid file format or missing required columns
2.  **Data Validation Errors** - Invalid email format, missing required fields
3.  **Database Errors** - Connection issues, constraint violations
4.  **Row-Level Errors** - Individual records that fail to insert are logged to Supabase `VMS_SyncErrorLog`, allowing the rest of the file to process successfully.

## Security Considerations

-   **Session Security**: HTTP-only cookies with same-site protection
-   **SQL Injection Prevention**: Parameterized queries throughout
-   **Input Validation**: Comprehensive validation on all user inputs
-   **Authentication**: Protected routes require valid session
-   **File Validation**: File type and size validation
-   **Error Messages**: User-friendly errors without sensitive details

## Extending with New Modules

To add a new module, follow this structure:

1.  Create module directory: `/app/modules/your-module-name/`
2.  Define schema: `/app/modules/your-module-name/db/schema.ts`
3.  Create utilities: `/app/modules/your-module-name/db/utils.ts` (Ensure it fetches config from Supabase)
4.  Add API routes: `/app/modules/your-module-name/api/`
5.  Create main page: `/app/modules/your-module-name/page.tsx`
6.  Add to modules list in `/app/dashboard/page.tsx`

## Troubleshooting

### Database Connection Failed
-   Check the Configuration page in the module. Ensure the details provided there are correct.
-   Verify SQL_SERVER, SQL_USER, SQL_PASSWORD in `.env.local` if no dynamic config is set.
-   Ensure SQL Server is running and accessible
-   Check firewall rules for port 1433 (SQL Server default)
-   Use the Database Test Page for diagnostics

### Tables Don't Exist
-   Run "Initialize Schema" from the Database Test Page
-   Check that the database user has CREATE TABLE permissions

### Upload Fails with Validation Errors
-   Ensure your file has required columns: Email, FirstName, LastName, Department, Status
-   Check that Email column contains valid email addresses
-   Verify Status values are: Active, Inactive, or Pending

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
-   Database connection status
-   Query execution
-   Transaction handling
-   Validation errors

## Deployment

1.  Build the application:
    ```bash
    pnpm build
    ```

2.  Set production environment variables in your hosting platform

3.  Deploy to your hosting service (Vercel, etc.)

## License

This project is proprietary and confidential.

## Support

For issues or questions, refer to the Database Test Page for diagnostics or check the console logs for detailed error messages.
