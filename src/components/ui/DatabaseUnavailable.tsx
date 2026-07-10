import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface DatabaseUnavailableProps {
  title?: string;
  message?: string;
}

export default function DatabaseUnavailable({
  title = "We're having a brief connection issue",
  message = "Our catalog is temporarily unavailable. Please wait a moment and try again.",
}: DatabaseUnavailableProps) {
  return (
    <div className="bg-background min-h-[50vh] flex items-center justify-center px-lg py-xl">
      <div className="max-w-lg text-center space-y-md">
        <h1 className="font-heading text-h2 text-primary">{title}</h1>
        <p className="font-body text-body text-primary/80">{message}</p>
        <div className="flex flex-col sm:flex-row gap-sm justify-center pt-sm">
          <Link href="/">
            <Button variant="secondary">Go to Homepage</Button>
          </Link>
          <Link href="/products">
            <Button variant="primary">Browse Catalog</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
