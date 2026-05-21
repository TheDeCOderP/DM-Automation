'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AIImageGenProps {
  prompt: string;
  onGenerated: (url: string) => void;
}

export default function AIImageGen({ prompt, onGenerated }: AIImageGenProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Enter an image prompt or generate blog content first');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/ai-agent/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio: '16:9' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image generation failed');
      onGenerated(data.imageUrl);
      toast.success('Image generated!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={generating || !prompt.trim()}
      className="gap-1.5"
    >
      {generating ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
      ) : (
        <><Sparkles className="w-3.5 h-3.5 text-purple-500" /> Generate Image</>
      )}
    </Button>
  );
}
