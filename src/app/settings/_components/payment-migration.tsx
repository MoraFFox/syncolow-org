"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { migrateCompanyPaymentConfig } from '@/lib/migrate-payment-config';
import { toast } from '@/hooks/use-toast';

export function PaymentMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleMigration = async () => {
    setIsRunning(true);
    try {
      const count = await migrateCompanyPaymentConfig();
      setIsComplete(true);
      toast({
        title: 'Migration Complete',
        description: `Updated ${count} companies with default payment configuration (Transfer, Net 30)`,
      });
    } catch (error: any) {
      toast({
        title: 'Migration Failed',
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
        <CardTitle>Payment Configuration Migration</CardTitle>
        <CardDescription>
          Add default payment settings to existing companies (Transfer, Net 30)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleMigration} 
          disabled={isRunning || isComplete}
          variant={isComplete ? "outline" : "default"}
        >
          {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isComplete && <CheckCircle2 className="mr-2 h-4 w-4" />}
          {isComplete ? 'Migration Complete' : 'Run Migration'}
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          This will update all companies without payment configuration. Safe to run multiple times.
        </p>
      </CardContent>
    </Card>
  );
}
