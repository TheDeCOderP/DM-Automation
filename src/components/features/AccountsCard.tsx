"use client"
import type React from "react"
import { useState } from "react"
import { Facebook, Info } from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Checkbox } from "../ui/checkbox"
import { Label } from "../ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import type { SocialAccount, PageToken } from "@prisma/client"
import { getPlatformIcon } from "@/utils/ui/icons"

type SocialAccountWithPageTokens = SocialAccount & {
  pageTokens: PageToken[]
}

interface AccountsCardProps {
  accounts: SocialAccountWithPageTokens[]
  selectedAccounts: string[]
  setSelectedAccounts: React.Dispatch<React.SetStateAction<string[]>>
  selectedPageTokenIds: string[]
  setSelectedPageTokenIds: React.Dispatch<React.SetStateAction<string[]>>
}

export default function AccountsCard({
  accounts,
  selectedAccounts,
  setSelectedAccounts,
  selectedPageTokenIds,
  setSelectedPageTokenIds,
}: AccountsCardProps) {
  const [rememberAccounts, setRememberAccounts] = useState(false)

  const handleAccountChange = (accountId: string, checked: boolean) => {
    setSelectedAccounts((prev) => {
      if (checked) {
        return [...prev, accountId]
      } else {
        return prev.filter((id) => id !== accountId)
      }
    })
  }

  const handlePageTokenChange = (pageTokenId: string, checked: boolean) => {
    setSelectedPageTokenIds((prev) => {
      if (checked) {
        return [...prev, pageTokenId]
      } else {
        return prev.filter((id) => id !== pageTokenId)
      }
    })
  }

  const isAccountSelected = (accountId: string) => {
    return selectedAccounts.includes(accountId)
  }

  const isPageTokenSelected = (pageTokenId: string) => {
    return selectedPageTokenIds.includes(pageTokenId)
  }

  const handleSelectAll = () => {
    const allAccountIds = accounts.map((account) => account.id)
    const allPageTokenIds = accounts.flatMap((account) => account.pageTokens.map((token) => token.id))
    setSelectedAccounts(allAccountIds)
    setSelectedPageTokenIds(allPageTokenIds)
  }

  const handleDeselectAll = () => {
    setSelectedAccounts([])
    setSelectedPageTokenIds([])
  }

  const allSelectedCount = selectedAccounts.length + selectedPageTokenIds.length
  const facebookAccounts = accounts.filter((account) => account.platform === "FACEBOOK")

  return (
    <div className="space-y-4">
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
              <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={accounts.length === 0}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDeselectAll} disabled={allSelectedCount === 0}>
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
              {accounts.filter((account) => account.platform !== "GOOGLE").map((account: SocialAccountWithPageTokens) => {
                return (
                  <div key={account.id} className="flex items-center gap-2">
                    <Checkbox
                      id={account.id}
                      checked={isAccountSelected(account.id)}
                      onCheckedChange={(checked) => handleAccountChange(account.id, checked as boolean)}
                    />
                    <Avatar className="size-8">
                      <AvatarImage src={account.platformUserImage || undefined} alt={account.platformUsername} />
                      <AvatarFallback>
                        {getPlatformIcon(account.platform, "w-6 h-6")}
                      </AvatarFallback>
                    </Avatar>
                    <Label
                      htmlFor={account.id}
                      className={`text-sm font-normal cursor-pointer ${isAccountSelected(account.id) ? "font-bold" : ""}`}
                    >
                      {account.platformUsername}
                    </Label>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {facebookAccounts.length > 0 && facebookAccounts.some((account) => account.pageTokens.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                {facebookAccounts.reduce((sum, account) => sum + account.pageTokens.length, 0)}
              </span>
              <h2 className="text-lg font-semibold">Facebook Pages</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {facebookAccounts.map((account) =>
                account.pageTokens.map((pageToken: PageToken) => (
                  <div key={pageToken.id} className="flex items-center gap-2">
                    <Checkbox
                      id={pageToken.id}
                      checked={isPageTokenSelected(pageToken.id)}
                      onCheckedChange={(checked) => handlePageTokenChange(pageToken.id, checked as boolean)}
                    />
                    <Avatar className="size-12 bg-blue-100">
                      <AvatarImage
                        src={`https://graph.facebook.com/${pageToken.pageId}/picture?type=large`}
                        alt={pageToken.pageName}
                      />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        <Facebook className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <Label htmlFor={pageToken.id} className="text-sm font-bold cursor-pointer">
                      {pageToken.pageName}
                    </Label>
                  </div>
                )),
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
