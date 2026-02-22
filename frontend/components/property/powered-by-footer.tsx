import { ExternalLink } from "lucide-react";

export function PoweredByFooter() {
  return (
    <footer className="border-t border-gray-100 py-8 text-center">
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition hover:text-gray-600"
      >
        Powered by PropertyFlow
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </footer>
  );
}
