'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface SyncError {
  row: number;
  message: string;
  data: string;
}

interface SyncStatusDisplayProps {
  status: 'success' | 'partial' | 'error';
  totalRecords: number;
  successCount: number;
  failureCount: number;
  errors?: SyncError[];
  batchId?: string;
}

export function SyncStatusDisplay({
  status,
  totalRecords,
  successCount,
  failureCount,
  errors = [],
  batchId,
}: SyncStatusDisplayProps) {
  const successPercentage = totalRecords > 0 ? (successCount / totalRecords) * 100 : 0;

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900';
      case 'partial':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'success':
        return 'All records synchronized successfully!';
      case 'partial':
        return `${successCount} of ${totalRecords} records synchronized. ${failureCount} failed.`;
      case 'error':
        return 'Failed to synchronize records. Please check the errors below.';
    }
  };

  return (
    <Card className={`border ${getStatusColor()}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <CardTitle className="text-lg">Synchronization Status</CardTitle>
            <CardDescription>{getStatusMessage()}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {batchId && (
          <div className="text-sm">
            <span className="text-muted-foreground">Batch ID: </span>
            <span className="font-mono font-medium">{batchId}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-background/50 p-3">
            <p className="text-sm text-muted-foreground">Total Records</p>
            <p className="text-2xl font-bold">{totalRecords}</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
            <p className="text-sm text-muted-foreground">Successful</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{successCount}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/20">
            <p className="text-sm text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{failureCount}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Success Rate</span>
            <span>{successPercentage.toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${successPercentage}%` }}
            />
          </div>
        </div>

        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Errors:</h4>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {errors.slice(0, 10).map((error, idx) => (
                <Alert key={idx} variant="destructive" className="text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Row {error.row}:</strong> {error.message}
                  </AlertDescription>
                </Alert>
              ))}
              {errors.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  ... and {errors.length - 10} more errors
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
