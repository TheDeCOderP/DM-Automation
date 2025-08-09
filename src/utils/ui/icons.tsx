import {
    CheckCircle,
    Clock,
    Edit,
    AlertCircle,
    Linkedin,
    Facebook,
    Instagram,
    Twitter,
    Share2,
    XCircle,
} from "lucide-react";

export function getStatusIcon(status: string) {
  switch (status) {
    case "PUBLISHED":
      return <CheckCircle className="h-4 w-4" />
    case "SCHEDULED":
      return <Clock className="h-4 w-4" />
    case "APPROVED":
      return <CheckCircle className="h-4 w-4" />
    case "DRAFT":
      return <Edit className="h-4 w-4" />
    case "FAILED":
      return <XCircle className="h-4 w-4" />
    default:
      return <AlertCircle className="h-4 w-4" />
  }
}

export function getPlatformIcon(platform: string) {
  switch (platform) {
    case "LINKEDIN":
      return <Linkedin className="h-4 w-4" />
    case "TWITTER":
      return <Twitter className="h-4 w-4" />
    case "FACEBOOK":
      return <Facebook className="h-4 w-4" />
    case "INSTAGRAM":
      return <Instagram className="h-4 w-4" />
    default:
      return <Share2 className="h-4 w-4" />
  }
}