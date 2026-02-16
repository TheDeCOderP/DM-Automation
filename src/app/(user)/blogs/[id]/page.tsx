'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ExternalBlogSite {
  id: string;
  name: string;
  platform: string;
  baseUrl: string;
  apiEndpoint: string;
  authType: string;
  isActive: boolean;
  brand: {
    id: string;
    name: string;
    logo?: string;
  };
  blogPosts: Array<{
    id: string;
    status: string;
    publishedAt?: string;
    externalPostUrl?: string;
  }>;
  createdAt: string;
}

export default function BlogPage() {
  const params = useParams();
  const router = useRouter();
  const [site, setSite] = useState<ExternalBlogSite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSite();
    }
  }, [status, params.id]);

  const fetchSite = async () => {
    try {
      const response = await fetch(`/api/external-blog-sites/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setSite(data.externalSite);
      }
    } catch (error) {
      console.error('Error fetching site:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!site) {
    return <div>Site not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/blogs/sites')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Sites
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{site.name}</h1>
          <p className="text-gray-600 mt-2">
            Manage your {site.platform} integration for {site.brand.name}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Site Details */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Site Information</h2>
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Platform</dt>
                  <dd className="text-sm text-gray-900">{site.platform}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Base URL</dt>
                  <dd className="text-sm text-gray-900">{site.baseUrl}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">API Endpoint</dt>
                  <dd className="text-sm text-gray-900">{site.apiEndpoint}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Authentication</dt>
                  <dd className="text-sm text-gray-900">{site.authType}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      site.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {site.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Recent Posts */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Recent Posts</h2>
              {site.blogPosts.length === 0 ? (
                <p className="text-gray-500 text-sm">No posts published yet.</p>
              ) : (
                <div className="space-y-3">
                  {site.blogPosts.map(post => (
                    <div key={post.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          post.status === 'PUBLISHED' 
                            ? 'bg-green-100 text-green-800' 
                            : post.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {post.status}
                        </span>
                        {post.publishedAt && (
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(post.publishedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {post.externalPostUrl && (
                        <a
                          href={post.externalPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View Post
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-4">Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md">
                  Test Connection
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 rounded-md">
                  Edit Settings
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">
                  Disconnect
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{site.blogPosts.length}</p>
                  <p className="text-sm text-gray-500">Total Posts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {site.blogPosts.filter(p => p.status === 'PUBLISHED').length}
                  </p>
                  <p className="text-sm text-gray-500">Published</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}