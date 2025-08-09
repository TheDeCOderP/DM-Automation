export const getStatusColor = (status: string) => {
  switch (status) {
    case "PUBLISHED":
      return "bg-success/10 text-success"
    case "SCHEDULED":
      return "bg-primary/10 text-primary"
    case "APPROVED":
      return "bg-secondary/10 text-secondary-foreground"
    case "DRAFT":
      return "bg-muted text-muted-foreground"
    case "FAILED":
      return "bg-destructive/10 text-destructive"
    default:
      return "bg-muted text-muted-foreground"
  }
}