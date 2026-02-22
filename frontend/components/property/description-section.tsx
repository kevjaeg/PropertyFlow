interface DescriptionSectionProps {
  description: string | null;
}

export function DescriptionSection({ description }: DescriptionSectionProps) {
  if (!description) return null;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">
        About this property
      </h2>
      <p className="whitespace-pre-line text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
