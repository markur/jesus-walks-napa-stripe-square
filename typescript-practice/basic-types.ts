
// TypeScript Basic Types Practice
// Run with: npx tsx typescript-practice/basic-types.ts

// 1. Basic Types
let message: string = "Hello TypeScript!";
let count: number = 42;
let isActive: boolean = true;

// 2. Arrays and Tuples
let numbers: number[] = [1, 2, 3, 4, 5];
let coordinates: [number, number] = [10, 20];

// 3. Objects and Interfaces
interface User {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean; // Optional property
}

const user: User = {
  id: 1,
  name: "John Doe",
  email: "john@example.com"
};

// 4. Functions with Types
function greetUser(user: User): string {
  return `Hello, ${user.name}!`;
}

// 5. Generic Functions
function getFirstItem<T>(items: T[]): T | undefined {
  return items[0];
}

// Practice exercises:
console.log("Basic TypeScript Examples:");
console.log(message);
console.log("User:", user);
console.log(greetUser(user));
console.log("First number:", getFirstItem(numbers));
console.log("First coordinate:", getFirstItem(coordinates));
