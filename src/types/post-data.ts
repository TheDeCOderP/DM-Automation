export interface PostData {
  content: string
  author: {
    name: string
    username: string
    avatar: string
    verified?: boolean
    title?: string
  }
  image?: string
  timestamp: Date
  engagement?: {
    likes: number
    comments: number
    shares?: number
    retweets?: number
  }
}