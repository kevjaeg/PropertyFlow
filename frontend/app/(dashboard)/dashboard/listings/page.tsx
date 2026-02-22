"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Archive,
  RotateCcw,
  Copy,
  Link as LinkIcon,
  Building2,
} from "lucide-react";

interface Listing {
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
  first_photo_url: string | null;
}

type FilterTab = "active" | "archived" | "all";

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function ListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("active");

  const fetchListings = useCallback(async () => {
    try {
      const params = activeTab === "all" ? "" : `?status=${activeTab}`;
      const data = await api.fetch(`/listings${params}`);
      setListings(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load listings"
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchListings();
  }, [fetchListings]);

  const handleToggleStatus = async (listing: Listing) => {
    const newStatus = listing.status === "active" ? "archived" : "active";
    try {
      await api.patch(`/listings/${listing.id}/status`, { status: newStatus });
      toast.success(
        newStatus === "archived" ? "Listing archived" : "Listing activated"
      );
      fetchListings();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status"
      );
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      const fullUrl = `${window.location.origin}${text}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const tabs: { label: string; value: FilterTab }[] = [
    { label: "Active", value: "active" },
    { label: "Archived", value: "archived" },
    { label: "All", value: "all" },
  ];

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-9 w-20 bg-gray-200 rounded animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse overflow-hidden">
              <div className="h-48 bg-gray-200" />
              <CardContent className="space-y-3">
                <div className="h-5 w-3/4 bg-gray-200 rounded" />
                <div className="h-6 w-1/2 bg-gray-200 rounded" />
                <div className="h-4 w-2/3 bg-gray-100 rounded" />
                <div className="h-4 w-1/3 bg-gray-100 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (listings.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Listings</h1>
          <Button asChild>
            <Link href="/dashboard/listings/new">
              <Plus className="size-4" />
              New Listing
            </Link>
          </Button>
        </div>
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.value}
              variant={activeTab === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <Building2 className="size-12 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">
            No listings yet
          </h2>
          <p className="text-gray-500 mt-1 mb-6">
            Create your first listing
          </p>
          <Button asChild>
            <Link href="/dashboard/listings/new">
              <Plus className="size-4" />
              Create Listing
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
        <h1 className="text-3xl font-bold text-gray-900">Listings</h1>
        <Button asChild>
          <Link href="/dashboard/listings/new">
            <Plus className="size-4" />
            New Listing
          </Link>
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Listing cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((listing) => (
          <Card key={listing.id} className="overflow-hidden">
            {/* Hero image */}
            {listing.first_photo_url ? (
              <div className="relative h-48 bg-gray-100">
                <Image
                  src={listing.first_photo_url}
                  alt={listing.address}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            ) : (
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                <Building2 className="size-12 text-gray-400" />
              </div>
            )}

            <CardContent className="space-y-3">
              {/* Address */}
              <p className="text-lg font-bold text-gray-900 line-clamp-1">
                {listing.address}
              </p>

              {/* Price */}
              <p className="text-xl font-semibold text-gray-800">
                {formatPrice(listing.price)}
              </p>

              {/* Beds / Baths / Sqft */}
              <p className="text-sm text-gray-600">
                {listing.beds} bd &middot; {listing.baths} ba &middot;{" "}
                {formatNumber(listing.sqft)} sqft
              </p>

              {/* Status badge + agent name */}
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    listing.status === "active"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  }
                >
                  {listing.status === "active" ? "Active" : "Archived"}
                </Badge>
                {listing.agent_name && (
                  <span className="text-sm text-gray-500 truncate">
                    {listing.agent_name}
                  </span>
                )}
              </div>

              {/* Copy URL buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(listing.branded_url, "Branded URL")
                  }
                  title="Copy branded URL"
                >
                  <LinkIcon className="size-4" />
                  Branded
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(listing.unbranded_url, "MLS URL")
                  }
                  title="Copy MLS URL"
                >
                  <Copy className="size-4" />
                  MLS
                </Button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(`/dashboard/listings/${listing.id}/edit`)
                  }
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(listing)}
                >
                  {listing.status === "active" ? (
                    <>
                      <Archive className="size-4" />
                      Archive
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-4" />
                      Activate
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
