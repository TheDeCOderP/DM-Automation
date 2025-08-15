"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { 
  User, 
  Shield, 
  Bell, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff,
  AlertTriangle,
  Settings,
  Lock,
  Globe,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface UserSettings {
  name: string
  email: string
  image?: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  postPublished: boolean
  postFailed: boolean
  accountDisconnected: boolean
  subscriptionRenewal: boolean
  marketingEmails: boolean
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private'
  dataSharing: boolean
  analytics: boolean
  twoFactorAuth: boolean
}

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [userSettings, setUserSettings] = useState<UserSettings>({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    image: session?.user?.image || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    postPublished: true,
    postFailed: true,
    accountDisconnected: true,
    subscriptionRenewal: true,
    marketingEmails: false
  })

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: 'private',
    dataSharing: false,
    analytics: true,
    twoFactorAuth: false
  })

  const handleUserSettingsChange = (field: keyof UserSettings, value: string) => {
    setUserSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleNotificationChange = (field: keyof NotificationSettings, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }))
  }

  const handlePrivacyChange = (field: keyof PrivacySettings, value: boolean | string) => {
    setPrivacySettings(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userSettings.name,
          email: userSettings.email,
          image: userSettings.image
        })
      })

      if (!response.ok) throw new Error('Failed to update profile')
      
      await update({
        name: userSettings.name,
        email: userSettings.email,
        image: userSettings.image
      })
      
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (userSettings.newPassword !== userSettings.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (userSettings.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: userSettings.currentPassword,
          newPassword: userSettings.newPassword
        })
      })

      if (!response.ok) throw new Error('Failed to change password')
      
      setUserSettings(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }))
      
      toast.success('Password changed successfully')
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNotifications = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings)
      })

      if (!response.ok) throw new Error('Failed to update notifications')
      toast.success('Notification preferences updated')
    } catch (error) {
      console.error('Notification preferences update error:', error);
      toast.error('Failed to update notification preferences')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePrivacy = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(privacySettings)
      })

      if (!response.ok) throw new Error('Failed to update privacy settings')
      toast.success('Privacy settings updated')
    } catch (error) {
      console.error('Privacy settings update error:', error);
      toast.error('Failed to update privacy settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      toast.error('Please type "DELETE" to confirm')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to delete account')
      
      toast.success('Account deleted successfully')
      // Redirect will be handled by the API response
      window.location.href = '/login'
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error('Failed to delete account')
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setDeleteConfirmation("")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Privacy
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and profile picture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={userSettings.image} alt={userSettings.name} />
                  <AvatarFallback className="text-lg">
                    {userSettings.name?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Label htmlFor="image">Profile Picture URL</Label>
                  <Input
                    id="image"
                    placeholder="https://example.com/avatar.jpg"
                    value={userSettings.image}
                    onChange={(e) => handleUserSettingsChange('image', e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter a URL for your profile picture
                  </p>
                </div>
              </div>

              <Separator />

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={userSettings.name}
                    onChange={(e) => handleUserSettingsChange('name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userSettings.email}
                    onChange={(e) => handleUserSettingsChange('email', e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPassword ? "text" : "password"}
                      value={userSettings.currentPassword}
                      onChange={(e) => handleUserSettingsChange('currentPassword', e.target.value)}
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={userSettings.newPassword}
                        onChange={(e) => handleUserSettingsChange('newPassword', e.target.value)}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={userSettings.confirmPassword}
                      onChange={(e) => handleUserSettingsChange('confirmPassword', e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={isLoading}>
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Enable Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Secure your account with SMS or authenticator app
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {privacySettings.twoFactorAuth && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Shield className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  )}
                  <Switch
                    checked={privacySettings.twoFactorAuth}
                    onCheckedChange={(checked) => handlePrivacyChange('twoFactorAuth', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about important events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* General Notifications */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  General Notifications
                </h4>
                <div className="space-y-4 pl-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications in your browser
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) => handleNotificationChange('pushNotifications', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Post Notifications */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Post Notifications
                </h4>
                <div className="space-y-4 pl-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Post Published</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when your posts are published
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.postPublished}
                      onCheckedChange={(checked) => handleNotificationChange('postPublished', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Post Failed</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when post publishing fails
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.postFailed}
                      onCheckedChange={(checked) => handleNotificationChange('postFailed', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Account Notifications */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Account Notifications
                </h4>
                <div className="space-y-4 pl-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Account Disconnected</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when social accounts are disconnected
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.accountDisconnected}
                      onCheckedChange={(checked) => handleNotificationChange('accountDisconnected', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Subscription Renewal</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified about subscription renewals
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.subscriptionRenewal}
                      onCheckedChange={(checked) => handleNotificationChange('subscriptionRenewal', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Marketing Emails</p>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about new features and tips
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.marketingEmails}
                      onCheckedChange={(checked) => handleNotificationChange('marketingEmails', checked)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Control your privacy and data sharing preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Profile Visibility</p>
                    <p className="text-sm text-muted-foreground">
                      Control who can see your profile information
                    </p>
                  </div>
                  <Select
                    value={privacySettings.profileVisibility}
                    onValueChange={(value: 'public' | 'private') => handlePrivacyChange('profileVisibility', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Data Sharing</p>
                    <p className="text-sm text-muted-foreground">
                      Allow sharing anonymized data for service improvement
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.dataSharing}
                    onCheckedChange={(checked) => handlePrivacyChange('dataSharing', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Analytics</p>
                    <p className="text-sm text-muted-foreground">
                      Help us improve by sharing usage analytics
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.analytics}
                    onCheckedChange={(checked) => handlePrivacyChange('analytics', checked)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSavePrivacy} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that will permanently affect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-destructive">Delete Account</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>• All your posts and scheduled content will be deleted</li>
                        <li>• Connected social accounts will be disconnected</li>
                        <li>• All brands and media files will be removed</li>
                        <li>• Your subscription will be cancelled</li>
                      </ul>
                    </div>
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Account
                          </DialogTitle>
                          <DialogDescription>
                            This action is permanent and cannot be undone. All your data will be permanently deleted.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="deleteConfirmation">
                              Type <span className="font-mono font-bold">DELETE</span> to confirm:
                            </Label>
                            <Input
                              id="deleteConfirmation"
                              value={deleteConfirmation}
                              onChange={(e) => setDeleteConfirmation(e.target.value)}
                              placeholder="Type DELETE here"
                            />
                          </div>
                          <div className="bg-destructive/10 p-3 rounded-lg">
                            <p className="text-sm text-destructive font-medium">
                              ⚠️ This will permanently delete:
                            </p>
                            <ul className="text-sm text-destructive mt-1 space-y-1">
                              <li>• Your account and profile</li>
                              <li>• All posts and scheduled content</li>
                              <li>• Connected social accounts</li>
                              <li>• All brands and media files</li>
                            </ul>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsDeleteDialogOpen(false)
                              setDeleteConfirmation("")
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={isLoading || deleteConfirmation !== "DELETE"}
                          >
                            {isLoading ? "Deleting..." : "Delete Account"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}