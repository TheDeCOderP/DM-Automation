import Image from "next/image";

export default async function BlogDetail({ params } : { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Use the id from params instead of params.id
  const res = await fetch(`https://www.ecokartuk.com/api/blog/posts/${id}`);
  console.log(res);
  if (!res.ok) {
    return <div className="text-center py-20 text-gray-500">Failed to load blog</div>;
  }
  
  const blog = await res.json();
  
console.log(blog);

  if (!blog) {
    return <div className="text-center py-20 text-gray-500">Blog not found</div>;
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <Image
        src={blog.image}
        alt={blog.imageAlt || blog.title}
        width={1200}
        height={600}
        className="rounded-2xl mb-8 object-cover"
        priority
      />

      <h1 className="text-3xl font-bold mb-4">{blog.title}</h1>
      <p className="text-gray-600 mb-6">{blog.excerpt}</p>

      <div
        className="prose prose-gray max-w-none"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />

      <div className="mt-10 flex items-center gap-3">
        {blog.author?.image && (
          <Image
            src={blog.author.image}
            alt={blog.author.name}
            width={40}
            height={40}
            className="rounded-full"
          />
        )}
        <p className="text-sm text-gray-700">
          Written by <span className="font-medium">{blog.author?.name || "Unknown Author"}</span>
        </p>
      </div>
    </article>
  );
}