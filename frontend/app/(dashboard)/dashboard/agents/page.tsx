"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Phone, Mail, Pencil, Trash2, Users } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  brokerage_name?: string;
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    try {
      const data = await api.fetch("/agents");
      setAgents(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete this agent?`)) return;

    try {
      await api.delete(`/agents/${id}`);
      toast.success(`${name} deleted`);
      fetchAgents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete agent");
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="space-y-3">
                <div className="h-6 w-40 bg-gray-200 rounded" />
                <div className="h-4 w-32 bg-gray-100 rounded" />
                <div className="h-4 w-36 bg-gray-100 rounded" />
                <div className="h-4 w-44 bg-gray-100 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (agents.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
        <div className="flex flex-col items-center justify-center py-20">
          <Users className="size-12 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">No agents yet</h2>
          <p className="text-gray-500 mt-1 mb-6">
            Add your first agent to start creating listings
          </p>
          <Button asChild>
            <Link href="/dashboard/agents/new">
              <Plus className="size-4" />
              Add Agent
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
        <Button asChild>
          <Link href="/dashboard/agents/new">
            <Plus className="size-4" />
            Add Agent
          </Link>
        </Button>
      </div>

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardContent className="space-y-3">
              {/* Name & brokerage */}
              <div>
                <p className="text-lg font-bold text-gray-900">{agent.name}</p>
                {agent.brokerage_name && (
                  <p className="text-sm text-gray-500">{agent.brokerage_name}</p>
                )}
              </div>

              {/* Contact info */}
              {agent.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="size-4 text-gray-400" />
                  {agent.phone}
                </div>
              )}
              {agent.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="size-4 text-gray-400" />
                  {agent.email}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/agents/${agent.id}/edit`)}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(agent.id, agent.name)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
