"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Zap, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const FeaturesPage = () => {
  const features = [
    {
      id: 1,
      title: "Image Generation",
      description: "Generate high-quality images from text prompts using Google Gemini's advanced multimodal AI models.",
      status: "Completed",
      icon: CheckCircle,
      category: "Content Creation",
    },
    {
      id: 2,
      title: "Video Generation",
      description: "Create engaging videos from text prompts and images using FreepikAI's video generation technology.",
      status: "Completed",
      icon: CheckCircle,
      category: "Content Creation",
    },
    {
      id: 3,
      title: "Content Generation",
      description: "Generate high-quality written content from text prompts using Google Gemini's language models.",
      status: "Completed",
      icon: CheckCircle,
      category: "Content Creation",
    },
    {
      id: 4,
      title: "Twitter Automation",
      description:
        "Automatically post content to your Twitter personal account using Twitter's official API with analytics tracking.",
      status: "Completed",
      icon: CheckCircle,
      category: "Social Media",
    },
    {
      id: 5,
      title: "LinkedIn Automation",
      description:
        "Post content automatically to your LinkedIn personal account and business pages using LinkedIn's official API.",
      status: "Completed",
      icon: Zap,
      category: "Social Media",
    },
    {
      id: 6,
      title: "Facebook Automation",
      description: "Automatically publish content to your Facebook pages using Facebook's official API.",
      status: "Completed",
      icon: Zap,
      category: "Social Media",
    },
    {
      id: 7,
      title: "Instagram Automation",
      description: "Post content automatically to your Instagram personal account using Instagram's official API.",
      status: "Pending",
      icon: Clock,
      category: "Social Media",
    },
    {
      id: 8,
      title: "YouTube Automation",
      description: "Upload and manage videos on your YouTube channel automatically using Google's official API.",
      status: "Completed",
      icon: CheckCircle,
      category: "Social Media",
    },
    {
      id: 9,
      title: "TikTok Automation",
      description: "Automatically post videos to your TikTok account using TikTok's official API.",
      status: "Pending",
      icon: Clock,
      category: "Social Media",
    },
    {
      id: 10,
      title: "Pinterest Automation",
      description: "Automatically pin content to your Pinterest boards using Pinterest's official API.",
      status: "Completed",
      icon: Clock,
      category: "Social Media",
    },
    {
      id: 11,
      title: "Encryption & Security",
      description:
        "Enterprise-grade encryption to securely protect user credentials and data with full security compliance.",
      status: "Completed",
      icon: CheckCircle,
      category: "Security",
    },
    {
      id: 12,
      title: "Content Scheduling",
      description: "Schedule posts for optimal timing using advanced scheduling system with reliable execution.",
      status: "Completed",
      icon: CheckCircle,
      category: "Automation",
    },
    {
      id: 13,
      title: "Post Analytics Dashboard",
      description:
        "Comprehensive dashboard to track post performance, reach, and engagement metrics across all platforms.",
      status: "In Progress",
      icon: Zap,
      category: "Analytics",
    },
    {
      id: 14,
      title: "Zoho WorkDrive Integration",
      description: "Seamlessly fetch and use files from your Zoho WorkDrive for content creation and posting.",
      status: "Completed",
      icon: CheckCircle,
      category: "Integrations",
    },
    {
      id: 15,
      title: "Google Drive Integration",
      description: "Direct integration with Google Drive to access and utilize your files for content generation.",
      status: "Completed",
      icon: CheckCircle,
      category: "Integrations",
    },
  ]

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Completed":
        return {
          badgeVariant: "default" as const,
          containerClass: "border-primary/20 bg-primary/5 hover:bg-primary/10",
          iconWrap: "bg-primary/15 text-primary",
          titleClass: "text-foreground",
        }
      case "In Progress":
        return {
          badgeVariant: "secondary" as const,
          containerClass: "border-accent/30 bg-accent/8 hover:bg-accent/12",
          iconWrap: "bg-accent/20 text-accent",
          titleClass: "text-foreground",
        }
      case "Pending":
      default:
        return {
          badgeVariant: "outline" as const,
          containerClass: "border-muted-foreground/20 bg-muted/50 hover:bg-muted/70",
          iconWrap: "bg-muted-foreground/15 text-muted-foreground",
          titleClass: "text-muted-foreground",
        }
    }
  }

  const completedCount = features.filter((f) => f.status === "Completed").length
  const inProgressCount = features.filter((f) => f.status === "In Progress").length
  const pendingCount = features.filter((f) => f.status === "Pending").length

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Product Roadmap</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-balance mb-4 text-foreground">
            Platform Features
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
            Discover all the powerful features our platform offers to streamline your content creation and social media
            management.
          </p>
        </div>

        <div className="mb-12 sm:mb-16">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">{completedCount}</div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Completed</div>
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/8 p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-accent mb-1">{inProgressCount}</div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">In Progress</div>
            </div>
            <div className="rounded-lg border border-muted-foreground/20 bg-muted/50 p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-muted-foreground mb-1">{pendingCount}</div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground">Pending</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature) => {
            const styles = getStatusStyles(feature.status)
            const StatusIcon = feature.icon

            return (
              <Card
                key={feature.id}
                className={cn(
                  "border transition-all duration-300 hover:shadow-md hover:scale-105",
                  styles.containerClass,
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className={cn("text-base sm:text-lg font-semibold leading-tight", styles.titleClass)}>
                        {feature.title}
                      </CardTitle>
                    </div>

                    <span
                      className={cn(
                        "inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                        styles.iconWrap,
                      )}
                      aria-hidden="true"
                    >
                      <StatusIcon className="h-4 w-4" />
                    </span>
                  </div>

                  <Badge variant={styles.badgeVariant} className="w-fit text-xs font-medium">
                    {feature.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground leading-relaxed text-sm">
                    {feature.description}
                  </CardDescription>
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {feature.category}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-16 sm:mt-20">
          <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">Status Legend</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <CheckCircle className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-medium text-foreground text-sm">Completed</div>
                  <p className="text-xs text-muted-foreground mt-1">Feature is live and available</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-medium text-foreground text-sm">In Progress</div>
                  <p className="text-xs text-muted-foreground mt-1">Currently being developed</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted-foreground/15 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-medium text-foreground text-sm">Pending</div>
                  <p className="text-xs text-muted-foreground mt-1">Planned for future release</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeaturesPage
