"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, Mail } from "lucide-react";

const stats = [
  { label: "Active Listings", value: "0", icon: Building2 },
  { label: "Total Agents", value: "0", icon: Users },
  { label: "Leads Received", value: "0", icon: Mail },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.business_name || "Photographer"}!
        </h1>
        <p className="mt-1 text-gray-600">
          Here&apos;s an overview of your account
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.label}
                </CardTitle>
                <Icon className="size-5 text-gray-400" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/dashboard/agents/new">Add New Agent</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/listings/new">Create Listing</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
