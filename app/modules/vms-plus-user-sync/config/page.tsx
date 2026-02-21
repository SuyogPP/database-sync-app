'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Database, PlayCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

const formSchema = z.object({
    server: z.string().optional(),
    database: z.string().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
    connectionString: z.string().optional(),
}).refine(data => {
    return data.connectionString || (data.server && data.database);
}, {
    message: "Either Connection String or Server & Database are required",
    path: ["server"],
});

type FormValues = z.infer<typeof formSchema>;

export default function ConfigPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const router = useRouter();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            server: '',
            database: '',
            user: '',
            password: '',
            connectionString: '',
        },
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await fetch('/modules/vms-plus-user-sync/api/config');
                const data = await response.json();
                if (data.config) {
                    form.reset(data.config);
                }
            } catch (error) {
                console.error('[v0] Failed to fetch config:', error);
                toast.error('Failed to load configuration');
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, [form]);

    const onSubmit = async (values: FormValues) => {
        setSaving(true);
        try {
            const response = await fetch('/modules/vms-plus-user-sync/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: values }),
            });

            if (!response.ok) throw new Error('Failed to save');

            toast.success('Configuration saved successfully');
        } catch (error) {
            console.error('[v0] Save error:', error);
            toast.error('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        try {
            // We'll use the existing tests API but pass the temporary config
            const response = await fetch('/modules/vms-plus-user-sync/api/tests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: form.getValues() }),
            });

            const data = await response.json();

            const connectionTest = data.results?.find((r: any) => r.name === 'Database Connection');

            if (connectionTest?.passed) {
                toast.success('Connection test passed!');
            } else {
                toast.error(connectionTest?.message || 'Connection test failed');
            }
        } catch (error) {
            console.error('[v0] Test error:', error);
            toast.error('An error occurred during connection test');
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

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b">
                <div className="container mx-auto px-4 py-4">
                    <Link href="/modules/vms-plus-user-sync" className="text-muted-foreground hover:text-foreground">
                        ← VMS PLUS USER SYNC
                    </Link>
                    <h1 className="mt-1 text-2xl font-bold font-heading">Database Configuration</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage SQL Server connection settings for this module
                    </p>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Connection Settings
                            </CardTitle>
                            <CardDescription>
                                Configure how the application connects to your SQL Server instance.
                                Values here will override environment variables.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name="server"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Server</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. localhost" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="database"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Database</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. DataSyncDB" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name="user"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Username</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. sa" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Password</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" placeholder="••••••••" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-background px-2 text-muted-foreground">OR</span>
                                        </div>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="connectionString"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Connection String</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Server=localhost;Database=DataSyncDB;User Id=sa;Password=your_password;TrustServerCertificate=true"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Using a connection string will override individual fields above.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex gap-4 pt-4">
                                        <Button type="submit" disabled={saving}>
                                            {saving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                            Save Configuration
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleTestConnection}
                                            disabled={testing}
                                        >
                                            {testing ? <Spinner className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                                            Test Connection
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
