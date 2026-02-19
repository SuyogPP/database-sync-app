'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface SyncRecord {
  id: string;
  file_name: string;
  created_at: string;
  total_records: number;
  success_count: number;
  failure_count: number;
  status: string;
  uploaded_by: string;
}

interface SyncHistoryProps {
  moduleApi: string;
}

export function SyncHistory({ moduleApi }: SyncHistoryProps) {
  const [history, setHistory] = useState<SyncRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${moduleApi}/api/sync-history`);
        const data = await response.json();

        if (response.ok) {
          setHistory(data.data || []);
        } else {
          setError(data.error || 'Failed to fetch sync history');
        }
      } catch (err) {
        console.error('[v0] Error fetching sync history:', err);
        setError('Failed to fetch sync history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [moduleApi]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'Partial':
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case 'Failed':
      case 'In Progress':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Success':
        return <Badge variant="outline" className="bg-green-50">Success</Badge>;
      case 'Partial':
        return <Badge variant="outline" className="bg-amber-50">Partial</Badge>;
      case 'Failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'In Progress':
        return <Badge variant="secondary">In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync History</CardTitle>
        <CardDescription>Recent file synchronization operations</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : error ? (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sync history yet. Upload a file to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Success</TableHead>
                  <TableHead className="text-center">Failed</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {record.file_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(record.created_at)}
                    </TableCell>
                    <TableCell className="text-center">{record.total_records}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">
                      {record.success_count}
                    </TableCell>
                    <TableCell className="text-center text-red-600 font-medium">
                      {record.failure_count}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getStatusIcon(record.status)}
                        {getStatusBadge(record.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.uploaded_by}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
