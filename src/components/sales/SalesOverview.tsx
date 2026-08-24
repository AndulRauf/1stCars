/**
 * CRM Overview — real KPI numbers computed from the associate's own
 * cars, leads, follow-ups and test drives (no demo statistics).
 */
import * as React from "react";
import { Car, UserPlus, Users, AlarmClock, CalendarClock, ClipboardList, CreditCard, BadgeIndianRupee } from "lucide-react";
import { salesCrm } from "@/src/lib/salesCrm";
import type { SalesData } from "./SalesCrmBits";
import { KpiCard } from "./SalesCrmBits";

interface SalesOverviewProps {
  data: SalesData;
  onNavigate: (tab: string) => void;
}

export function SalesOverview({ data, onNavigate }: SalesOverviewProps) {
  const { leads, cars, followUps, testDrives } = data;
  const k = salesCrm.computeOverview(leads, cars, followUps, testDrives);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label="My Cars" value={k.myCars} tone="green" onClick={() => onNavigate("my_cars")} />
      <KpiCard label="New Leads" value={k.newLeads} tone="sky" onClick={() => onNavigate("leads")} />
      <KpiCard label="Active Leads" value={k.activeLeads} tone="indigo" onClick={() => onNavigate("leads")} />
      <KpiCard label="Follow-ups Due" value={k.followUpsDue} tone="amber" onClick={() => onNavigate("follow_ups")} />
      <KpiCard label="Today's Appointments" value={k.todaysAppointments} tone="indigo" onClick={() => onNavigate("appointments")} />
      <KpiCard label="Upcoming Test Drives" value={k.upcomingTestDrives} tone="amber" onClick={() => onNavigate("test_drives")} />
      <KpiCard label="Bookings" value={k.bookings} onClick={() => onNavigate("pipeline")} />
      <KpiCard label="Sales" value={k.sales} tone="green" onClick={() => onNavigate("pipeline")} />
    </div>
  );
}
