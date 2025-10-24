import { XIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FAQ {
  question: string;
  answer: string;
}

export default function FAQManager({
  faqs,
  onAdd,
  onRemove,
  onUpdate
}: {
  faqs: FAQ[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: 'question' | 'answer', value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">FAQs</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          Add FAQ
        </Button>
      </div>
      
      <ScrollArea className="max-h-96">
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Label className="text-sm">Question {index + 1}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(index)}
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Enter question"
                  value={faq.question}
                  onChange={(e) => onUpdate(index, 'question', e.target.value)}
                />
                <Textarea
                  placeholder="Enter answer"
                  value={faq.answer}
                  onChange={(e) => onUpdate(index, 'answer', e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
      
      {faqs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No FAQs added yet. Click &quot;Add FAQ&quot; to get started.
        </p>
      )}
    </div>
  );
}