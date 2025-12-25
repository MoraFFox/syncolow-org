import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ClientConsumptionAnalytics } from '../client-consumption-analytics';
import { Order } from '@/lib/types';
import { subMonths } from 'date-fns';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe('ClientConsumptionAnalytics', () => {
    it('renders empty state when no orders exist', () => {
        render(<ClientConsumptionAnalytics orders={[]} />);
        expect(screen.getByText('No consumption data available for the last 6 months.')).toBeInTheDocument();
    });

    it('renders analytics correctly for recent orders', () => {
        const today = new Date();
        const mockOrders: Order[] = [
            {
                id: '1',
                orderDate: today.toISOString(),
                status: 'Delivered',
                companyId: '123',
                total: 100, // total is deprecated but required by type
                subtotal: 100,
                totalTax: 0,
                grandTotal: 100,
                paymentStatus: 'Paid',
                isBranch: false,
                items: [
                    { productId: 'p1', productName: 'Coffee Beans', quantity: 10, price: 10, id: 'i1' }
                ]
            } as unknown as Order,
            {
                id: '2',
                orderDate: subMonths(today, 1).toISOString(),
                status: 'Delivered',
                companyId: '123',
                total: 200,
                subtotal: 200,
                totalTax: 0,
                grandTotal: 200,
                paymentStatus: 'Paid',
                isBranch: false,
                items: [
                    { productId: 'p1', productName: 'Coffee Beans', quantity: 20, price: 10, id: 'i2' }
                ]
            } as unknown as Order
        ];

        render(<ClientConsumptionAnalytics orders={mockOrders} />);

        // Expect Product Name
        expect(screen.getByText('Coffee Beans')).toBeInTheDocument();
        // Total Quantity: 10 + 20 = 30
        expect(screen.getByText('30')).toBeInTheDocument();

        // Average: 30 / 6 = 5.0
        // The component format is "5.0 / mo"
        expect(screen.getByText('5.0 / mo')).toBeInTheDocument();
    });

    it('filters out old orders > 6 months', () => {
        const today = new Date();
        const mockOrders: Order[] = [
            {
                id: '1',
                orderDate: subMonths(today, 7).toISOString(), // 7 months ago
                status: 'Delivered',
                companyId: '123',
                total: 100,
                grandTotal: 100,
                subtotal: 100,
                totalTax: 0,
                paymentStatus: 'Paid',
                items: [
                    { productId: 'p1', productName: 'Old Coffee', quantity: 100, price: 10, id: 'i1' }
                ]
            } as unknown as Order
        ];

        render(<ClientConsumptionAnalytics orders={mockOrders} />);
        expect(screen.getByText('No consumption data available for the last 6 months.')).toBeInTheDocument();
    });
});
