'use client';

import { useState } from 'react';
import { Check, Plus, X, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface PortalTagSelectProps {
  label: string;
  selected: string[];
  onChange: (v: string[]) => void;
  options: string[];
  loading?: boolean;
}

export function PortalTagSelect({ label, selected, onChange, options, loading }: PortalTagSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const trimmed = search.trim();
  const lc = (s: string) => s.toLowerCase();
  const isSelected = (name: string) => selected.some(s => lc(s) === lc(name));
  const isNew = trimmed.length > 0 && !options.some(o => lc(o) === lc(trimmed)) && !isSelected(trimmed);

  const toggle = (name: string) => {
    onChange(isSelected(name) ? selected.filter(s => lc(s) !== lc(name)) : [...selected, name]);
  };

  const addNew = () => {
    if (!trimmed) return;
    if (!isSelected(trimmed)) onChange([...selected, trimmed]);
    setSearch('');
  };

  const remove = (name: string) => onChange(selected.filter(s => lc(s) !== lc(name)));

  // Options not yet selected (to show in list)
  const available = options.filter(o => !isSelected(o));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-9 font-normal"
            disabled={loading}
          >
            <span className="text-muted-foreground text-sm">
              {loading ? (
                <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading from portal...</span>
              ) : (
                `Select or add ${label.toLowerCase()}...`
              )}
            </span>
            <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Search ${label.toLowerCase()}...`}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isNew && (
                <CommandGroup heading="Add new">
                  <CommandItem
                    value={`__new__${trimmed}`}
                    onSelect={addNew}
                    className="gap-2"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    <span>Add <strong>&quot;{trimmed}&quot;</strong></span>
                  </CommandItem>
                </CommandGroup>
              )}

              {available.filter(o => o.toLowerCase().includes(trimmed.toLowerCase())).length > 0 && (
                <CommandGroup heading={`Available ${label}`}>
                  {available
                    .filter(o => o.toLowerCase().includes(trimmed.toLowerCase()))
                    .map(option => (
                      <CommandItem
                        key={option}
                        value={option}
                        onSelect={() => { toggle(option); setSearch(''); }}
                      >
                        <Check className="w-4 h-4 mr-1 shrink-0 opacity-0" />
                        {option}
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {selected.length > 0 && (
                <CommandGroup heading="Selected">
                  {selected
                    .filter(s => s.toLowerCase().includes(trimmed.toLowerCase()))
                    .map(s => (
                      <CommandItem
                        key={s}
                        value={`__sel__${s}`}
                        onSelect={() => toggle(s)}
                      >
                        <Check className="w-4 h-4 mr-1 shrink-0 text-primary" />
                        {s}
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {!isNew &&
                available.filter(o => o.toLowerCase().includes(trimmed.toLowerCase())).length === 0 &&
                selected.filter(s => s.toLowerCase().includes(trimmed.toLowerCase())).length === 0 && (
                  <CommandEmpty className="py-4 text-sm text-muted-foreground">
                    {trimmed ? `No match — type to add "${trimmed}"` : `No ${label.toLowerCase()} found`}
                  </CommandEmpty>
                )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(s => (
            <Badge key={s} variant="secondary" className="gap-1 pr-1">
              {s}
              <button
                type="button"
                onClick={() => remove(s)}
                className="ml-0.5 rounded-full hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
