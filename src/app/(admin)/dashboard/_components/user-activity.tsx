"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, User, Crown } from "lucide-react"

interface UserActivityProps {
  detailed?: boolean
}

type UserLite = {
  id: string
  name: string | null
  email: string
  image: string | null
  role: "ADMIN" | "USER"
  postsCount: number
  lastActive: string
}

export function UserActivity({ detailed = false }: UserActivityProps) {
  const [users, setUsers] = useState<UserLite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        // Build from posts table to get activity and counts for current user brands
        const res = await fetch("/api/posts?limit=12&page=1")
        if (!res.ok) throw new Error("Failed to load posts")
        const json = await res.json()
        const posts = (json.posts || []) as Array<{ user: { name?: string; email?: string; image?: string }; userId: string }>

        // Aggregate fake user list from recent posts (fallback if no dedicated users API exists)
        const map = new Map<string, UserLite>()
        posts.forEach((p) => {
          const existing = map.get(p.userId)
          const name = p.user?.name || "User"
          const email = p.user?.email || ""
          const image = p.user?.image || null
          const u: UserLite = existing || {
            id: p.userId,
            name,
            email,
            image,
            role: "USER",
            postsCount: 0,
            lastActive: "Just now",
          }
          u.postsCount += 1
          map.set(p.userId, u)
        })
        setUsers(Array.from(map.values()))
      } catch {
        setUsers([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Crown className="h-3 w-3" />
      default:
        return <User className="h-3 w-3" />
    }
  }

  const getStatusColor = (index: number) => {
    // simple rotating status until real presence is available
    return index % 3 === 0 ? "bg-green-500" : index % 3 === 1 ? "bg-yellow-500" : "bg-gray-500"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          User Activity
          {detailed && (
            <Button variant="outline" size="sm">
              View All Users
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          {detailed ? "Comprehensive user management and activity tracking" : "Recent user activity and status"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && users.length === 0 && (
            <div className="text-sm text-muted-foreground">No recent user activity</div>
          )}
          {users.map((user, idx) => (
            <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.image || "/placeholder.svg"} alt={user.name || "User"} />
                    <AvatarFallback>
                      {(user.name || "U")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(idx)}`}></div>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-card-foreground">{user.name || "User"}</span>
                    <Badge variant="outline" className="text-xs">
                      {getRoleIcon(user.role)}
                      <span className="ml-1">{user.role}</span>
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {detailed ? user.email : `${user.postsCount} posts`} • {user.lastActive}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {detailed && (
                  <Badge variant="secondary" className="text-xs">
                    {user.postsCount} posts
                  </Badge>
                )}
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}