"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AgentForm } from "@/components/agent-form";
import { ArrowLeft } from "lucide-react";

export default function NewAgentPage() {
  const router = useRouter();

  const handleSubmit = async (data: {
    name: string;
    email?: string;
    phone?: string;
    brokerage_name?: string;
  }) => {
    await api.post("/agents", data);
    toast.success("Agent created");
    router.push("/dashboard/agents");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/agents">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Add Agent</h1>
      </div>
      <AgentForm onSubmit={handleSubmit} submitLabel="Create Agent" />
    </div>
  );
}
