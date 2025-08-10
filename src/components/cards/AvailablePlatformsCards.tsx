import { toast } from 'sonner';
import { useState} from 'react';
import { useSession } from "next-auth/react";
import { Plus, Facebook, Instagram, Linkedin, X } from 'lucide-react';

import { Button } from '../ui/button';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Platform, SocialAccount } from '@prisma/client';

// Available platforms data
const availablePlatforms: { id: Platform, name: string, icon: React.ElementType }[] = [
  { id: "FACEBOOK", name: "Facebook", icon: Facebook },
  { id: "INSTAGRAM", name: "Instagram", icon: Instagram },
  { id: "TWITTER", name: "Twitter", icon: X },
  { id: "LINKEDIN", name: "LinkedIn", icon: Linkedin }
];

export default function AvailablePlatformsCards({ accounts }: { accounts: SocialAccount[] }) {
    const { data: session } = useSession();
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async (platform: Platform) => {
        setIsConnecting(true);
        try {
            if (session) {
                switch (platform) {
                    case 'LINKEDIN':
                        window.location.href = `/api/accounts/linkedin/auth?userId=${session.user.id}`;
                        break;
                    case 'TWITTER':
                        window.location.href = `/api/accounts/twitter/auth?userId=${session.user.id}`;
                        break;
                    case 'FACEBOOK':
                        window.location.href = `/api/accounts/facebook/auth?userId=${session.user.id}`;
                        break;
                    case 'INSTAGRAM':
                        window.location.href = `/api/accounts/instagram/auth?userId=${session.user.id}`;
                        break;
                    default:
                        break;
                }
            }
        } catch (error) {
            console.error('Connection failed:', error);
            toast.error('Failed to initiate connection');
            setIsConnecting(false);
        }
    };

  return (
    <Card>
        <CardHeader>
            <CardTitle className="text-lg font-semibold">Available Platforms</CardTitle>
            <CardDescription>Connect new social media accounts</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="whitespace-nowrap rounded-md border">
                <div className="flex space-x-4 p-4">
                    {availablePlatforms.filter((platform) => !accounts.some((acc: SocialAccount) => acc.platform === platform.id)).map((platform) => {
                        return (
                            <Card
                                key={platform.id}
                                className="flex flex-col items-center justify-center p-6 min-w-[150px] sm:min-w-[180px] shadow-sm hover:shadow-md transition-shadow"
                            >
                                <platform.icon className="size-8 sm:size-10 mb-3 text-foreground" />
                                <span className="font-medium text-sm sm:text-base mb-4">{platform.name}</span>
                                <Button 
                                    onClick={() => handleConnect(platform.id)} 
                                    disabled={isConnecting}
                                    variant={"outline"}
                                    className="w-full"
                                >
                                    <Plus className="size-4 mr-2" />
                                    Connect
                                </Button>
                            </Card>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </CardContent>
    </Card>
  )
}
