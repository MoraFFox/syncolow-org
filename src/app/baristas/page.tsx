/** @format */

"use client";

import { useMemo, useState } from "react";
import { useCompanyStore } from "@/store/use-company-store";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { Input } from "@/components/ui/input";
import {
  Search,
  Star,
  Edit,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import Link from "next/link";
import { DrillTarget } from "@/components/drilldown/drill-target";

export default function AllBaristasPage() {
  const { baristas, companies } = useCompanyStore();
  const { maintenanceVisits } = useMaintenanceStore();
  const [searchTerm, setSearchTerm] = useState("");

  const baristasWithMetrics = useMemo(() => {
    return baristas
      .filter((barista) => {
        if (
          searchTerm &&
          !barista.name.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .map((barista) => {
        const visits = maintenanceVisits.filter(
          (v) => v.baristaId === barista.id
        );
        const attendedVisits = visits.length;
        let averageRating = 0;
        if (attendedVisits > 0) {
          const totalRating = visits.reduce((sum, visit) => {
            switch (visit.overallReport) {
              case "Excellent":
                return sum + 5;
              case "Good":
                return sum + 4;
              case "Average":
                return sum + 3;
              case "Poor":
                return sum + 2;
              default:
                return sum + 0;
            }
          }, 0);
          averageRating = totalRating / attendedVisits;
        }
        const branchName =
          companies.find((c) => c.id === barista.branchId)?.name || "Unknown";
        return { ...barista, attendedVisits, averageRating, branchName };
      });
  }, [baristas, searchTerm, maintenanceVisits, companies]);

  const renderRating = (rating: number) => (
    <div className='flex items-center'>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-3xl font-bold'>All Baristas</h1>
        <p className='text-muted-foreground'>
          A directory of all baristas across all companies.
        </p>
      </div>

      <div className='relative'>
        <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
        <Input
          placeholder='Search by name...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='pl-8'
        />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {baristasWithMetrics.map((barista) => (
          <Card key={barista.id}>
            <CardHeader>
              <CardTitle className='flex justify-between items-start'>
                <DrillTarget
                  kind='barista'
                  payload={{
                    id: barista.id,
                    name: barista.name,
                    branchId: barista.branchId,
                    branchName: barista.branchName,
                    rating: barista.rating,
                    phoneNumber: barista.phoneNumber,
                  }}
                  asChild
                >
                  <Link
                    href={`/baristas/${barista.id}`}
                    className='hover:underline'
                  >
                    {barista.name}
                  </Link>
                </DrillTarget>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 -mr-2 -mt-2'
                >
                  <Link href={`/baristas/${barista.id}`}>
                    <Edit className='h-4 w-4' />
                  </Link>
                </Button>
              </CardTitle>
              <CardDescription className='flex items-center gap-2'>
                <GitBranch className='h-4 w-4' />
                <DrillTarget
                  kind='branch'
                  payload={{ id: barista.branchId, name: barista.branchName }}
                  asChild
                >
                  <span className='cursor-pointer hover:underline'>
                    {barista.branchName}
                  </span>
                </DrillTarget>
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Overall Rating:</span>
                {renderRating(barista.rating)}
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>
                  Avg. Visit Rating:
                </span>
                {renderRating(barista.averageRating)}
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Visits Attended:</span>
                <span className='font-semibold'>{barista.attendedVisits}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {baristasWithMetrics.length === 0 && (
        <p className='text-center text-muted-foreground py-10'>
          No baristas found.
        </p>
      )}
    </div>
  );
}
