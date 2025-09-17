"use client";

import { toast } from 'sonner';
import { useEffect } from 'react';
import { useParams } from "next/navigation";

export default function PostPage() {
    const params = useParams();
    
    useEffect(() => {
        const fetchPost = async () => {
            try {
                const res = await fetch(`/api/posts/${params.id}`);

                if (!res.ok) throw new Error("Failed to fetch post");

                const data = await res.json();
                console.log(data);
            } catch (error) {
                console.error("Error fetching post:", error);
                toast.error('Something went wrong');
            }
        }

        fetchPost();
    }, [params.id]);

    return (
        <div>
        Post
        </div>
    )
}
