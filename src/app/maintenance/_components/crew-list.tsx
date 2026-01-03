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
import { Edit, Phone, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { MaintenanceEmployee } from "@/lib/types";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import Link from "next/link";
import { DrillTarget } from "@/components/drilldown/drill-target";
import { Badge } from "@/components/ui/badge";

interface CrewListProps {
  searchTerm: string;
  onEdit: (member: MaintenanceEmployee) => void;
  onDelete: (member: MaintenanceEmployee) => void;
}

export function CrewList({ searchTerm, onEdit, onDelete }: CrewListProps) {
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
                  <div>
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
                    {member.role && <p className='text-xs text-muted-foreground'>{member.role}</p>}
                  </div>
                  <div className='flex gap-1'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => onEdit(member)}
                    >
                      <Edit className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      className='text-destructive hover:text-destructive'
                      onClick={() => onDelete(member)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
                <div className='flex items-center gap-2 justify-between'>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Phone className='h-4 w-4' />
                    <span>{member.phone}</span>
                  </div>
                  {member.status && (
                    <Badge variant='outline' className={member.status === 'active' ? 'bg-green-500/10 text-green-600' : member.status === 'on_leave' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-muted'}>
                      {member.status === 'active' ? 'Active' : member.status === 'on_leave' ? 'On Leave' : 'Inactive'}
                    </Badge>
                  )}
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
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell className='text-muted-foreground'>{member.role || '—'}</TableCell>
                    <TableCell>{member.phone}</TableCell>
                    <TableCell>
                      {member.status ? (
                        <Badge variant='outline' className={member.status === 'active' ? 'bg-green-500/10 text-green-600' : member.status === 'on_leave' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-muted'}>
                          {member.status === 'active' ? 'Active' : member.status === 'on_leave' ? 'On Leave' : 'Inactive'}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className='text-right space-x-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => onEdit(member)}
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='text-destructive hover:text-destructive'
                        onClick={() => onDelete(member)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCrew.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className='text-center h-24'>
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
