import { Button } from "@/components/ui/button";
import { NewsletterModal } from "./NewsletterModal";

export function Newsletter() {
  return (
    <div className="bg-primary/5 py-16">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Jesus News</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Subscribe to get the latest on walks and merch.
        </p>

        <NewsletterModal>
          <Button size="lg" className="px-8">
            Subscribe Now
          </Button>
        </NewsletterModal>
      </div>
    </div>
  );
}