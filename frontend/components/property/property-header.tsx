interface PropertyHeaderProps {
  address: string;
  price: number; // in cents
  beds: number;
  baths: number;
  sqft: number;
  mlsNumber?: string | null;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function PropertyHeader({
  address,
  price,
  beds,
  baths,
  sqft,
  mlsNumber,
}: PropertyHeaderProps) {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        {address}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 text-lg text-gray-600">
        <span className="font-semibold text-gray-900">{formatPrice(price)}</span>
        <span className="text-gray-300">·</span>
        <span>{beds} bd</span>
        <span className="text-gray-300">·</span>
        <span>{baths} ba</span>
        <span className="text-gray-300">·</span>
        <span>{formatNumber(sqft)} sqft</span>
        {mlsNumber && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-400">MLS# {mlsNumber}</span>
          </>
        )}
      </div>
    </div>
  );
}
