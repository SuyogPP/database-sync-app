'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ModuleCard } from '@/components/module-card';
import { Spinner } from '@/components/ui/spinner';
import { LogOut } from 'lucide-react';

interface Session {
  userId: string;
  username: string;
}

const modules = [
  {
    title: 'VMS PLUS USER SYNC',
    description: 'Synchronize user data from Excel/CSV files to the VMS database',
    href: '/modules/vms-plus-user-sync',
    badge: 'Active',
  },
];

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('[v0] Logout error:', error);
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
            <h1 className="text-2xl font-bold">Database Data SYNC APP</h1>
            {session && (
              <p className="text-sm text-muted-foreground">Welcome, {session.username}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold">Available Modules</h2>
          <p className="text-muted-foreground">Select a module to manage data synchronization</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard
              key={module.href}
              title={module.title}
              description={module.description}
              href={module.href}
              badge={module.badge}
            />
          ))}
        </div>

        <section className="mt-12 rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Quick Links</h2>
          <div className="flex flex-wrap gap-4">
            <Link href="/modules/vms-plus-user-sync/tests">
              <Button variant="secondary">Database Test Page</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
