
// TypeScript Challenges - Based on Jesus Walks Napa Project
// Run with: npx tsx typescript-practice/challenges.ts

// Challenge 1: Create types for your user system
interface JesusWalksUser {
  id: number;
  username: string;
  email: string;
  profile?: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

// Challenge 2: Type your events
interface HikingEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  price?: number;
}

// Challenge 3: Shopping cart types
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface ShoppingCart {
  items: CartItem[];
  total: number;
}

// Challenge 4: Payment processing types
type PaymentStatus = "pending" | "processing" | "completed" | "failed";

interface PaymentRequest {
  amount: number;
  currency: string;
  method: "apple_pay" | "google_pay" | "credit_card";
  merchantReference: string;
}

// Practice functions
function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function createEvent(eventData: Omit<HikingEvent, "id" | "currentParticipants">): HikingEvent {
  return {
    ...eventData,
    id: `event-${Date.now()}`,
    currentParticipants: 0
  };
}

// Test your functions
const sampleCart: CartItem[] = [
  { productId: "1", name: "Hiking Guide", price: 29.99, quantity: 1 },
  { productId: "2", name: "Water Bottle", price: 15.99, quantity: 2 }
];

console.log("Cart total:", calculateCartTotal(sampleCart));

const newEvent = createEvent({
  title: "Sunset Prayer Hike",
  description: "Join us for a peaceful evening hike",
  date: new Date("2024-08-01T18:00:00"),
  location: "Napa Valley Hills",
  maxParticipants: 20,
  price: 25
});

console.log("New event:", newEvent);
