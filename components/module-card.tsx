import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface ModuleCardProps {
  title: string;
  description: string;
  href: string;
  badge?: string;
}

export function ModuleCard({ title, description, href, badge }: ModuleCardProps) {
  return (
    <Link href={href}>
      <Card className="h-full cursor-pointer transition-all hover:shadow-lg hover:border-primary">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              {badge && <Badge className="mt-2">{badge}</Badge>}
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>{description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
