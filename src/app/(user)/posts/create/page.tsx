'use client'

import * as React from 'react'
import { Info, Youtube, Instagram, InstagramIcon as Tiktok, PinIcon as Pinterest, Facebook, X, Linkedin, Sparkles, ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import MediaUpload from '@/components/features/MediaUpload';

export default function CreatePostPage() {
  const [rememberAccounts, setRememberAccounts] = React.useState(false)
  const [useSameCaption, setUseSameCaption] = React.useState(false)
  const [selectedBrand, setSelectedBrand] = React.useState('PostPlanify')
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([])

  const accounts = [
    { id: 'youtube', name: 'PostPlanify', icon: Youtube, type: 'channel' },
    { id: 'instagram', name: 'postplanify', icon: Instagram, type: 'profile' },
    { id: 'tiktok-emma', name: 'Smart Posting Tips | Emma', icon: Tiktok, type: 'profile', avatar: '/placeholder.svg?height=24&width=24' },
    { id: 'pinterest', name: 'postplanify', icon: Pinterest, type: 'profile' },
    { id: 'facebook', name: 'PostPlanify', icon: Facebook, type: 'page' },
    { id: 'x', name: 'PostPlanify', icon: X, type: 'profile' },
    { id: 'linkedin', name: 'PostPlanify', icon: Linkedin, type: 'profile' },
    { id: 'tiktok-arya', name: 'arya.growth', icon: Tiktok, type: 'profile', avatar: '/placeholder.svg?height=24&width=24' },
  ]

  const [selectedAccounts, setSelectedAccounts] = React.useState<string[]>([])

  const handleSelectAll = () => {
    setSelectedAccounts(accounts.map(account => account.id))
  }

  const handleDeselectAll = () => {
    setSelectedAccounts([])
  }

  const handleAccountChange = (id: string, checked: boolean) => {
    setSelectedAccounts(prev =>
      checked ? [...prev, id] : prev.filter(accountId => accountId !== id)
    )
  }

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files)
    console.log('Uploaded files:', files)
    // Here you would typically handle the file upload to a server
  }

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Media Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-black text-white text-xs font-bold">
                1
              </span>
              <h2 className="text-lg font-semibold">Media</h2>
            </div>
            <Info className="size-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <MediaUpload onFilesChange={handleFilesChange} />
          </CardContent>
        </Card>

        {/* Accounts Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-black text-white text-xs font-bold">
                2
              </span>
              <h2 className="text-lg font-semibold">Accounts</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Checkbox
                  id="remember-accounts"
                  checked={rememberAccounts}
                  onCheckedChange={checked => setRememberAccounts(!!checked)}
                />
                <Label htmlFor="remember-accounts" className="text-sm font-normal">
                  Remember
                </Label>
                <Info className="size-3 text-gray-500" />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="brand-select" className="text-sm font-normal">
                  Brand:
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center justify-between gap-2 px-3 py-1.5 h-auto text-sm"
                    >
                      {selectedBrand}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setSelectedBrand('PostPlanify')}>
                      PostPlanify
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSelectedBrand('Other Brand')}>
                      Other Brand
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
              <span>{selectedAccounts.length} selected</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {accounts.map(account => (
                <div key={account.id} className="flex items-center gap-2">
                  <Checkbox
                    id={account.id}
                    checked={selectedAccounts.includes(account.id)}
                    onCheckedChange={checked => handleAccountChange(account.id, !!checked)}
                  />
                  {account.avatar ? (
                    <Avatar className="size-6">
                      <AvatarImage src={account.avatar || "/placeholder.svg"} alt={account.name} />
                      <AvatarFallback>{account.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <account.icon className="size-6" />
                  )}
                  <Label htmlFor={account.id} className="text-sm font-normal cursor-pointer">
                    {account.name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        {/* Captions Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center size-6 rounded-full bg-black text-white text-xs font-bold">
                3
              </span>
              <h2 className="text-lg font-semibold">Captions</h2>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="same-caption" className="text-sm font-normal">
                Use same caption for all platforms
              </Label>
              <Switch
                id="same-caption"
                checked={useSameCaption}
                onCheckedChange={checked => setUseSameCaption(!!checked)}
              />
            </div>
            <Button className="w-full bg-purple-600 text-white hover:bg-purple-700">
              <Sparkles className="size-4 mr-2" />
              Generate AI Captions
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
