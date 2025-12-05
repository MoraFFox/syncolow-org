/** @format */

"use client";

import { Car, Wrench } from "lucide-react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DrillTarget } from "@/components/drilldown/drill-target";
import { useTodayAgenda } from "../_hooks/use-dashboard-data";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgendaItem } from "../_lib/dashboard-api";

const EventCard = ({ event }: { event: AgendaItem }) => {
  const EventIcon = ({ type }: { type: string }) => {
    switch (type) {
      case "Maintenance":
        return <Wrench className='h-5 w-5 text-blue-500' />;
      case "Visit":
        return <Car className='h-5 w-5 text-green-500' />;
      default:
        return null;
    }
  };

  const EventLink = ({ event }: { event: AgendaItem }) => {
    switch (event.type) {
      case "Maintenance":
        return `/maintenance`;
      case "Visit":
        return `/visits`;
      default:
        return "/dashboard";
    }
  };

  const card = (
    <Card className='hover:shadow-md transition-shadow'>
      <CardContent className='p-4'>
        <div className='flex items-start gap-4'>
          <div className='pt-1'>
            <EventIcon type={event.type} />
          </div>
          <div className='flex-1'>
            <div className='flex justify-between items-start'>
              <p className='font-semibold'>{event.clientName}</p>
              {event.type === "Maintenance" &&
                // @ts-ignore - data is MaintenanceVisit
                event.data.visitType === "customer_request" && (
                  <Badge variant='outline'>Client Request</Badge>
                )}
            </div>
            <p className='text-sm text-muted-foreground truncate'>
              {event.type === "Maintenance"
                ? // @ts-ignore
                  event.data.maintenanceNotes || "No details available"
                : // @ts-ignore
                  event.data.outcome || "No details available"}
            </p>
            {event.type !== "Maintenance" && (
              <div className='mt-2'>
                <Link href={EventLink({ event })}>
                  <Button variant='secondary' size='sm' className='text-xs h-7'>
                    View Details
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (event.type === "Maintenance") {
    return (
      <DrillTarget
        kind='maintenance'
        payload={{
          id: event.data.id,
          // @ts-ignore
          branchName: event.data.branchName,
          // @ts-ignore
          companyName: event.data.companyName,
        }}
        asChild
      >
        {card}
      </DrillTarget>
    );
  }
  return card;
};

export function TodayAgenda() {
  const { data: todayEvents, isLoading } = useTodayAgenda();

  if (isLoading) {
    return (
      <ScrollArea className='h-[400px] w-full'>
        <div className='space-y-3'>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className='p-4'>
                <div className='flex items-start gap-4'>
                  <Skeleton className='h-5 w-5 rounded-full' />
                  <div className='flex-1 space-y-2'>
                    <Skeleton className='h-4 w-3/4' />
                    <Skeleton className='h-3 w-1/2' />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className='h-[400px] w-full'>
      <div className='space-y-3'>
        {todayEvents && todayEvents.length > 0 ? (
          todayEvents.map((event, index) => (
            <EventCard key={index} event={event} />
          ))
        ) : (
          <div className='flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 rounded-lg border-2 border-dashed py-10'>
            <Wrench className='h-12 w-12 mb-4 text-gray-300 dark:text-gray-600' />
            <p className='font-semibold'>
              No visits or maintenance scheduled for today.
            </p>
            <p className='text-sm'>
              Your agenda is clear. Enjoy the quiet day!
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
