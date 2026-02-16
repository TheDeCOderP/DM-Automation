import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { Suspense } from "react";
import { 
  Shield, 
  Clock, 
  User, 
  Globe, 
  Monitor, 
  Database,
  AlertCircle,
  Loader2
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Badge,
} from "@/components/ui/badge";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { AuditLog } from "@prisma/client";
import { formatDateTime } from "@/utils/format";

interface AuditLogsWithUser extends AuditLog {
  user: {
    email: string;
  };
}

async function fetchLogs(params: { 
  take?: number; 
  cursor?: string | null; 
  userId?: string; 
  action?: string 
} = {}) {
  const qs = new URLSearchParams();
  if (params.take) qs.set("take", String(params.take));
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.userId) qs.set("userId", params.userId);
  if (params.action) qs.set("action", params.action);
  
  const hdrs = await headers();
  const protocol = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
  
  const res = await fetch(`${baseUrl}/api/audit-logs?${qs.toString()}`, {
    cache: "no-store",
    headers: {
      cookie: cookies().toString(),
    },
  });
  
  if (!res.ok) throw new Error("Failed to load audit logs");
  return res.json();
}

function getActionVariant(action: string) {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('delete') || actionLower.includes('remove')) {
    return "destructive";
  }
  if (actionLower.includes('create') || actionLower.includes('add')) {
    return "default";
  }
  if (actionLower.includes('update') || actionLower.includes('edit')) {
    return "secondary";
  }
  if (actionLower.includes('login') || actionLower.includes('auth')) {
    return "outline";
  }
  return "secondary";
}

function AuditLogsLoader() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading audit logs...</p>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

async function AuditLogsContent() {
  try {
    const { data } = await fetchLogs({ take: 50 });
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            System audit trail showing the latest {data.length} activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Action
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      User
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      IP Address
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      User Agent
                    </div>
                  </TableHead>
                  <TableHead>Resource</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Database className="h-8 w-8" />
                        <p>No audit logs found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((log: AuditLogsWithUser) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                          <span className="font-medium">
                            {log.user?.email || log.userId || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip || (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {log.userAgent ? (
                          <div 
                            className="truncate text-sm text-muted-foreground cursor-help" 
                            title={log.userAgent}
                          >
                            {log.userAgent}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.resource ? (
                          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                            {log.resource}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load audit logs. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }
}

export default async function AuditLogsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || !["Admin", "SuperAdmin"].includes(session.user.role || '')) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. You don&apos;t have permission to view audit logs.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
      </div>
      
      <Suspense fallback={<AuditLogsLoader />}>
        <AuditLogsContent />
      </Suspense>
    </div>
  );
}