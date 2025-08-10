"use client";
import useSwr from "swr";
import { Skeleton } from "@/components/ui/skeleton";

import ConnectedAccountsCards from "@/components/cards/ConnectedAccountsCards";
import AvailablePlatformsCards from "@/components/cards/AvailablePlatformsCards";

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SocialAccountsPage() {
  const { data: response, isLoading, mutate } = useSwr(`/api/accounts`, fetcher);
  const accounts = response?.data || [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Social Accounts</h1>
        <p className="text-muted-foreground">Connect and manage your social media accounts</p>
      </div>
      
      {/* Connected Accounts Card */}
      {isLoading ? (
        <div className="col-span-2 text-center py-8 text-muted-foreground">
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        <ConnectedAccountsCards 
          accounts={accounts}
          mutate={mutate}
        />
      )}
      
      {/* Available Platforms Card */}
      {isLoading ? (
        <div className="col-span-2 text-center py-8 text-muted-foreground">
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        <AvailablePlatformsCards 
          accounts={accounts}
        />
      )}
    </div>
  );
}