
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface NewsletterModalProps {
  children: React.ReactNode;
}

export function NewsletterModal({ children }: NewsletterModalProps) {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
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
        mode: 'no-cors'
      });
      
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Jesus News - Subscription Successful!",
        description: "You've been subscribed to get the latest on walks and merch.",
      });
      setEmail("");
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Jesus Walks Community</DialogTitle>
        </DialogHeader>
        <div className="text-center">
          <p className="text-muted-foreground mb-6">
            Subscribe to get the latest on walks and merch.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Subscribing..." : "Subscribe"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
