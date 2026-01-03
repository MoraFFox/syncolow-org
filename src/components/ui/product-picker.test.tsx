
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest'; // Add this line to enable matchers
import { ProductPicker } from './product-picker';
import { useProductsStore } from '@/store/use-products-store';
import { useManufacturerStore } from '@/store/use-manufacturer-store';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Product, Manufacturer } from '@/lib/types';

// Mock the stores
vi.mock('@/store/use-products-store');
vi.mock('@/store/use-manufacturer-store');
vi.mock('@/hooks/use-auth', () => ({
    useAuth: vi.fn(),
}));

// Mock IndexedDB to avoid runtime errors
vi.mock('@/lib/cache/indexed-db', () => ({
    IndexedDBStorage: class {
        get = vi.fn();
        set = vi.fn();
        clear = vi.fn();
    },
    indexedDBStorage: {
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn(),
    }
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock PointerEvent
class MockPointerEvent extends Event {
    button: number;
    ctrlKey: boolean;
    pointerType: string;

    constructor(type: string, props: PointerEventInit) {
        super(type, props);
        this.button = props.button || 0;
        this.ctrlKey = props.ctrlKey || false;
        this.pointerType = props.pointerType || 'mouse';
    }
}
global.PointerEvent = MockPointerEvent as any;
global.HTMLElement.prototype.scrollIntoView = vi.fn();
global.HTMLElement.prototype.releasePointerCapture = vi.fn();
global.HTMLElement.prototype.hasPointerCapture = vi.fn();

const mockProducts: Product[] = [
    {
        id: 'prod-1',
        name: 'Apple iPhone 13',
        description: 'Latest model',
        sku: 'IPH-13',
        price: 999,
        stock: 10,
        manufacturerId: 'man-1',
        categoryId: 'cat-1',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'prod-2',
        name: 'Samsung Galaxy S22',
        description: 'Android flagship',
        sku: 'SGS-22',
        price: 899,
        stock: 15,
        manufacturerId: 'man-2',
        categoryId: 'cat-1',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

const mockManufacturers: Manufacturer[] = [
    { id: 'man-1', name: 'Apple', code: 'APL', icon: '🍎', color: '#000000', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'man-2', name: 'Samsung', code: 'SAM', icon: '📱', color: '#0000FF', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

import { useAuth } from '@/hooks/use-auth';

describe('ProductPicker Search', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            user: { email: 'test@example.com' },
        });
        (useProductsStore as any).mockReturnValue({
            products: mockProducts,
            loading: false,
        });
        (useManufacturerStore as any).mockReturnValue({
            manufacturers: mockManufacturers,
            productsByManufacturer: {},
            loading: false,
        });
    });

    it('should filter products when searching', async () => {
        render(<ProductPicker selectedProducts={[]} onSelectionChange={() => { }} />);

        // Open the popover
        const trigger = screen.getByRole('combobox');
        fireEvent.click(trigger);

        // Initial state: both products should be visible
        // Note: commandk might render items lazily or differently, but usually text is present
        expect(screen.getByText('Apple iPhone 13')).toBeInTheDocument();
        expect(screen.getByText('Samsung Galaxy S22')).toBeInTheDocument();

        // Type in search box
        const searchInput = screen.getByPlaceholderText('Search products...');
        fireEvent.change(searchInput, { target: { value: 'Apple' } });

        // Wait for filter to apply
        // If double filtering is happening (bug), "Apple iPhone 13" might disappear 
        // because the command item value is 'prod-1' which doesn't contain 'Apple' 
        // unless commandk keeps the original text for filtering or we customized it.
        // However, the bug description says "disappear all the results".
        // Let's verify if "Apple iPhone 13" is still there.

        // We expect "Apple iPhone 13" to be present if filtering works correctly (or logically fix is applied)
        // If the bug exists, this assertion might fail if the test environment accurately simulates cmdk behavior.
        await waitFor(() => {
            expect(screen.queryByText('Samsung Galaxy S22')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Apple iPhone 13')).toBeInTheDocument();
    });
});
