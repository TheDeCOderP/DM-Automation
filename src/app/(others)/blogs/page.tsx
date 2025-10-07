"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User, ArrowRight } from "lucide-react";

// Type definitions
interface Author {
  id: string;
  name: string;
  image?: string;
  bio?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  imageAlt?: string;
  publishedAt: string;
  author: Author;
  category: Category;
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setError(null);
        const res = await fetch("https://www.ecokartuk.com/api/blog/posts");
        
        if (!res.ok) {
          throw new Error(`Failed to fetch blogs: ${res.status}`);
        }
        
        const data = await res.json();
        setBlogs(data);
      } catch (error) {
        console.error("Failed to load blogs:", error);
        setError(error instanceof Error ? error.message : "Failed to load blogs");
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Skeleton className="h-12 w-96 mx-auto mb-4" />
          <Skeleton className="h-6 w-64 mx-auto" />
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <Skeleton className="h-56 w-full" />
              <CardHeader className="space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-8">
          <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Blogs</h2>
          <p className="text-destructive mb-6">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="text-center mb-16 space-y-4">
        <Badge variant="secondary" className="mb-4 px-4 py-1 text-sm">
          Latest Insights
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
          EcoKartUK <span className="text-primary">Blog</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover sustainable living tips, eco-friendly products, and environmental insights
        </p>
      </div>

      {/* Blog Grid */}
      {blogs.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="rounded-lg border border-border p-12">
            <h3 className="text-2xl font-semibold mb-2">No blogs available</h3>
            <p className="text-muted-foreground mb-6">
              Check back soon for new articles and updates.
            </p>
            <Button asChild variant="outline">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
            <Card 
              key={blog.id} 
              className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20"
            >
              <Link href={`/blogs/${blog.slug}`} className="block">
                <div className="relative h-56 w-full overflow-hidden">
                  <Image
                    src={blog.image}
                    alt={blog.imageAlt || blog.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
              </Link>

              <CardHeader className="pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {blog.category?.name || "General"}
                  </Badge>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(blog.publishedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>

                <Link href={`/blogs/${blog.id}`}>
                  <h2 className="text-xl font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {blog.title}
                  </h2>
                </Link>
              </CardHeader>

              <CardContent className="pb-4">
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                  {blog.excerpt}
                </p>
              </CardContent>

              <CardFooter className="pt-0 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {blog.author?.image && (
                    <Image
                      src={blog.author.image}
                      alt={blog.author.name}
                      width={32}
                      height={32}
                      className="rounded-full border"
                    />
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-3 w-3 mr-1" />
                    {blog.author?.name}
                  </div>
                </div>
                
                <Button 
                  asChild 
                  variant="ghost" 
                  size="sm" 
                  className="group/btn hover:bg-primary hover:text-primary-foreground"
                >
                  <Link href={`/blogs/${blog.slug}`} className="flex items-center gap-1">
                    Read
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}