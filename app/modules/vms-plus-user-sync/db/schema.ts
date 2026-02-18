/**
 * VMS PLUS USER SYNC Module - Database Schema
 * Defines the SQL Server table structures for user data synchronization
 */

export const VMS_SCHEMA = {
  // Main table for storing synced users
  vmsUsers: `
    CREATE TABLE VMS_Users (
      UserID INT PRIMARY KEY IDENTITY(1,1),
      Email NVARCHAR(255) NOT NULL UNIQUE,
      FirstName NVARCHAR(100),
      LastName NVARCHAR(100),
      Department NVARCHAR(100),
      Status NVARCHAR(50),
      CreatedAt DATETIME DEFAULT GETDATE(),
      UpdatedAt DATETIME DEFAULT GETDATE(),
      SyncedFromFile NVARCHAR(255),
      SyncBatchID INT
    )
  `,

  // Table for tracking sync operations
  syncHistory: `
    CREATE TABLE VMS_SyncHistory (
      SyncID INT PRIMARY KEY IDENTITY(1,1),
      FileName NVARCHAR(255) NOT NULL,
      UploadedAt DATETIME DEFAULT GETDATE(),
      TotalRecords INT,
      SuccessCount INT,
      FailureCount INT,
      Status NVARCHAR(50),
      ErrorDetails NVARCHAR(MAX),
      UploadedByUser NVARCHAR(255),
      SyncBatchID INT UNIQUE
    )
  `,

  // Table for tracking individual record errors
  errorLog: `
    CREATE TABLE VMS_SyncErrorLog (
      ErrorID INT PRIMARY KEY IDENTITY(1,1),
      SyncID INT,
      RowNumber INT,
      ErrorMessage NVARCHAR(MAX),
      ProblematicData NVARCHAR(MAX),
      FOREIGN KEY (SyncID) REFERENCES VMS_SyncHistory(SyncID)
    )
  `,
};

export const VMS_INITIALIZATION_QUERIES = [
  // Create users table
  VMS_SCHEMA.vmsUsers,
  // Create sync history table
  VMS_SCHEMA.syncHistory,
  // Create error log table
  VMS_SCHEMA.errorLog,
  // Create index on Email for faster lookups
  'CREATE UNIQUE NONCLUSTERED INDEX IX_VMS_Users_Email ON VMS_Users(Email)',
  // Create index on SyncBatchID for faster lookups
  'CREATE NONCLUSTERED INDEX IX_VMS_SyncHistory_BatchID ON VMS_SyncHistory(SyncBatchID)',
];

export const EXPECTED_CSV_HEADERS = [
  'Email',
  'FirstName',
  'LastName',
  'Department',
  'Status',
];
