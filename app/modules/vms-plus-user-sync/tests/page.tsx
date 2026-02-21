'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, PlayCircle, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

export default function DatabaseTestPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [initError, setInitError] = useState('');
  const [initSuccess, setInitSuccess] = useState('');
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

  const handleRunTests = async () => {
    setTesting(true);
    setTestResults([]);
    setInitError('');
    setInitSuccess('');

    try {
      const response = await fetch('/modules/vms-plus-user-sync/api/tests', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setTestResults(data.results || []);
      } else {
        setInitError(data.error || 'Failed to run tests');
      }
    } catch (error) {
      console.error('[v0] Test error:', error);
      setInitError('An error occurred while running tests');
    } finally {
      setTesting(false);
    }
  };

  const handleInitializeSchema = async () => {
    setTesting(true);
    setInitError('');
    setInitSuccess('');

    try {
      const response = await fetch('/modules/vms-plus-user-sync/api/init', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setInitSuccess('Database schema initialized successfully');
        // Run tests again after initialization
        await new Promise((resolve) => setTimeout(resolve, 1000));
        handleRunTests();
      } else {
        setInitError(data.error || 'Failed to initialize schema');
      }
    } catch (error) {
      console.error('[v0] Init error:', error);
      setInitError('An error occurred while initializing the schema');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const passedTests = testResults.filter((t) => t.passed).length;
  const totalTests = testResults.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/modules/vms-plus-user-sync" className="text-muted-foreground hover:text-foreground">
            ← VMS PLUS USER SYNC
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Target Database Test Page</h1>
          <p className="text-muted-foreground mt-2">
            Test connectivity and schema integrity for the configured SQL Server.
            <br />
            <span className="text-xs italic">(Note: Synchronization history and error logs are stored in Supabase)</span>
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Test Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Test Controls</CardTitle>
              <CardDescription>Run connectivity and schema tests for the target database</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {initError && (
                <Alert variant="destructive">
                  <AlertDescription>{initError}</AlertDescription>
                </Alert>
              )}

              {initSuccess && (
                <Alert>
                  <AlertDescription className="text-green-700">{initSuccess}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleRunTests}
                  disabled={testing}
                  className="gap-2"
                >
                  {testing ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Running Tests...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      Run Tests
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleInitializeSchema}
                  disabled={testing}
                  variant="outline"
                  className="gap-2"
                >
                  {testing ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Initialize Schema
                    </>
                  )}
                </Button>
              </div>

              {totalTests > 0 && (
                <div className="text-sm text-muted-foreground">
                  Results: <span className="font-semibold">{passedTests}</span> of{' '}
                  <span className="font-semibold">{totalTests}</span> tests passed
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Test Results</h2>
              {testResults.map((result, idx) => (
                <Card key={idx} className={result.passed ? 'border-green-200' : 'border-red-200'}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {result.passed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{result.name}</h3>
                          <Badge variant={result.passed ? 'outline' : 'destructive'}>
                            {result.duration}ms
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Configuration Info */}
          <Card>
            <CardHeader>
              <CardTitle>Target Configuration</CardTitle>
              <CardDescription>SQL Server connectivity source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="rounded-md bg-muted p-3">
                  <p className="font-mono text-xs text-muted-foreground">
                    Module ID: <span className="text-foreground">vms-plus-user-sync</span>
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    Target DB: <span className="text-foreground">SQL Server (Configured)</span>
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  All synchronization history, user data, and error logs are stored in the target SQL Server database. Supabase is used only for storing the module's connection settings.
                </p>

                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <RefreshCw className="h-3 w-3" />
                  <span>Connectivity settings can be managed in the Module Configuration page.</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
