
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Company } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCompanyStore } from '@/store/use-company-store';

interface MergeCompaniesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sourceCompany: Company;
  allCompanies: Company[];
  onMerge: (parentCompanyId: string, childCompanyIds: string[]) => Promise<void>;
}

type MergeMode = 'new' | 'existing';

export function MergeCompaniesDialog({ isOpen, onOpenChange, sourceCompany, allCompanies, onMerge }: MergeCompaniesDialogProps) {
  const [mode, setMode] = useState<MergeMode>('new');
  const [newParentName, setNewParentName] = useState('');
  const [selectedExistingParent, setSelectedExistingParent] = useState<string | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const potentialChildren = useMemo(() => {
    return allCompanies.filter(c => !c.isBranch && c.id !== sourceCompany.id);
  }, [allCompanies, sourceCompany]);
  
  const filteredPotentialChildren = useMemo(() => {
    if (!searchTerm) return potentialChildren;
    return potentialChildren.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [potentialChildren, searchTerm]);

  const potentialParents = useMemo(() => {
      return allCompanies.filter(c => !c.isBranch && c.id !== sourceCompany.id);
  }, [allCompanies, sourceCompany]);

  useEffect(() => {
    if (isOpen) {
      setMode('new');
      setNewParentName('');
      setSelectedExistingParent(null);
      setSelectedChildren([]);
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleMerge = async () => {
    setIsLoading(true);
    let parentId: string | null = null;
    let childIds = [sourceCompany.id, ...selectedChildren];

    if (mode === 'new' && newParentName) {
        // In a real app, you would create the new parent company here and get its ID.
        // For this example, we'll simulate this by passing a special value.
        parentId = `new:${newParentName}`;
    } else if (mode === 'existing' && selectedExistingParent) {
        parentId = selectedExistingParent;
    }
    
    if (parentId) {
        // The onMerge function will need to handle the case of `new:*` to create a company.
        await onMerge(parentId, childIds);
    }
    
    setIsLoading(false);
    onOpenChange(false);
  };
  
  const isSubmitDisabled = isLoading || (mode === 'new' && !newParentName) || (mode === 'existing' && !selectedExistingParent);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Merge Companies</DialogTitle>
          <DialogDescription>
            Merge '{sourceCompany.name}' with other companies into a parent-branch structure.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid gap-2">
            <Label>Merge Into</Label>
             <RadioGroup value={mode} onValueChange={(v) => setMode(v as MergeMode)} className="grid grid-cols-2 gap-4">
                <Label htmlFor="mode-new" className="p-4 border rounded-md has-[:checked]:border-primary">
                    <RadioGroupItem value="new" id="mode-new" className="mr-2" />
                    New Parent Company
                </Label>
                 <Label htmlFor="mode-existing" className="p-4 border rounded-md has-[:checked]:border-primary">
                    <RadioGroupItem value="existing" id="mode-existing" className="mr-2" />
                    Existing Parent Company
                </Label>
            </RadioGroup>
          </div>
          {mode === 'new' ? (
              <div className="grid gap-2">
                <Label htmlFor="new-parent-name">New Parent Company Name</Label>
                <Input id="new-parent-name" value={newParentName} onChange={(e) => setNewParentName(e.target.value)} />
              </div>
          ) : (
             <div className="grid gap-2">
                <Label>Select Existing Parent</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                            {selectedExistingParent ? potentialParents.find(p => p.id === selectedExistingParent)?.name : "Select a company..."}
                             <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                       <Command><CommandInput placeholder="Search..."/><CommandEmpty>No company found.</CommandEmpty><CommandList>
                           {potentialParents.map(p => (
                               <CommandItem key={p.id} onSelect={() => setSelectedExistingParent(p.id)}>{p.name}</CommandItem>
                           ))}
                       </CommandList></Command>
                    </PopoverContent>
                </Popover>
              </div>
          )}

          <div className="grid gap-2">
            <Label>Select Additional Companies to become Branches</Label>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search companies to merge..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 mb-2"
                />
            </div>
             <ScrollArea className="h-48 border rounded-md p-2">
                <div className="space-y-2">
                    {filteredPotentialChildren.map(company => (
                        <div key={company.id} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id={`child-${company.id}`}
                                checked={selectedChildren.includes(company.id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedChildren([...selectedChildren, company.id]);
                                    } else {
                                        setSelectedChildren(selectedChildren.filter(id => id !== company.id));
                                    }
                                }}
                            />
                            <Label htmlFor={`child-${company.id}`}>{company.name}</Label>
                        </div>
                    ))}
                    {filteredPotentialChildren.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No companies found.</p>
                    )}
                </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleMerge} disabled={isSubmitDisabled}>
             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
