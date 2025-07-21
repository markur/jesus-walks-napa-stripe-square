
// Advanced TypeScript Concepts Practice
// Run with: npx tsx typescript-practice/advanced-concepts.ts

// 1. Union Types
type Status = "pending" | "approved" | "rejected";

interface Order {
  id: string;
  status: Status;
  amount: number;
}

// 2. Type Guards
function isString(value: unknown): value is string {
  return typeof value === "string";
}

// 3. Classes with TypeScript
class EventManager {
  private events: string[] = [];
  
  public addEvent(event: string): void {
    this.events.push(event);
  }
  
  public getEvents(): readonly string[] {
    return [...this.events];
  }
}

// 4. Enums
enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  PAYPAL = "paypal",
  APPLE_PAY = "apple_pay"
}

// 5. Utility Types
interface BaseUser {
  id: number;
  name: string;
  email: string;
  password: string;
}

// Pick only certain properties
type PublicUser = Pick<BaseUser, "id" | "name" | "email">;

// Make all properties optional
type UserUpdate = Partial<BaseUser>;

// Practice with your existing codebase patterns
const eventManager = new EventManager();
eventManager.addEvent("Napa Valley Hike");
console.log("Events:", eventManager.getEvents());

const order: Order = {
  id: "order-123",
  status: "pending",
  amount: 49.99
};

console.log("Order status:", order.status);
console.log("Payment method:", PaymentMethod.APPLE_PAY);
