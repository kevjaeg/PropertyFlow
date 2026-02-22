import { Phone, Mail } from "lucide-react";

interface AgentCardProps {
  name: string;
  email: string | null;
  phone: string | null;
  brokerage_name: string | null;
  photo_url: string | null;
  brokerage_logo_url: string | null;
}

export function AgentCard({
  name,
  email,
  phone,
  brokerage_name,
  photo_url,
  brokerage_logo_url,
}: AgentCardProps) {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Agent photo */}
          {photo_url ? (
            <img
              src={photo_url}
              alt={name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-xl font-semibold text-gray-500">
              {name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
            {brokerage_name && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {brokerage_logo_url && (
                  <img
                    src={brokerage_logo_url}
                    alt={brokerage_name}
                    className="h-5 w-auto"
                  />
                )}
                <span>{brokerage_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact info */}
        <div className="mt-4 flex flex-wrap gap-4">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              <Phone className="h-4 w-4" />
              {phone}
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              <Mail className="h-4 w-4" />
              {email}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
