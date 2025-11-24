/**
 * AutocompleteSearch Component
 * Reusable shadcn/ui-based autocomplete search component
 * Uses Command components from shadcn/ui for styling
 * Supports free-form input with autocomplete suggestions
 */

"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface AutocompleteOption {
  value: string;
  label: string;
  [key: string]: any; // Allow additional properties
}

export interface AutocompleteSearchProps {
  options: AutocompleteOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  emptyMessage?: string;
  filterFn?: (option: AutocompleteOption, search: string) => boolean;
  renderOption?: (option: AutocompleteOption) => React.ReactNode;
  className?: string;
  inputClassName?: string;
}

export function AutocompleteSearch({
  options,
  value,
  onValueChange,
  placeholder = "Search...",
  label,
  emptyMessage = "No results found.",
  filterFn,
  renderOption,
  className,
  inputClassName,
}: AutocompleteSearchProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Default filter function
  const defaultFilterFn = (option: AutocompleteOption, search: string) => {
    return option.label.toLowerCase().includes(search.toLowerCase());
  };

  const filter = filterFn || defaultFilterFn;

  // Filter options based on current value
  const filteredOptions = React.useMemo(() => {
    if (!value) return [];
    return options.filter((option) => filter(option, value)).slice(0, 50);
  }, [options, value, filter]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div className={cn("space-y-2", className)} ref={containerRef}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (value && filteredOptions.length > 0) {
              setOpen(true);
            }
          }}
          className={cn("pl-8", inputClassName)}
        />
        {open && value && filteredOptions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-black rounded-sm shadow-lg max-h-60 overflow-auto">
            <Command>
              <CommandList>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        onValueChange(option.value);
                        setOpen(false);
                      }}
                    >
                      {renderOption ? renderOption(option) : option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    </div>
  );
}

