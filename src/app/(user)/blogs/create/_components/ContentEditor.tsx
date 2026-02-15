import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Code, Eye, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { marked } from 'marked';

interface ContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function ContentEditor({ value, onChange, placeholder }: ContentEditorProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'html'>('preview');

  // Convert plain text to basic HTML (preserve line breaks)
  const plainTextToHtml = (text: string) => {
    return text
      .split('\n\n')
      .map(para => para.trim())
      .filter(para => para.length > 0)
      .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  };

  // Convert Markdown to HTML
  const markdownToHtml = async (markdown: string) => {
    try {
      const html = await marked.parse(markdown, {
        breaks: true, // Convert \n to <br>
        gfm: true, // GitHub Flavored Markdown
      });
      return html;
    } catch (error) {
      console.error('Error converting markdown:', error);
      return markdown;
    }
  };

  // Convert HTML to plain text for preview
  const htmlToPlainText = (html: string) => {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  };

  const handlePlainTextChange = (text: string) => {
    // Convert plain text to HTML and update
    const html = plainTextToHtml(text);
    onChange(html);
  };

  const handleHtmlChange = (html: string) => {
    onChange(html);
  };

  const handleConvertMarkdown = async () => {
    const plainText = htmlToPlainText(value);
    const html = await markdownToHtml(plainText);
    onChange(html);
    setActiveTab('html');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-base flex items-center gap-2">
          Content <span className="text-destructive">*</span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleConvertMarkdown}
          className="gap-2"
        >
          <Wand2 className="w-4 h-4" />
          Convert Markdown to HTML
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preview' | 'html')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="w-4 h-4" />
            Plain Text
          </TabsTrigger>
          <TabsTrigger value="html" className="gap-2">
            <Code className="w-4 h-4" />
            HTML
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-2">
          <Textarea
            value={htmlToPlainText(value)}
            onChange={(e) => handlePlainTextChange(e.target.value)}
            placeholder={placeholder || "Write your blog content here...\n\nEach paragraph will be automatically formatted as HTML.\n\nYou can also paste AI-generated content with **bold**, *italic*, etc. and click 'Convert Markdown to HTML' button."}
            rows={20}
            className="min-h-[500px] text-sm"
            required
          />
          <p className="text-xs text-muted-foreground mt-2">
            Write in plain text or paste Markdown content. Use the "Convert Markdown to HTML" button to format **bold**, *italic*, links, etc.
          </p>
        </TabsContent>

        <TabsContent value="html" className="mt-2">
          <Textarea
            value={value}
            onChange={(e) => handleHtmlChange(e.target.value)}
            placeholder={placeholder || '<p>Write your HTML content here...</p>'}
            rows={20}
            className="min-h-[500px] font-mono text-sm"
            required
          />
          <p className="text-xs text-muted-foreground mt-2">
            Edit HTML directly. This will be sent to WordPress as-is.
          </p>
        </TabsContent>
      </Tabs>

      {/* HTML Preview */}
      {value && (
        <details className="mt-4 border rounded-lg p-4 bg-muted/30">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            Preview Rendered HTML
          </summary>
          <div 
            className="mt-4 prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        </details>
      )}
    </div>
  );
}
