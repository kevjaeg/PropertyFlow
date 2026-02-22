import { Metadata } from "next";
import { notFound } from "next/navigation";
import { HeroImage } from "@/components/property/hero-image";
import { PropertyHeader } from "@/components/property/property-header";
import { PhotoGrid } from "@/components/property/photo-grid";
import { VideoSection } from "@/components/property/video-section";
import { DescriptionSection } from "@/components/property/description-section";
import { AgentCard } from "@/components/property/agent-card";
import { LeadForm } from "@/components/property/lead-form";
import { PoweredByFooter } from "@/components/property/powered-by-footer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string;
  position: number;
}

interface Video {
  id: string;
  mux_playback_id: string | null;
  title: string | null;
  status: string;
}

interface Agent {
  name: string;
  email: string | null;
  phone: string | null;
  brokerage_name: string | null;
  photo_url: string | null;
  brokerage_logo_url: string | null;
}

interface ListingData {
  slug: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  description: string | null;
  mls_number: string | null;
  photos: Photo[];
  videos: Video[];
  agent: Agent;
}

async function getListing(slug: string): Promise<ListingData | null> {
  try {
    const res = await fetch(`${API_URL}/p/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) return { title: "Property Not Found" };

  const description = `${formatPrice(listing.price)} · ${listing.beds} bd · ${listing.baths} ba · ${listing.sqft.toLocaleString()} sqft — Listed by ${listing.agent.name}`;

  return {
    title: `${listing.address} | PropertyFlow`,
    description,
    openGraph: {
      title: listing.address,
      description,
      images: listing.photos.length > 0 ? [listing.photos[0].url] : [],
    },
  };
}

export default async function BrandedPropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) notFound();

  const heroPhoto = listing.photos.length > 0 ? listing.photos[0] : null;
  const gridPhotos = listing.photos.length > 1 ? listing.photos.slice(1) : [];

  return (
    <div className="mx-auto max-w-5xl bg-white">
      {/* Hero */}
      {heroPhoto && (
        <HeroImage src={heroPhoto.url} alt={listing.address} />
      )}

      {/* Property details */}
      <PropertyHeader
        address={listing.address}
        price={listing.price}
        beds={listing.beds}
        baths={listing.baths}
        sqft={listing.sqft}
        mlsNumber={listing.mls_number}
      />

      <div className="space-y-8 pb-8">
        {/* Photo grid */}
        {gridPhotos.length > 0 && <PhotoGrid photos={gridPhotos} />}

        {/* Video */}
        <VideoSection videos={listing.videos} />

        {/* Description */}
        <DescriptionSection description={listing.description} />

        {/* Agent card */}
        <AgentCard {...listing.agent} />

        {/* Lead form */}
        <LeadForm slug={listing.slug} agentName={listing.agent.name} />
      </div>

      <PoweredByFooter />
    </div>
  );
}
