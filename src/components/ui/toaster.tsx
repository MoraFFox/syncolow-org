"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  ToastAction,
} from "@/components/ui/toast"
import { Copy, Check } from "lucide-react"
import { useState } from "react"

export function Toaster() {
  const { toasts } = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isError = variant === 'destructive'
        const errorText = `${title || ''}${title && description ? '\n' : ''}${description || ''}`
        const isCopied = copiedId === id
        
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="grid gap-1 flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {isError && (
              <ToastAction
                altText="Copy error"
                onClick={() => copyToClipboard(errorText, id)}
              >
                {isCopied ? (
                  <><Check className="h-4 w-4 mr-1" /> Copied</>
                ) : (
                  <><Copy className="h-4 w-4 mr-1" /> Copy</>
                )}
              </ToastAction>
            )}
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
