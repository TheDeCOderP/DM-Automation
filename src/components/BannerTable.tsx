'use client';

type BannerType = 'Festive Ads'|  'Sidebar Ads' | 'Horizontal Ads' | 'Vertical Ads';

interface Banner {
  id: string;
  title: string;
  type: BannerType;
  imageUrl: string;
  redirectUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface BannerTableProps {
  banners: Banner[];
  onEdit: (banner: Banner) => void;
  onDelete: (id: string) => void;
}

export default function BannerTable({ banners, onEdit, onDelete }: BannerTableProps) {
  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      onDelete(id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <h2 className="text-2xl font-bold p-6 border-b">All Banners</h2>
      
      {banners.length === 0 ? (
        <p className="p-6 text-gray-500">No banners found. Add one to get started!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Redirect URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {banners.map((banner) => (
                <tr key={banner.id}>
                  <td className="px-6 py-4 text-sm">{banner.title}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        banner.type === 'Festive Ads'
                          ? 'bg-purple-100 text-purple-800'
                          : banner.type === 'Ads'
                          ? 'bg-green-100 text-green-800'
                          : banner.type === 'Sidebar Ads'
                          ? 'bg-blue-100 text-blue-800'
                          : banner.type === 'Horizontal Ads'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-pink-100 text-pink-800'
                      }`}
                    >
                      {banner.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <img 
                      src={banner.imageUrl} 
                      alt={banner.title}
                      className="h-12 w-20 object-cover rounded"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {banner.redirectUrl ? (
                      <a 
                        href={banner.redirectUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline truncate block max-w-xs"
                      >
                        {banner.redirectUrl}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      banner.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => onEdit(banner)}
                      className="text-blue-500 hover:text-blue-700 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id, banner.title)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}