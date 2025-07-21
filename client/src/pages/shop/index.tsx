
import { MainLayout } from "@/components/layouts/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

export default function Shop() {
  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        const result = await apiRequest("/api/products");
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Products fetch error:', error);
        throw error;
      }
    },
    staleTime: 0,
    gcTime: 0,
  });

  const { addItem } = useCart();

  const handleAddToCart = (product: Product) => {
    try {
      addItem(product);
    } catch (e) {
      console.error("Failed to add item to cart", e);
      alert("Failed to add item to cart");
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-8">Shop</h1>
            <p>Loading products...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-8">Shop</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Products</h2>
              <p className="text-red-600 mb-4">
                {error instanceof Error ? error.message : 'Failed to load products'}
              </p>
              <Button onClick={() => refetch()} className="mr-2">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!products || products.length === 0) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-8">Shop</h1>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-yellow-800 mb-2">No Products Available</h2>
              <p className="text-yellow-600 mb-4">
                Check back soon for new products!
              </p>
              <Button onClick={() => refetch()}>
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Shop</h1>
        
        <div className="mb-4 text-sm text-gray-500">
          Found {products.length} products
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id}>
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-48 object-cover rounded-t-lg"
                onError={(e) => {
                  e.currentTarget.src = '/assets/napa-valley-vineyard.webp';
                }}
              />
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{product.description}</p>
                <p className="text-lg font-bold mt-2">${Number(product.price).toFixed(2)}</p>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleAddToCart(product)}
                  className="w-full"
                  disabled={product.stock <= 0}
                >
                  {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
