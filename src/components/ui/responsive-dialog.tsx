"use client"

import * as React from "react"
import { useMedia } from "react-use"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose
} from "@/components/ui/sheet"

const ResponsiveDialogContext = React.createContext<{ isDesktop: boolean }>({ isDesktop: true })

export function ResponsiveDialog({
    children,
    ...props
}: React.ComponentProps<typeof Dialog>) {
    const isDesktop = useMedia("(min-width: 768px)", true)

    return (
        <ResponsiveDialogContext.Provider value={{ isDesktop }}>
            {isDesktop ? (
                <Dialog {...props}>{children}</Dialog>
            ) : (
                <Sheet {...props}>{children}</Sheet>
            )}
        </ResponsiveDialogContext.Provider>
    )
}

export function ResponsiveDialogTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<typeof DialogTrigger>) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)

    if (isDesktop) {
        return <DialogTrigger className={className} {...props}>{children}</DialogTrigger>
    }

    return <SheetTrigger className={className} {...props}>{children}</SheetTrigger>
}

export function ResponsiveDialogContent({
    className,
    children,
    side = "bottom", // Default to bottom sheet for mobile
    ...props
}: React.ComponentProps<typeof DialogContent> & { side?: "top" | "bottom" | "left" | "right" }) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)

    if (isDesktop) {
        return (
            <DialogContent className={className} {...props}>
                {children}
            </DialogContent>
        )
    }

    return (
        <SheetContent side={side} className={className} {...props}>
            {children}
        </SheetContent>
    )
}

export function ResponsiveDialogHeader({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)

    if (isDesktop) {
        return <DialogHeader className={className} {...props} />
    }

    return <SheetHeader className={className} {...props} />
}

export function ResponsiveDialogFooter({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)

    if (isDesktop) {
        return <DialogFooter className={className} {...props} />
    }

    return <SheetFooter className={className} {...props} />
}

export function ResponsiveDialogTitle({
    className,
    ...props
}: React.ComponentProps<typeof DialogTitle>) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)

    if (isDesktop) {
        return <DialogTitle className={className} {...props} />
    }

    return <SheetTitle className={className} {...props} />
}

export function ResponsiveDialogDescription({
    className,
    ...props
}: React.ComponentProps<typeof DialogDescription>) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)

    if (isDesktop) {
        return <DialogDescription className={className} {...props} />
    }

    return <SheetDescription className={className} {...props} />
}

export function ResponsiveDialogClose({
    className,
    ...props
}: React.ComponentProps<typeof DialogClose>) {
    const { isDesktop } = React.useContext(ResponsiveDialogContext)

    if (isDesktop) {
        return <DialogClose className={className} {...props} />
    }

    return <SheetClose className={className} {...props} />
}
