
import { render, screen } from '@testing-library/react';
import { ResponsiveDialog } from './responsive-dialog';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as ReactUse from 'react-use';

// Mock react-use
vi.mock('react-use', () => ({
    useMedia: vi.fn(),
}));

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
    Dialog: ({ children }: any) => <div data-testid="desktop-dialog">{children}</div>,
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
    DialogDescription: ({ children }: any) => <div>{children}</div>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
    DialogTrigger: ({ children }: any) => <div>{children}</div>,
    DialogClose: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/sheet', () => ({
    Sheet: ({ children }: any) => <div data-testid="mobile-sheet">{children}</div>,
    SheetContent: ({ children }: any) => <div>{children}</div>,
    SheetHeader: ({ children }: any) => <div>{children}</div>,
    SheetTitle: ({ children }: any) => <div>{children}</div>,
    SheetDescription: ({ children }: any) => <div>{children}</div>,
    SheetFooter: ({ children }: any) => <div>{children}</div>,
    SheetTrigger: ({ children }: any) => <div>{children}</div>,
    SheetClose: ({ children }: any) => <div>{children}</div>,
}));

describe('ResponsiveDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render as Dialog (desktop) when isDesktop is true', () => {
        vi.spyOn(ReactUse, 'useMedia').mockReturnValue(true);

        render(
            <ResponsiveDialog isOpen={true} onOpenChange={vi.fn()}>
                <div>Content</div>
            </ResponsiveDialog>
        );

        expect(screen.getByTestId('desktop-dialog')).toBeDefined();
        expect(screen.queryByTestId('mobile-sheet')).toBeNull();
    });

    it('should render as Sheet (mobile) when isDesktop is false', () => {
        vi.spyOn(ReactUse, 'useMedia').mockReturnValue(false);

        render(
            <ResponsiveDialog isOpen={true} onOpenChange={vi.fn()}>
                <div>Content</div>
            </ResponsiveDialog>
        );

        expect(screen.getByTestId('mobile-sheet')).toBeDefined();
        expect(screen.queryByTestId('desktop-dialog')).toBeNull();
    });
});
