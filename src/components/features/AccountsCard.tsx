"use client"

import useSWR from "swr";
import { useState } from "react";
import { Facebook, Info } from "lucide-react";

import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Skeleton } from "../ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

import { getPlatformIcon } from "@/utils/ui/icons";
import type { PageToken, SocialAccount } from "@prisma/client";

interface AccountsCardProps {
  accounts: SocialAccount[]
  selectedAccounts: string[]
  setSelectedAccounts: React.Dispatch<React.SetStateAction<string[]>>
  selectedPageTokenIds: string[]
  setSelectedPageTokenIds: React.Dispatch<React.SetStateAction<string[]>>
}

const fetcher = (url: string) => fetch(url).then((res: Response) => res.json())

export default function AccountsCard({
  accounts,
  selectedAccounts,
  setSelectedAccounts,
  selectedPageTokenIds,
  setSelectedPageTokenIds,
}: AccountsCardProps) {
  const { data, isLoading } = useSWR(
    `/api/accounts/facebook/pages?platformUserId=${
      accounts.find((acc) => acc.platform === "FACEBOOK")?.platformUserId || ""
    }`,
    fetcher
  )

  const facebookPages: PageToken[] = data?.pages || []
  const [rememberAccounts, setRememberAccounts] = useState(false)

  const handleAccountChange = (accountId: string, checked: boolean) => {
    setSelectedAccounts((prev) =>
      checked ? [...prev, accountId] : prev.filter((id) => id !== accountId)
    )
  }

  const handlePageTokenChange = (pageId: string, checked: boolean) => {
    setSelectedPageTokenIds((prev) =>
      checked ? [...prev, pageId] : prev.filter((id) => id !== pageId)
    )
  }

  const isAccountSelected = (accountId: string) =>
    selectedAccounts.includes(accountId)

  const isPageTokenSelected = (pageId: string) =>
    selectedPageTokenIds.includes(pageId)

  const handleSelectAll = () => {
    const allAccountIds = accounts.map((account) => account.id)
    const allPageIds = facebookPages.map((page) => page.id)
    setSelectedAccounts(allAccountIds)
    setSelectedPageTokenIds(allPageIds)
  }

  const handleDeselectAll = () => {
    setSelectedAccounts([])
    setSelectedPageTokenIds([])
  }

  const allSelectedCount = selectedAccounts.length + selectedPageTokenIds.length

  return (
    <>
      <Label className="block text-sm font-medium mb-2">
        <strong className="mr-2 text-xl">Step 2:</strong>
        Select Accounts
      </Label>

      {/* Accounts Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center size-6 rounded-full bg-black text-white text-xs font-bold">
              {allSelectedCount}
            </span>
            <h2 className="text-lg font-semibold">Accounts</h2>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Checkbox
              id="remember-accounts"
              checked={rememberAccounts}
              onCheckedChange={(checked) => setRememberAccounts(!!checked)}
            />
            <Label htmlFor="remember-accounts" className="text-sm font-normal">
              Remember
            </Label>
            <Info className="size-3 text-gray-500" />
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <span>{allSelectedCount} selected</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={accounts.length === 0 && facebookPages.length === 0}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                disabled={allSelectedCount === 0}
              >
                Deselect All
              </Button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              No connected accounts. Connect your first account to get started.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {accounts
                .filter((account) => account.platform !== "GOOGLE")
                .map((account) => (
                  <div key={account.id} className="flex items-center gap-2">
                    <Checkbox
                      id={account.id}
                      checked={isAccountSelected(account.id)}
                      onCheckedChange={(checked) =>
                        handleAccountChange(account.id, checked as boolean)
                      }
                    />
                    <Avatar className="size-8">
                      <AvatarImage
                        src={account.platformUserImage || undefined}
                        alt={account.platformUsername}
                      />
                      <AvatarFallback>
                        {getPlatformIcon(account.platform, "w-6 h-6")}
                      </AvatarFallback>
                    </Avatar>
                    <Label
                      htmlFor={account.id}
                      className={`text-sm font-normal cursor-pointer ${
                        isAccountSelected(account.id) ? "font-bold" : ""
                      }`}
                    >
                      {account.platformUsername}
                    </Label>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Facebook Pages Section */}
      {isLoading ? (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : facebookPages.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                {facebookPages.length}
              </span>
              <h2 className="text-lg font-semibold">Facebook Pages</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {facebookPages.map((page: PageToken) => (
                <div key={page.id} className="flex items-center gap-2">
                  <Checkbox
                    id={page.id}
                    checked={isPageTokenSelected(page.id)}
                    onCheckedChange={(checked) =>
                      handlePageTokenChange(page.id, checked as boolean)
                    }
                  />
                  <Avatar className="size-12 bg-blue-100">
                    <AvatarImage
                      src={`https://graph.facebook.com/${page.pageId}/picture?type=large`}
                      alt={page.name}
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      <Facebook className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <Label
                    htmlFor={page.id}
                    className="text-sm font-bold cursor-pointer"
                  >
                    {page.name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
