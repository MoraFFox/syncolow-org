
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { requestPasswordReset } = useAuth();
  const { toast } = useToast();

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (error) {
       toast({
        title: "Request Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you instructions to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {submitted ? (
                <div className="text-center space-y-4">
                    <p>
                        If an account with that email exists, you will receive an email with password reset instructions shortly.
                    </p>
                    <Button asChild>
                        <Link href="/login">Back to Login</Link>
                    </Button>
                </div>
            ) : (
                <form onSubmit={handleRequestReset}>
                    <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Reset Instructions
                    </Button>
                    </div>
                </form>
            )}
           <div className="mt-4 text-center text-sm">
            Remembered your password?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

