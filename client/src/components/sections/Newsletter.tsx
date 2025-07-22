import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertWaitlist } from "@shared/schema";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const { mutate, isPending } = useMutation({
    mutationFn: async (email: string) => {
      // Submit directly to Brevo form endpoint
      const formData = new FormData();
      formData.append('EMAIL', email);
      formData.append('email_address_check', '');
      formData.append('locale', 'en');

      const response = await fetch('https://90f09ba3.sibforms.com/serve/MUIFAC_t8qxyKNa9XGBZAO-a_7vbeXXKXhr1XpIUiuRF5sGhiTau1gRbBbWHn9jwVFpX4NqPF_BnjDX-T7PSxXl-GMcKPcdSmU30RWpzmIMOtmWbJixvSOqXIK5PiwYXRJx5PtnYHGQ2ZIHJCVGYwptCR75gOalVlgBII2BoKVtfgMJoWPOUfLGUijDqYae4eWCO3fkZwOreNfAC', {
        method: 'POST',
        body: formData,
        mode: 'no-cors' // Required for cross-origin form submission
      });
      
      // Since we're using no-cors, we can't read the response, so we'll assume success
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Jesus News - Subscription Successful!",
        description: "You've been subscribed to get the latest on walks and merch.",
      });
      setEmail("");
    },
    onError: () => {
      toast({
        title: "Subscription Error",
        description: "Your subscription could not be saved. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic email validation
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    mutate(email);
  };

  return (
    <div className="bg-primary/5 py-16">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Jesus News</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Subscribe to get the latest on walks and merch.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-4 max-w-md mx-auto">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
      </div>
    </div>
  );
}