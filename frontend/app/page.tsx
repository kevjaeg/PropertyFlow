import Link from "next/link";
import {
  Camera,
  Link2,
  Users,
  Smartphone,
  ArrowRight,
  Upload,
  Palette,
  Share2,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-gray-900">PropertyFlow</span>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Deliver stunning property websites{" "}
              <span className="bg-gradient-to-r from-gray-600 to-gray-900 bg-clip-text text-transparent">
                in minutes
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Upload photos and videos once. Get two links — a branded page for
              social media and an unbranded page for MLS. Built for real estate
              photographers who want to deliver fast.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="text-sm font-semibold leading-6 text-gray-900"
              >
                Already have an account?
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative gradient blobs */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gray-100 opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gray-50 opacity-50 blur-3xl" />
      </section>

      {/* Features Section */}
      <section className="border-t border-gray-100 bg-gray-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Everything you need to deliver listings
            </h2>
            <p className="mt-4 text-gray-600">
              One upload. Two links. Zero hassle.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Link2,
                title: "Two Links, One Upload",
                description:
                  "Branded page for marketing + unbranded page for MLS compliance. Automatically generated.",
              },
              {
                icon: Camera,
                title: "Photo Gallery",
                description:
                  "Drag-and-drop photo ordering, full-screen lightbox, responsive images via CDN.",
              },
              {
                icon: Users,
                title: "Agent Profiles",
                description:
                  "Save agent details once, reuse across listings. Contact info and brokerage branding included.",
              },
              {
                icon: Smartphone,
                title: "Mobile-First Design",
                description:
                  "Property pages look beautiful on every device. Fast loading, optimized images.",
              },
            ].map((feature) => (
              <div key={feature.title} className="rounded-xl bg-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Three steps to delivery
            </h2>
          </div>

          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            {[
              {
                icon: Upload,
                step: "1",
                title: "Upload",
                description:
                  "Add property photos, videos, and details. Drag to reorder photos instantly.",
              },
              {
                icon: Palette,
                step: "2",
                title: "Customize",
                description:
                  "Select the listing agent. Their contact info and branding are added automatically.",
              },
              {
                icon: Share2,
                step: "3",
                title: "Share",
                description:
                  "Send the branded link for social media and the unbranded link for MLS. Done.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-gray-100 bg-gray-900 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Start delivering professional listings today
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Free to start. 5 active listings included. No credit card required.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-100"
          >
            Create Your Free Account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-400">
          PropertyFlow
        </div>
      </footer>
    </div>
  );
}
