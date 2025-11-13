"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface CategoryAutocompleteProps {
  value?: string;
  onValueChange: (value: string) => void;
}

export function CategoryAutocomplete({
  value,
  onValueChange,
}: CategoryAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("roadmap_items")
        .select("category")
        .not("category", "is", null);

      if (!error && data) {
        const uniqueCategories = Array.from(
          new Set(data.map((item) => item.category).filter(Boolean))
        ) as string[];
        setCategories(uniqueCategories.sort());
      }
    };

    fetchCategories();
  }, []);

  const filteredCategories = categories.filter((cat) =>
    cat.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
    setSearchValue("");
  };

  const handleCreateNew = () => {
    if (searchValue.trim()) {
      onValueChange(searchValue.trim());
      setOpen(false);
      setSearchValue("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value || "Select category..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or create category..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredCategories.length === 0 && searchValue && (
              <CommandEmpty>
                <CommandItem onSelect={handleCreateNew}>
                  Create &quot;{searchValue}&quot;
                </CommandItem>
              </CommandEmpty>
            )}
            {filteredCategories.length === 0 && !searchValue && (
              <CommandEmpty>No categories found.</CommandEmpty>
            )}
            {filteredCategories.length > 0 && (
              <CommandGroup>
                {filteredCategories.map((category) => (
                  <CommandItem
                    key={category}
                    value={category}
                    onSelect={() => handleSelect(category)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === category ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {category}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searchValue &&
              !filteredCategories.includes(searchValue) &&
              filteredCategories.length > 0 && (
                <CommandGroup>
                  <CommandItem onSelect={handleCreateNew}>
                    Create &quot;{searchValue}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

