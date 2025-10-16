"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, AlertCircle, PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const FeaturesPage = () => {
  const features = [
    {
      id: 1,
      title: "Image Generation",
      description: "Generate high-quality images from text prompts using TogetherAI's advanced AI models.",
      status: "Completed",
      icon: CheckCircle,
    },
    {
      id: 2,
      title: "Video Generation",
      description: "Create engaging videos from text prompts and images using FreepikAI's video generation technology.",
      status: "Completed",
      icon: CheckCircle,
    },
    {
      id: 3,
      title: "Content Generation",
      description: "Generate high-quality written content from text prompts using TogetherAI's language models.",
      status: "Completed",
      icon: CheckCircle,
    },
    {
      id: 4,
      title: "Twitter Automation",
      description:
        "Automatically post content to your Twitter personal account using Twitter's official API with analytics tracking.",
      status: "Completed",
      icon: CheckCircle,
    },
    {
      id: 5,
      title: "LinkedIn Automation",
      description:
        "Post content automatically to your LinkedIn personal account and business pages using LinkedIn's official API.",
      status: "In Progress",
      icon: PlayCircle,
    },
    {
      id: 6,
      title: "Facebook Automation",
      description: "Automatically publish content to your Facebook pages using Facebook's official API.",
      status: "In Progress",
      icon: PlayCircle,
    },
    {
      id: 7,
      title: "Instagram Automation",
      description: "Post content automatically to your Instagram personal account using Instagram's official API.",
      status: "Pending",
      icon: Clock,
    },
    {
      id: 8,
      title: "YouTube Automation",
      description: "Upload and manage videos on your YouTube channel automatically using Google's official API.",
      status: "Completed",
      icon: CheckCircle,
    },
    {
      id: 9,
      title: "TikTok Automation",
      description: "Automatically post videos to your TikTok account using TikTok's official API.",
      status: "Pending",
      icon: Clock,
    },
    {
      id: 10,
      title: "Pinterest Automation",
      description: "Automatically pin content to your Pinterest boards using Pinterest's official API.",
      status: "Pending",
      icon: Clock,
    },
    {
      id: 11,
      title: "Encryption & Security",
      description:
        "Enterprise-grade encryption to securely protect user credentials and data with full security compliance.",
      status: "Completed",
      icon: CheckCircle,
    },
    {
      id: 12,
      title: "Content Scheduling",
      description: "Schedule posts for optimal timing using advanced scheduling system with reliable execution.",
      status: "Completed",
      icon: CheckCircle,
    },
    {
      id: 13,
      title: "Post Analytics Dashboard",
      description:
        "Comprehensive dashboard to track post performance, reach, and engagement metrics across all platforms.",
      status: "In Progress",
      icon: PlayCircle,
    },
    {
      id: 14,
      title: "Zoho WorkDrive Integration",
      description: "Seamlessly fetch and use files from your Zoho WorkDrive for content creation and posting.",
      status: "Completed",
      icon: CheckCircle,
    },
    {
      id: 15,
      title: "Google Drive Integration",
      description: "Direct integration with Google Drive to access and utilize your files for content generation.",
      status: "Completed",
      icon: CheckCircle,
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return CheckCircle
      case "In Progress":
        return PlayCircle
      case "Pending":
        return Clock
      default:
        return AlertCircle
    }
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Completed":
        return { badgeVariant: "default", iconWrap: "bg-primary/10 text-primary" }
      case "In Progress":
        return { badgeVariant: "secondary", iconWrap: "bg-accent text-accent-foreground" }
      case "Pending":
      default:
        return { badgeVariant: "outline", iconWrap: "bg-muted text-muted-foreground" }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-balance mb-4">Platform Features</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-pretty">
            Discover all the powerful features our platform offers to streamline your content creation and social media
            management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            return (
              <Card
                key={feature.id}
                className="bg-card border-border hover:shadow-sm hover:ring-1 hover:ring-ring transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>

                    {(() => {
                      const { iconWrap } = getStatusStyles(feature.status)
                      const StatusIcon = getStatusIcon(feature.status)
                      return (
                        <span
                          className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full", iconWrap)}
                          aria-hidden="true"
                        >
                          <StatusIcon className="h-4 w-4" />
                          <span className="sr-only">{feature.status}</span>
                        </span>
                      )
                    })()}
                  </div>

                  {(() => {
                    const { badgeVariant } = getStatusStyles(feature.status)
                    return (
                      <Badge variant={badgeVariant as "default" | "secondary" | "outline" | "destructive"} className="text-xs font-medium">
                        {feature.status}
                      </Badge>
                    )
                  })()}
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-6 bg-card rounded-lg border border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm text-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <PlayCircle className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm text-foreground">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm text-foreground">Pending</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeaturesPage
