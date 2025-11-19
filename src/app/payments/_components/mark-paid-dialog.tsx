"use client"

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

interface MarkPaidDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (paidDate: string, reference?: string, notes?: string) => void;
  orderCount?: number;
}

export function MarkPaidDialog({ isOpen, onOpenChange, onConfirm, orderCount = 1 }: MarkPaidDialogProps) {
  const [paidDate, setPaidDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(paidDate, reference || undefined, notes || undefined);
    setPaidDate(format(new Date(), 'yyyy-MM-dd'));
    setReference('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Mark {orderCount > 1 ? `${orderCount} Orders` : 'Order'} as Paid
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="paidDate">Payment Date</Label>
            <Input
              id="paidDate"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="reference">Payment Reference (Optional)</Label>
            <Input
              id="reference"
              placeholder="e.g., Check #1234, Transfer ID"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional payment details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
