import Link from "next/link";
import { Home, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FrontendNotFound() {
  return (
    <div className="grid place-items-center min-h-[70vh] p-8">
      <div className="text-center max-w-md space-y-6">
        {/* Icon + Title */}
        <div className="flex justify-center">
          <SearchX className="w-16 h-16 text-muted-foreground" />
        </div>
        <h1 className="text-5xl font-bold">404</h1>
        <p className="text-muted-foreground text-lg">
          Oops! We couldn’t find the page you’re looking for.
        </p>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/contact">
              Need Help?
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
