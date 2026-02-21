# VMS PLUS USER SYNC Module

This module is responsible for synchronizing user data from uploaded Excel or CSV files into a SQL Server database. It leverages Supabase for configuration management and sync history tracking.

## Configuration

This module fetches its database connection configuration dynamically from **Supabase**.
-   **Config Table**: `module_configs`
-   **Module ID**: `vms-plus-user-sync`

You can update the configuration via the Module Settings page in the application UI. This allows you to point the module to different SQL Server instances without redeploying the application.

## Data Sync Flow

1.  **Upload**: User uploads an Excel or CSV file.
2.  **Validate**: File format and data rows are validated.
3.  **Fetch Config**: The module fetches the latest SQL Server connection details from Supabase.
4.  **Connect**: A connection pool is established to the target SQL Server.
5.  **Sync**:
    -   Valid records are inserted into the `UserMaster` table.
    -   Invalid records are logged to the `VMS_SyncErrorLog` table in **Supabase**.
    -   Sync progress and summary are stored in the `VMS_SyncHistory` table in **Supabase**.

## Database Schema

### SQL Server (Target)

#### `UserMaster`
Stores the active user data.
-   `UserID` (INT, PK)
-   `Email_Id` (NVARCHAR(255), UNIQUE)
-   `Full_name` (NVARCHAR(255))
-   `Password` (NVARCHAR(255))
-   `Phone` (NVARCHAR(50))
-   `Role_ID` (INT)
-   `Company_ID` (INT)
-   `Status` (INT)
-   `UserType` (NVARCHAR(100))
-   `SyncBatchID` (INT)

### Supabase (App State)

#### `sync_history` (public)
Tracks synchronization sessions.
-   `id`: UUID
-   `module_id`: Text
-   `file_name`: Text
-   `total_records`: Integer
-   `success_count`: Integer
-   `failure_count`: Integer
-   `status`: Text
-   `uploaded_at`: Timestamp
-   `uploaded_by`: Text
-   `batch_id`: Text

#### `VMS_SyncErrorLog`
Logs individual row failures.
-   `id`: UUID
-   `SyncID`: UUID (FK to sync_history.id)
-   `RowNumber`: Integer
-   `ErrorMessage`: Text
-   `ProblematicData`: JSONB

## API Endpoints

-   `POST /api/upload` - Processes the file upload.
-   `POST /api/config` - Updates module configuration.
-   `GET /api/config` - Retrieves current configuration.
-   `GET /api/sync-history` - Fetches past sync logs.
