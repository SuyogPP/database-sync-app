'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UploadZone } from '@/components/upload-zone';
import { SyncStatusDisplay } from '@/components/sync-status-display';
import { SyncHistory } from '@/components/sync-history';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Zap } from 'lucide-react';

interface SyncResult {
  syncId: number;
  batchId: string;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ row: number; message: string; data: string }>;
}

export default function VMSPlusUserSync() {
  const [session, setSession] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (data.session) {
          setSession(data.session);
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('[v0] Session check error:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const handleFileSelected = async (file: File) => {
    setIsUploading(true);
    setUploadError('');
    setSyncResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/modules/vms-plus-user-sync/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof data.details === 'object'
            ? data.details.join(', ')
            : data.details || data.error;
        setUploadError(errorMessage || 'Upload failed');
        return;
      }

      setSyncResult(data.data);
    } catch (error) {
      console.error('[v0] Upload error:', error);
      setUploadError('An error occurred while uploading the file');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              ← Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-bold">VMS PLUS USER SYNC</h1>
            <p className="text-sm text-muted-foreground">
              Synchronize user data from Excel or CSV files
            </p>
          </div>
          <Link href="/modules/vms-plus-user-sync/tests">
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Database Tests
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          {/* Upload Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Upload New File</h2>
            </div>

            {uploadError && (
              <Alert variant="destructive">
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            <UploadZone
              onFileSelected={handleFileSelected}
              isLoading={isUploading}
              acceptedFormats=".xlsx,.csv"
            />
          </section>

          {/* Sync Status Section */}
          {syncResult && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Latest Sync Result</h2>
              <SyncStatusDisplay
                status={
                  syncResult.failureCount === 0
                    ? 'success'
                    : syncResult.successCount > 0
                      ? 'partial'
                      : 'error'
                }
                totalRecords={syncResult.totalRecords}
                successCount={syncResult.successCount}
                failureCount={syncResult.failureCount}
                errors={syncResult.errors}
                batchId={syncResult.batchId}
              />
            </section>
          )}

          {/* Sync History Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Sync History</h2>
            <SyncHistory moduleApi="/modules/vms-plus-user-sync" />
          </section>

          {/* File Format Guide */}
          <section className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 font-semibold">Expected File Format</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Your Excel or CSV file should contain the following columns:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Column</th>
                    <th className="text-left p-2 font-medium">Required</th>
                    <th className="text-left p-2 font-medium">Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2">Email</td>
                    <td className="p-2">Yes</td>
                    <td className="p-2 font-mono text-xs">user@example.com</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">FirstName</td>
                    <td className="p-2">No</td>
                    <td className="p-2 font-mono text-xs">John</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">LastName</td>
                    <td className="p-2">No</td>
                    <td className="p-2 font-mono text-xs">Doe</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2">Department</td>
                    <td className="p-2">No</td>
                    <td className="p-2 font-mono text-xs">Engineering</td>
                  </tr>
                  <tr>
                    <td className="p-2">Status</td>
                    <td className="p-2">No</td>
                    <td className="p-2 font-mono text-xs">Active</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Status values: <code>Active</code>, <code>Inactive</code>, <code>Pending</code>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
