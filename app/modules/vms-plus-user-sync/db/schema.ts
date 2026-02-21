/**
 * VMS PLUS USER SYNC Module - Database Schema
 * Defines the SQL Server table structures for user data synchronization
 */

export const VMS_SCHEMA = {
  // Main table for storing synced users
  UserMaster: `
    CREATE TABLE UserMaster (
      User_Id INT PRIMARY KEY IDENTITY(1,1),
      User_Name NVARCHAR(255),
      Email_Id NVARCHAR(255) NOT NULL UNIQUE,
      Full_name NVARCHAR(255),
      Company_ID INT,
      Dept_Name NVARCHAR(100),
      Status INT,
      Phone NVARCHAR(50),
      Role_ID INT,
      UserType NVARCHAR(100),
      Password NVARCHAR(255),
      CreatedAt DATETIME DEFAULT GETDATE(),
      UpdatedAt DATETIME DEFAULT GETDATE(),
      SyncBatchID INT
    )
  `,


  // Table for tracking sync operations
  // Note: Primary sync history is now stored in Supabase
  syncHistory: `
    CREATE TABLE VMS_SyncHistory (
      SyncID INT PRIMARY KEY IDENTITY(1,1),
      FileName NVARCHAR(255) NOT NULL,
      UploadedAt DATETIME DEFAULT GETDATE(),
      TotalRecords INT,
      SuccessCount INT,
      FailureCount INT,
      Status NVARCHAR(50),
      UploadedByUser NVARCHAR(255),
      SyncBatchID INT UNIQUE
    )
  `,

};

export const VMS_INITIALIZATION_QUERIES = [
  // Create UserMaster table
  VMS_SCHEMA.UserMaster,
  // Create index on Email_Id for faster lookups
  'CREATE UNIQUE NONCLUSTERED INDEX IX_UserMaster_Email ON UserMaster(Email_Id)',
];



export const EXPECTED_CSV_HEADERS = [
  'User_Name',
  'Full_name',
  'Password',
  'Email_Id',
  'Phone',
  'Role_ID',
  'Company_ID',
  'Status',
  'UserType',
];

