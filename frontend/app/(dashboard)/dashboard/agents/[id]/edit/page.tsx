"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AgentForm } from "@/components/agent-form";
import { ArrowLeft } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  brokerage_name?: string;
}

export default function EditAgentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .fetch(`/agents/${params.id}`)
      .then(setAgent)
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to load agent");
        router.push("/dashboard/agents");
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleSubmit = async (data: {
    name: string;
    email?: string;
    phone?: string;
    brokerage_name?: string;
  }) => {
    await api.put(`/agents/${params.id}`, data);
    toast.success("Agent updated");
    router.push("/dashboard/agents");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
        <Card className="max-w-lg animate-pulse">
          <CardContent className="space-y-4">
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-9 w-full bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-9 w-full bg-gray-100 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-9 w-full bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-9 w-full bg-gray-100 rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/agents">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Agent</h1>
      </div>
      <AgentForm
        initialData={{
          name: agent.name,
          email: agent.email,
          phone: agent.phone,
          brokerage_name: agent.brokerage_name,
        }}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  );
}
