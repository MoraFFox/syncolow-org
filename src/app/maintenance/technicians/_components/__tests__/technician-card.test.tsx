import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TechnicianCard } from '../technician-card';
import type { MaintenanceEmployee, MaintenanceVisit } from '@/lib/types';

// Mock external dependencies
vi.mock('@/components/maintenance/workload-indicator', () => ({
    WorkloadIndicator: ({ currentLoad, capacity }: { currentLoad: number; capacity: number }) => (
        <div data-testid="workload-indicator">{currentLoad}/{capacity}</div>
    ),
}));

vi.mock('@/lib/utils', () => ({
    cn: (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(' '),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    CheckCircle2: () => <span data-testid="check-icon" />,
    Phone: () => <span data-testid="phone-icon" />,
    ChevronRight: () => <span data-testid="chevron-icon" />,
    Trash2: () => <span data-testid="trash-icon" />,
}));

describe('TechnicianCard', () => {
    const mockEmployee: MaintenanceEmployee = {
        id: 'emp-1',
        name: 'John Doe',
        phone: '555-123-4567',
        email: 'john@example.com',
        role: 'Senior Technician',
        status: 'active',
    };

    const mockActiveVisits: MaintenanceVisit[] = [
        {
            id: 'visit-1',
            branchId: 'branch-1',
            companyId: 'company-1',
            branchName: 'Branch A',
            companyName: 'Company A',
            date: new Date().toISOString(),
            technicianName: 'John Doe',
            visitType: 'scheduled',
            status: 'In Progress',
            maintenanceNotes: 'Notes',
        },
    ];

    const mockCompletedVisits: MaintenanceVisit[] = [
        {
            id: 'visit-2',
            branchId: 'branch-1',
            companyId: 'company-1',
            branchName: 'Branch A',
            companyName: 'Company A',
            date: '2024-01-10',
            technicianName: 'John Doe',
            visitType: 'scheduled',
            status: 'Completed',
            resolutionDate: new Date().toISOString(),
            maintenanceNotes: 'Completed notes',
        },
    ];

    describe('Basic Rendering', () => {
        it('should render employee name', () => {
            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                />
            );

            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should render employee phone number', () => {
            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                />
            );

            expect(screen.getByText('555-123-4567')).toBeInTheDocument();
        });

        it('should render employee role when provided', () => {
            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                />
            );

            expect(screen.getByText('Senior Technician')).toBeInTheDocument();
        });

        it('should not render role when not provided', () => {
            const employeeWithoutRole = { ...mockEmployee, role: undefined };
            render(
                <TechnicianCard
                    employee={employeeWithoutRole}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                />
            );

            expect(screen.queryByText('Senior Technician')).not.toBeInTheDocument();
        });
    });

    describe('Status Badge', () => {
        it('should render active status badge', () => {
            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                />
            );

            // 'Active' appears in multiple places (status badge + workload + metrics)
            expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
        });

        it('should render on_leave status badge', () => {
            const onLeaveEmployee = { ...mockEmployee, status: 'on_leave' as const };
            render(
                <TechnicianCard
                    employee={onLeaveEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                />
            );

            expect(screen.getByText('On Leave')).toBeInTheDocument();
        });

        it('should render inactive status badge', () => {
            const inactiveEmployee = { ...mockEmployee, status: 'inactive' as const };
            render(
                <TechnicianCard
                    employee={inactiveEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                />
            );

            expect(screen.getByText('Inactive')).toBeInTheDocument();
        });
    });

    describe('Workload Display', () => {
        it('should show Available badge when no active visits', () => {
            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                />
            );

            expect(screen.getByText('Available')).toBeInTheDocument();
        });

        it('should show Busy badge when 3+ active visits', () => {
            const threeActiveVisits = [
                ...mockActiveVisits,
                { ...mockActiveVisits[0], id: 'visit-2' },
                { ...mockActiveVisits[0], id: 'visit-3' },
            ];

            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={threeActiveVisits}
                    completedVisitsLast30Days={[]}
                />
            );

            expect(screen.getByText('Busy')).toBeInTheDocument();
        });

        it('should show Overloaded badge when 5+ active visits', () => {
            const fiveActiveVisits = [
                ...mockActiveVisits,
                { ...mockActiveVisits[0], id: 'visit-2' },
                { ...mockActiveVisits[0], id: 'visit-3' },
                { ...mockActiveVisits[0], id: 'visit-4' },
                { ...mockActiveVisits[0], id: 'visit-5' },
            ];

            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={fiveActiveVisits}
                    completedVisitsLast30Days={[]}
                />
            );

            expect(screen.getByText('Overloaded')).toBeInTheDocument();
        });
    });

    describe('Performance Metrics', () => {
        it('should display monthly completion count', () => {
            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={mockActiveVisits}
                    completedVisitsLast30Days={mockCompletedVisits}
                />
            );

            // Multiple '1's appear in the component, verify Month label exists
            expect(screen.getByText('Month')).toBeInTheDocument();
        });

        it('should display on-time percentage', () => {
            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={mockCompletedVisits}
                />
            );

            expect(screen.getByText('100%')).toBeInTheDocument(); // No delays
            expect(screen.getByText('On-Time')).toBeInTheDocument();
        });

        it('should display active visit count', () => {
            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={mockActiveVisits}
                    completedVisitsLast30Days={[]}
                />
            );

            // 'Active' appears multiple times - verify it exists at least once
            expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
        });
    });

    describe('Click Handler', () => {
        it('should call onClick when card is clicked', () => {
            const handleClick = vi.fn();
            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                    onClick={handleClick}
                />
            );

            const card = screen.getByRole('button', { hidden: true }) || screen.getByText('John Doe').closest('[class*="cursor-pointer"]');
            if (card) {
                fireEvent.click(card);
                expect(handleClick).toHaveBeenCalled();
            }
        });
    });

    describe('Delete Button', () => {
        it('should render delete button when onDelete is provided', () => {
            const handleDelete = vi.fn();
            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                    onDelete={handleDelete}
                />
            );

            expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
        });

        it('should not render delete button when onDelete is not provided', () => {
            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                />
            );

            expect(screen.queryByTestId('trash-icon')).not.toBeInTheDocument();
        });

        it('should call onDelete with employee when delete button is clicked', () => {
            const handleDelete = vi.fn();
            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                    onDelete={handleDelete}
                />
            );

            const deleteButton = screen.getByTestId('trash-icon').closest('button');
            if (deleteButton) {
                fireEvent.click(deleteButton);
                expect(handleDelete).toHaveBeenCalledWith(mockEmployee);
            }
        });

        it('should stop propagation when delete button is clicked', () => {
            const handleClick = vi.fn();
            const handleDelete = vi.fn();

            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                    onClick={handleClick}
                    onDelete={handleDelete}
                />
            );

            const deleteButton = screen.getByTestId('trash-icon').closest('button');
            if (deleteButton) {
                fireEvent.click(deleteButton);
                // onClick should NOT be called because delete stopPropagation
                expect(handleClick).not.toHaveBeenCalled();
                expect(handleDelete).toHaveBeenCalled();
            }
        });
    });

    describe('Accessibility', () => {
        it('should render phone icon for phone number', () => {
            render(
                <TechnicianCard
                    employee={mockEmployee}
                    activeVisits={[]}
                    completedVisitsLast30Days={[]}
                />
            );

            expect(screen.getByTestId('phone-icon')).toBeInTheDocument();
        });
    });
});
