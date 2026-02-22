"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { PhotoUploader } from "@/components/photo-uploader";
import { VideoUploader } from "@/components/video-uploader";
import { ArrowLeft, Loader2, Copy, Check } from "lucide-react";

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string;
  position: number;
}

interface VideoData {
  id: string;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  title: string | null;
  status: string;
}

interface ListingDetail {
  id: string;
  agent_id: string;
  slug: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  description: string | null;
  mls_number: string | null;
  status: string;
  branded_url: string;
  unbranded_url: string;
  agent_name: string | null;
  photos: Photo[];
  videos: VideoData[];
}

interface Agent {
  id: string;
  name: string;
  brokerage_name: string | null;
}

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form state
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [description, setDescription] = useState("");
  const [mlsNumber, setMlsNumber] = useState("");
  const [agentId, setAgentId] = useState("");

  const fetchListing = useCallback(async () => {
    try {
      const data = await api.fetch(`/listings/${params.id}`);
      setListing(data);
      // Populate form fields
      setAddress(data.address);
      setPrice((data.price / 100).toString());
      setBeds(data.beds.toString());
      setBaths(data.baths.toString());
      setSqft(data.sqft.toString());
      setDescription(data.description || "");
      setMlsNumber(data.mls_number || "");
      setAgentId(data.agent_id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load listing"
      );
      router.push("/dashboard/listings");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  const fetchListingMedia = useCallback(async () => {
    // Re-fetch listing to get updated photos/videos
    try {
      const data = await api.fetch(`/listings/${params.id}`);
      setListing(data);
    } catch {
      // Silently handle — the user is still on the page
    }
  }, [params.id]);

  useEffect(() => {
    fetchListing();
    api
      .fetch("/agents")
      .then(setAgents)
      .catch(() => {});
  }, [fetchListing]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

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

    setSaving(true);
    try {
      await api.put(`/listings/${params.id}`, {
        address: address.trim(),
        price: Math.round(priceInDollars * 100),
        beds: bedsNum,
        baths: bathsNum,
        sqft: sqftNum,
        description: description.trim() || null,
        mls_number: mlsNumber.trim() || null,
      });
      toast.success("Listing saved");
      // Re-fetch to get updated slug / URLs
      fetchListingMedia();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save listing"
      );
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async (url: string, field: string) => {
    try {
      const fullUrl = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedField(field);
      toast.success("URL copied to clipboard");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <Card className="max-w-2xl animate-pulse">
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-9 w-full bg-gray-100 rounded" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!listing) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/listings">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Listing</h1>
      </div>

      {/* Generated URLs */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Listing URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-gray-500">Branded URL</Label>
              <p className="text-sm text-gray-700 truncate">
                {window.location.origin}
                {listing.branded_url}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyUrl(listing.branded_url, "branded")}
            >
              {copiedField === "branded" ? (
                <Check className="size-4 text-green-600" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-gray-500">
                MLS / Unbranded URL
              </Label>
              <p className="text-sm text-gray-700 truncate">
                {window.location.origin}
                {listing.unbranded_url}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyUrl(listing.unbranded_url, "unbranded")}
            >
              {copiedField === "unbranded" ? (
                <Check className="size-4 text-green-600" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Property details form */}
      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
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

        {/* Agent selection */}
        <Card>
          <CardHeader>
            <CardTitle>Agent</CardTitle>
          </CardHeader>
          <CardContent>
            {agents.length > 0 ? (
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
            ) : (
              <p className="text-sm text-gray-500">
                {listing.agent_name || "Agent assigned"}
              </p>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </form>

      <Separator className="max-w-2xl" />

      {/* Media section */}
      <div className="max-w-2xl space-y-8">
        {/* Photos */}
        <Card>
          <CardContent className="pt-6">
            <PhotoUploader
              listingId={listing.id}
              photos={listing.photos}
              onPhotosChange={fetchListingMedia}
            />
          </CardContent>
        </Card>

        {/* Videos */}
        <Card>
          <CardContent className="pt-6">
            <VideoUploader
              listingId={listing.id}
              videos={listing.videos}
              onVideosChange={fetchListingMedia}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
