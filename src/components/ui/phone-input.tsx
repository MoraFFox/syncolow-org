
"use client";

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

// Re-export InputProps for backward compatibility
export type InputProps = React.ComponentProps<typeof Input>

// Formats to 01XX-XXXX-XXX
const formatEgyptianPhoneNumber = (value: string): string => {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 8) {
    return `${phoneNumber.slice(0, 4)}-${phoneNumber.slice(4)}`;
  }
  return `${phoneNumber.slice(0, 4)}-${phoneNumber.slice(4, 8)}-${phoneNumber.slice(8, 11)}`;
};

interface PhoneNumberInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const PhoneNumberInput = React.forwardRef<HTMLInputElement, PhoneNumberInputProps>(
  ({ className, onChange, ...props }, ref) => {
    
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const formattedValue = formatEgyptianPhoneNumber(event.target.value);
      event.target.value = formattedValue;
      if (onChange) {
        onChange(event);
      }
    };
    
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace') {
            const input = event.currentTarget;
            const value = input.value;
            const selectionStart = input.selectionStart;

            if (selectionStart !== null && value.charAt(selectionStart - 1) === '-') {
                event.preventDefault();
                // Remove the hyphen and the character before it
                const newValue = value.slice(0, selectionStart - 2) + value.slice(selectionStart);
                const formattedValue = formatEgyptianPhoneNumber(newValue);
                input.value = formattedValue;

                // Set cursor position after formatting
                const newCursorPosition = selectionStart - 2;
                input.setSelectionRange(newCursorPosition, newCursorPosition);
                
                // Manually trigger the onChange handler if it exists
                if (onChange) {
                    const syntheticEvent = {
                      ...event,
                      target: input,
                    } as unknown as React.ChangeEvent<HTMLInputElement>;
                    onChange(syntheticEvent);
                }
            }
        }
    }


    return (
      <Input
        type="tel"
        className={cn(className)}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        maxLength={13}
        ref={ref}
        {...props}
      />
    );
  }
);
PhoneNumberInput.displayName = "PhoneNumberInput";

export { PhoneNumberInput };
