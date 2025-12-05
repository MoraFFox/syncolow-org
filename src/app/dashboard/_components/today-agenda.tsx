/** @format */

"use client";

import { Car, Wrench } from "lucide-react";
import Link from "next/link";
import { ScrollIndicator } from "./scroll-indicator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DrillTarget } from "@/components/drilldown/drill-target";
import { useTodayAgenda } from "../_hooks/use-dashboard-data";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgendaItem } from "../_lib/dashboard-api";
import type { MaintenanceVisit, VisitCall } from "@/lib/types";
import { SectionCard } from "./section-card";
import { EmptyState } from "./empty-state";
import { DASHBOARD_CONFIG } from "../_lib/dashboard-config";

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
                (event.data as MaintenanceVisit).visitType ===
                  "customer_request" && (
                  <Badge variant='outline'>Client Request</Badge>
                )}
            </div>
            <p className='text-sm text-muted-foreground truncate'>
              {event.type === "Maintenance"
                ? (event.data as MaintenanceVisit).maintenanceNotes ||
                  "No details available"
                : (event.data as VisitCall).outcome || "No details available"}
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
          branchName: (event.data as MaintenanceVisit).branchName,
          companyName: (event.data as MaintenanceVisit).companyName,
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

  return (
    <SectionCard
      title="Today's Agenda"
      description='Visits and maintenance scheduled for today.'
      loading={isLoading}
    >
      {isLoading ? (
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
      ) : (
        <ScrollIndicator
          height={DASHBOARD_CONFIG.SCROLL_AREA_HEIGHTS.todayAgenda}
        >
          <div className='space-y-3 pr-4'>
            {todayEvents && todayEvents.length > 0 ? (
              todayEvents.map((event, index) => (
                <EventCard key={index} event={event} />
              ))
            ) : (
              <EmptyState
                title='No visits or maintenance scheduled for today'
                description='Your agenda is clear. Enjoy the quiet day!'
              />
            )}
          </div>
        </ScrollIndicator>
      )}
    </SectionCard>
  );
}
