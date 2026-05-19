'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface TinyEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TinyEditor({ value, onChange }: TinyEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="h-[500px] bg-muted animate-pulse rounded-md" />;

  return (
    <Editor
      key={resolvedTheme}
      apiKey="3mh7dx1a38vnr50y4s8lwk76i4zzpn9j7c6xysgdhf4w3gqr"
      value={value}
      onEditorChange={onChange}
      init={{
        height: 500,
        menubar: true,
        skin: resolvedTheme === 'dark' ? 'oxide-dark' : 'oxide',
        content_css: resolvedTheme === 'dark' ? 'dark' : 'default',
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
          'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
          'fullscreen', 'insertdatetime', 'media', 'table', 'wordcount', 'help',
        ],
        toolbar:
          'undo redo | blocks | bold italic underline forecolor backcolor | ' +
          'alignleft aligncenter alignright alignjustify | ' +
          'bullist numlist outdent indent | link image media table | ' +
          'removeformat code fullscreen | help',
        content_style: 'body { font-family: Georgia, serif; font-size: 16px; line-height: 1.8; max-width: 100%; }',
        block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Blockquote=blockquote; Pre=pre',
      }}
    />
  );
}
