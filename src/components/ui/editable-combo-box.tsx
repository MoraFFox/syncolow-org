
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface EditableComboboxProps {
    options: { label: string; value: string }[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
}

export function EditableCombobox({ options, value, onChange, placeholder, searchPlaceholder, emptyText }: EditableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value || "");

  React.useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showAddOption = inputValue && !options.some(option => option.label.toLowerCase() === inputValue.toLowerCase());

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setInputValue(selectedValue);
    setOpen(false);
  };
  
  const handleAddCustom = () => {
    if (inputValue) {
      onChange(inputValue);
      setOpen(false);
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
          {value || placeholder || "Select option..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder || "Search option..."}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
                {showAddOption ? null : (emptyText || "No option found.")}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
               {showAddOption && (
                <CommandItem onSelect={handleAddCustom}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Add "{inputValue}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
