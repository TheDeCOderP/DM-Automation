import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from 'next-auth/react';
import { Calendar, BarChart3, LogOut, Users, User, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserProfile() {
    const router = useRouter();
    const session = useSession();
    const user = session.data?.user;

    const [isOpen, setIsOpen] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);

    const handleLogout = () => {
        setLogoutOpen(true);
    };

    const getUserInitials = () => {
        if (user?.name) {
            const names = user.name.split(' ');
            if (names.length >= 2) {
                return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
            }
            return user.name.charAt(0).toUpperCase();
        }
        if (user?.email) {
            return user.email.charAt(0).toUpperCase();
        }
        return '';
    };

    // Show skeleton while loading
    if (session.status === "loading") {
        return (
            <div className="flex items-center gap-2 px-2 py-1.5">
                <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" />
                <div className="hidden sm:flex flex-col items-start gap-1">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-3 w-32 rounded" />
                </div>
                <Skeleton className="hidden sm:block h-4 w-4 rounded" />
            </div>
        );
    }

    if (!session) {
        router.push("/login");
    }
    

    return (
        <>
            {/* User Menu */}
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="relative border rounded-full p-1 h-10 max-w-[180px]"
                    >
                        <Avatar>
                            <AvatarImage 
                                src={user?.image ?? ""} 
                                alt={user?.name ?? user?.email ?? "User"} 
                                className="rounded-full h-8 w-8"
                            />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                {getUserInitials() || <User className="h-4 w-4" />}
                            </AvatarFallback>
                        </Avatar>

                        {/* User Info - Hidden on mobile, visible from sm */}
                        <div className="hidden sm:flex mr-3 flex-col items-start min-w-0 overflow-hidden" style={{ maxWidth: '180px' }}>
                            <span className="text-sm font-medium text-foreground truncate max-w-[100px] md:max-w-[140px] lg:max-w-[180px]">
                                {user?.name || user?.email?.split('@')[0] || 'User'}
                            </span>
                            {user?.name && user?.email && (
                                <span className="text-xs text-muted-foreground text-overflow:ellipsis">
                                {user.email}
                                </span>
                            )}
                        </div>
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56 sm:w-64">
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {user?.name || 'User'}
                            </p>
                            {user?.email && (
                                <p className="text-xs leading-none text-muted-foreground truncate">
                                    {user.email}
                                </p>
                            )}
                        </div>
                    </DropdownMenuLabel>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem 
                        onClick={() => router.push('/profile')}
                        className="cursor-pointer"
                    >
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                        onClick={() => router.push('/accounts')}
                        className="cursor-pointer"
                    >
                        <Users className="mr-2 h-4 w-4" />
                        <span>Accounts</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                        onClick={() => router.push('/posts/calendar')}
                        className="cursor-pointer"
                    >
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Calendar</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                        onClick={() => router.push('/analytics')}
                        className="cursor-pointer"
                    >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Analytics</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Logout Confirmation Dialog */}
            <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Log out of your account?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground py-4">
                        Are you sure you want to log out? You&apos;ll need to sign in again to access your account.
                    </p>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button 
                            variant="outline" 
                            onClick={() => setLogoutOpen(false)}
                            className="flex-1 sm:flex-none"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setLogoutOpen(false);
                                signOut({ callbackUrl: '/login' });
                            }}
                            className="flex-1 sm:flex-none"
                        >
                            Log out
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}