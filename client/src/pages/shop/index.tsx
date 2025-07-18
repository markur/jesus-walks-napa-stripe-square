import { MainLayout } from "@/components/layouts/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@shared/schema";

export default function Shop() {
  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  console.log("Shop products query result:", { products, isLoading, error });
  const { addItem } = useCart();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-48 bg-muted rounded-lg mb-4" />
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    console.error("Shop products error:", error);
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Error Loading Products</h2>
            <p className="text-muted-foreground">Failed to load products. Please try again.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Shop</h1>
        
        {/* Debug info */}
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">
            Debug: Found {products?.length || 0} products
          </p>
        </div>

        {!products || products.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">No Products Available</h2>
            <p className="text-muted-foreground">
              Check back later or contact support if this persists.
            </p>
          </div>
        ) : (
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
                    className="w-full" 
                    onClick={() => addItem(product)}
                    disabled={product.stock <= 0}
                  >
                    {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}