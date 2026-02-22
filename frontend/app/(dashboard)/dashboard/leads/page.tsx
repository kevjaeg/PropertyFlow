"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MessageSquare, Building2 } from "lucide-react";

interface Lead {
  id: string;
  listing_id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  notified: boolean;
  created_at: string;
  listing_address: string | null;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .fetch("/leads")
      .then(setLeads)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Mail className="h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No leads yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Leads will appear here when visitors fill out contact forms on your
              branded property pages.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Badge variant="secondary">{leads.length} total</Badge>
      </div>

      <div className="space-y-3">
        {leads.map((lead) => (
          <Card key={lead.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{lead.name}</CardTitle>
                  {lead.listing_address && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                      <Building2 className="h-3.5 w-3.5" />
                      {lead.listing_address}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(lead.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-3 text-sm">
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {lead.email}
                </a>
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {lead.phone}
                  </a>
                )}
              </div>
              {lead.message && (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>{lead.message}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
