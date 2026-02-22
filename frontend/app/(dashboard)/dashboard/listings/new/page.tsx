"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  brokerage_name: string | null;
}

export default function NewListingPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [description, setDescription] = useState("");
  const [mlsNumber, setMlsNumber] = useState("");
  const [agentId, setAgentId] = useState("");

  useEffect(() => {
    api
      .fetch("/agents")
      .then(setAgents)
      .catch((err: unknown) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to load agents"
        );
      })
      .finally(() => setLoadingAgents(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agentId) {
      toast.error("Please select an agent");
      return;
    }

    if (!address.trim()) {
      toast.error("Address is required");
      return;
    }

    const priceInDollars = parseFloat(price);
    if (isNaN(priceInDollars) || priceInDollars <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    const bedsNum = parseInt(beds);
    const bathsNum = parseInt(baths);
    const sqftNum = parseInt(sqft);

    if (isNaN(bedsNum) || bedsNum < 0) {
      toast.error("Please enter valid number of beds");
      return;
    }
    if (isNaN(bathsNum) || bathsNum < 0) {
      toast.error("Please enter valid number of baths");
      return;
    }
    if (isNaN(sqftNum) || sqftNum <= 0) {
      toast.error("Please enter valid square footage");
      return;
    }

    setSubmitting(true);
    try {
      const listing = await api.post("/listings", {
        agent_id: agentId,
        address: address.trim(),
        price: Math.round(priceInDollars * 100), // Convert dollars to cents
        beds: bedsNum,
        baths: bathsNum,
        sqft: sqftNum,
        description: description.trim() || null,
        mls_number: mlsNumber.trim() || null,
      });

      toast.success("Listing created! Now add photos and videos.");
      router.push(`/dashboard/listings/${listing.id}/edit`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create listing"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/listings">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">New Listing</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, Austin TX 78701"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (USD) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="450,000"
                  className="pl-7"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="beds">Beds *</Label>
                <Input
                  id="beds"
                  type="number"
                  min="0"
                  value={beds}
                  onChange={(e) => setBeds(e.target.value)}
                  placeholder="3"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baths">Baths *</Label>
                <Input
                  id="baths"
                  type="number"
                  min="0"
                  value={baths}
                  onChange={(e) => setBaths(e.target.value)}
                  placeholder="2"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sqft">Sqft *</Label>
                <Input
                  id="sqft"
                  type="number"
                  min="0"
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value)}
                  placeholder="1,800"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the property..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mls_number">MLS Number</Label>
              <Input
                id="mls_number"
                value={mlsNumber}
                onChange={(e) => setMlsNumber(e.target.value)}
                placeholder="MLS123456"
              />
            </div>
          </CardContent>
        </Card>

        {/* Select Agent */}
        <Card>
          <CardHeader>
            <CardTitle>Select Agent *</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAgents ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="size-4 animate-spin" />
                Loading agents...
              </div>
            ) : agents.length === 0 ? (
              <div className="text-sm text-gray-500">
                No agents found.{" "}
                <Link
                  href="/dashboard/agents/new"
                  className="text-blue-600 hover:underline"
                >
                  Add an agent first
                </Link>
                .
              </div>
            ) : (
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an agent..." />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                      {agent.brokerage_name
                        ? ` - ${agent.brokerage_name}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <Button type="submit" disabled={submitting || agents.length === 0}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Listing"
          )}
        </Button>
      </form>
    </div>
  );
}
