
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
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Subscription failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Jesus News - Subscription Successful!",
        description: "You've been subscribed to get the latest on walks and merch.",
      });
      setEmail("");
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription Error",
        description: error.message || "Your subscription could not be saved. Please try again.",
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
