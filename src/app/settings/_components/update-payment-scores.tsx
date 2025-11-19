"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useOrderStore } from '@/store/use-order-store';
import { toast } from '@/hooks/use-toast';

export function UpdatePaymentScores() {
  const [isRunning, setIsRunning] = useState(false);
  const { updatePaymentScores } = useOrderStore();

  const handleUpdate = async () => {
    setIsRunning(true);
    try {
      await updatePaymentScores();
      toast({
        title: 'Payment Scores Updated',
        description: 'All payment scores have been recalculated',
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Payment Scores</CardTitle>
        <CardDescription>
          Recalculate payment scores for all orders and companies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleUpdate} 
          disabled={isRunning}
        >
          {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {!isRunning && <RefreshCw className="mr-2 h-4 w-4" />}
          Update Scores
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          This will update days overdue and payment scores for all unpaid orders
        </p>
      </CardContent>
    </Card>
  );
}
