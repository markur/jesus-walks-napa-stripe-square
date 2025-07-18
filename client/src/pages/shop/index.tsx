import { MainLayout } from "@/components/layouts/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@shared/schema";

export default function Shop() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => apiRequest("/api/products"),
    retry: 3,
    retryDelay: 1000,
  });

  if (isLoading) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <div>Loading products...</div>
    </div>
  );

  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <div>Error Loading Products</div>
      <div style={{ color: '#666', marginTop: '0.5rem' }}>
        Failed to load products. Please try again.
      </div>
      <button 
        onClick={() => window.location.reload()} 
        style={{ 
          marginTop: '1rem', 
          padding: '0.5rem 1rem', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Retry
      </button>
    </div>
  );

  if (!products || products.length === 0) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <div>No Products Available</div>
      <div style={{ color: '#666', marginTop: '0.5rem' }}>
        Check back soon for new products!
      </div>
    </div>
  );

  console.log("Shop products query result:", { products, isLoading, error });
  const { addItem } = useCart();


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

        {/* {!products || products.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">No Products Available</h2>
            <p className="text-muted-foreground">
              Check back later or contact support if this persists.
            </p>
          </div>
        ) : ( */}
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
        {/* )} */}
      </div>
    </MainLayout>
  );
}