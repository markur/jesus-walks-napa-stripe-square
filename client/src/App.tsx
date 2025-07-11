import { Route, Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Shop from "@/pages/shop";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import OrderConfirmation from "@/pages/order-confirmation";
import Events from "@/pages/events";
import PaymentTest from "@/pages/payment-test";
import TestDeploy from "@/pages/test-deploy";
import AdminDashboard from "@/pages/admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/shop" component={Shop} />
        <Route path="/cart" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/order-confirmation" component={OrderConfirmation} />
        <Route path="/events" component={Events} />
        <Route path="/payment-test" component={PaymentTest} />
        <Route path="/test-deploy" component={TestDeploy} />
        <Route path="/admin" component={AdminDashboard} />
        <Route component={NotFound} />
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;