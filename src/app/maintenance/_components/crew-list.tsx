/** @format */

"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Edit, Phone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { MaintenanceEmployee } from "@/lib/types";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import Link from "next/link";
import { DrillTarget } from "@/components/drilldown/drill-target";

interface CrewListProps {
  searchTerm: string;
  onEdit: (member: MaintenanceEmployee) => void;
}

export function CrewList({ searchTerm, onEdit }: CrewListProps) {
  const { maintenanceEmployees } = useMaintenanceStore();

  const filteredCrew = useMemo(() => {
    if (!maintenanceEmployees) return [];
    return maintenanceEmployees.filter((member) => {
      const searchLower = searchTerm.toLowerCase();
      if (searchLower) {
        return (
          member.name.toLowerCase().includes(searchLower) ||
          member.phone.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [maintenanceEmployees, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance Crew</CardTitle>
        <CardDescription>
          Manage your team of maintenance technicians.
        </CardDescription>
      </CardHeader>
      <CardContent className='p-0'>
        {/* Mobile View: Card List */}
        <div className='grid grid-cols-1 gap-4 p-4 md:hidden'>
          {filteredCrew.map((member) => (
            <Card key={member.id}>
              <CardContent className='p-4 space-y-3'>
                <div className='flex justify-between items-start'>
                  <DrillTarget
                    kind='barista'
                    payload={{
                      id: member.id,
                      name: member.name,
                      phoneNumber: member.phone,
                    }}
                    asChild
                  >
                    <Link
                      href={`/maintenance/crew/${member.id}`}
                      className='font-semibold hover:underline'
                    >
                      {member.name}
                    </Link>
                  </DrillTarget>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => onEdit(member)}
                  >
                    <Edit className='mr-2 h-4 w-4' /> Edit
                  </Button>
                </div>
                <div className='space-y-2 text-sm text-muted-foreground'>
                  <div className='flex items-center gap-2'>
                    <Phone className='h-4 w-4' />
                    <span>{member.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredCrew.length === 0 && (
            <p className='text-center text-sm text-muted-foreground py-4'>
              No crew members found.
            </p>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className='hidden md:block rounded-lg border'>
          <ScrollArea className='h-[600px]'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCrew.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className='font-medium'>
                      <DrillTarget
                        kind='barista'
                        payload={{
                          id: member.id,
                          name: member.name,
                          phoneNumber: member.phone,
                        }}
                        asChild
                      >
                        <Link
                          href={`/maintenance/crew/${member.id}`}
                          className='hover:underline'
                        >
                          {member.name}
                        </Link>
                      </DrillTarget>
                    </TableCell>
                    <TableCell>{member.phone}</TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => onEdit(member)}
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCrew.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className='text-center h-24'>
                      No crew members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
