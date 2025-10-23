import { TagIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TagsInput({
  tags,
  currentTag,
  onTagAdd,
  onTagRemove,
  onCurrentTagChange,
  onTagKeyPress
}: {
  tags: string[];
  currentTag: string;
  onTagAdd: () => void;
  onTagRemove: (tag: string) => void;
  onCurrentTagChange: (tag: string) => void;
  onTagKeyPress: (e: React.KeyboardEvent) => void;
}) {
  return (
    <div className="space-y-3">
      <Label htmlFor="tags" className="text-sm font-medium flex items-center gap-2">
        <TagIcon className="w-4 h-4" />
        Tags
      </Label>
      
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1">
              {tag}
              <button
                type="button"
                onClick={() => onTagRemove(tag)}
                className="hover:text-destructive transition-colors"
                aria-label={`Remove ${tag} tag`}
              >
                <XIcon className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      <div className="flex gap-2">
        <Input
          type="text"
          value={currentTag}
          onChange={(e) => onCurrentTagChange(e.target.value)}
          onKeyPress={onTagKeyPress}
          placeholder="Add a tag and press Enter"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={onTagAdd}
          disabled={!currentTag.trim() || tags.includes(currentTag.trim())}
        >
          Add
        </Button>
      </div>
    </div>
  );
}