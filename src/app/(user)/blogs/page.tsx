'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Blog {
  id: number;
  title: string;
  slug: string;
  banner: string;
  createdAt: string;
  author: {
    name: string;
    email: string;
  };
  _count: {
    blogPosts: number;
  };
  blogPosts: Array<{
    status: string;
    externalBlogSite: {
      name: string;
      platform: string;
    };
  }>;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function BlogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { data, error, isLoading } = useSWR(
    status === 'authenticated' ? '/api/blogs' : null,
    fetcher
  );

  const blogs: Blog[] = data?.blogs || [];

  if (status === 'loading' || isLoading) {
    return <BlogsSkeleton />;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Blog Posts</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your blog posts and cross-publish to external platforms
            </p>
          </div>
          <Button
            onClick={() => router.push('/blogs/create')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Create New Blog
          </Button>
        </div>
      </div>

      {/* Blogs List */}
      <Card>
        <CardContent className="p-0">
          {blogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No blog posts yet</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first blog post.</p>
              <Button
                onClick={() => router.push('/blogs/create')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Your First Blog
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {blogs.map(blog => (
                <div 
                  key={blog.id} 
                  className="p-6 hover:bg-gray-50 cursor-pointer" 
                  onClick={() => router.push(`/blogs/${blog.id}`)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      {blog.banner ? (
                        <img
                          src={blog.banner}
                          alt={blog.title}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs text-center">No Image</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {blog.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        By {blog.author.name} • {new Date(blog.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-gray-500">
                          {blog._count.blogPosts} external posts
                        </span>
                        <div className="flex space-x-1">
                          {blog.blogPosts.slice(0, 3).map((post, index) => (
                            <span
                              key={index}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                post.status === 'PUBLISHED'
                                  ? 'bg-green-100 text-green-800'
                                  : post.status === 'FAILED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                              title={`${post.externalBlogSite.name} (${post.externalBlogSite.platform})`}
                            >
                              {post.externalBlogSite.platform.charAt(0)}
                            </span>
                          ))}
                          {blog.blogPosts.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              +{blog.blogPosts.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function BlogsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Blogs List Skeleton */}
        <Card>
          <CardContent className="p-6 space-y-6">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-start space-x-4">
                <Skeleton className="w-16 h-16 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                <Skeleton className="w-5 h-5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}