// app/invites/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface InvitationData {
  brand: {
    name: string;
    description?: string;
    logo?: string;
  };
  invitedBy: {
    name: string;
    email: string;
  };
  status: string;
  expiresAt: string;
}

export default function AcceptInvitePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const invitationId = params.id as string;
  const token = searchParams.get('token');

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (!token) {
      setMessage({ type: 'error', text: 'Invalid invitation link. Missing token.' });
      setIsLoading(false);
      return;
    }

    if (sessionStatus === 'unauthenticated') {
      // Redirect to login with callback URL
      const callbackUrl = `/invites/${invitationId}?token=${token}`;
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    fetchInvitationData();
  }, [sessionStatus, token, invitationId, router]);

  const fetchInvitationData = async () => {
    try {
      const response = await fetch(`/api/invites/${invitationId}?token=${token}`);
      
      if (response.ok) {
        const data = await response.json();
        setInvitationData(data.invitation);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to load invitation' });
      }
    } catch (error) {
      console.log("Error fetching invitation:", error);
      setMessage({ type: 'error', text: 'Failed to load invitation details' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateInvitation = async (status: string) => {
    if (!token) return;

    setIsAccepting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/invites`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, status }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: data.message || 'Successfully joined the brand!' 
        });
        // Refresh invitation data
        fetchInvitationData();
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/accounts');
        }, 2000);
      } else {
        console.error("Error accepting invitation:", data);
        setMessage({ type: 'error', text: data.message || 'Failed to accept invitation' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while accepting the invitation' });
    } finally {
      setIsAccepting(false);
    }
  };

  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading invitation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <XCircle className="h-6 w-6" />
              <span>Invalid Invitation</span>
            </CardTitle>
            <CardDescription>
              This invitation link is missing required information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitationData?.status !== 'PENDING') {
    const isAccepted = invitationData?.status === 'ACCEPTED';
    const isExpired = new Date(invitationData?.expiresAt || '') < new Date();

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {isAccepted ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span>Invitation {isAccepted ? 'Accepted' : 'Processed'}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-red-600" />
                  <span>
                    {isExpired ? 'Invitation Expired' : 'Invitation ' + invitationData?.status.toLowerCase()}
                  </span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isAccepted
                ? 'You have already accepted this invitation.'
                : isExpired
                ? 'This invitation has expired. Please request a new one.'
                : `This invitation has been ${invitationData?.status.toLowerCase()}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">Brand Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a brand team
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {invitationData && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-lg">{invitationData.brand.name}</h3>
                {invitationData.brand.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {invitationData.brand.description}
                  </p>
                )}
              </div>

              <div className="text-sm text-gray-600">
                <p>
                  <strong>Invited by:</strong> {invitationData.invitedBy.name} ({invitationData.invitedBy.email})
                </p>
                <p className="mt-1">
                  <strong>Expires:</strong>{' '}
                  {new Date(invitationData.expiresAt).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  By accepting this invitation, you&apos;ll gain access to this brand&apos;s content,
                  social accounts, and collaboration features.
                </p>
              </div>

              <Button
                onClick={() => handleUpdateInvitation('ACCEPTED')}
                disabled={isAccepting || message?.type === 'success'}
                className="w-full"
                size="lg"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => handleUpdateInvitation('REJECTED')}
                className="w-full"
              >
                Decline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}