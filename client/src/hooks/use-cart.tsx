import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import type { Product } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Product }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<{
  state: CartState;
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
} | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        const price = typeof action.payload.price === 'string' 
          ? parseFloat(action.payload.price) 
          : Number(action.payload.price);
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
          total: state.total + price
        };
      }
      const price = typeof action.payload.price === 'string' 
        ? parseFloat(action.payload.price) 
        : Number(action.payload.price);
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
        total: state.total + price
      };
    }
    case 'REMOVE_ITEM': {
      const item = state.items.find(item => item.id === action.payload);
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
        total: state.total - (item ? Number(item.price) * item.quantity : 0)
      };
    }
    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload;
      if (quantity < 0) return state;

      const item = state.items.find(item => item.id === id);
      if (!item) return state;

      if (quantity === 0) {
        return {
          ...state,
          items: state.items.filter(item => item.id !== id),
          total: state.total - (Number(item.price) * item.quantity)
        };
      }

      const quantityDiff = quantity - item.quantity;
      return {
        ...state,
        items: state.items.map(item =>
          item.id === id ? { ...item, quantity } : item
        ),
        total: state.total + (Number(item.price) * quantityDiff)
      };
    }
    case 'CLEAR_CART':
      return { items: [], total: 0 };
    default:
      return state;
  }
}

const CART_STORAGE_KEY = 'jesus_walks_cart';

function loadCartFromStorage(): CartState {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the structure
      if (parsed && Array.isArray(parsed.items) && typeof parsed.total === 'number') {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load cart from storage:', error);
  }
  return { items: [], total: 0 };
}

function saveCartToStorage(state: CartState) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save cart to storage:', error);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 }, loadCartFromStorage);

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveCartToStorage(state);
  }, [state]);

  // Safely get toast function with error handling
  let toastFn: any;
  try {
    const { toast } = useToast();
    toastFn = toast;
  } catch (error) {
    console.warn('Toast not available:', error);
    toastFn = () => {}; // No-op function as fallback
  }

  const addItem = (product: Product) => {
    // Ensure price is a valid number
    const sanitizedProduct = {
      ...product,
      price: typeof product.price === 'string' ? parseFloat(product.price) : product.price
    };

    dispatch({ type: 'ADD_ITEM', payload: sanitizedProduct });
    try {
      toastFn({
        title: 'Added to cart',
        description: `${product.name} has been added to your cart.`,
      });
    } catch (error) {
      console.warn('Failed to show toast:', error);
    }
  };

  const removeItem = (productId: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: productId });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id: productId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  return (
    <CartContext.Provider value={{ state, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    // Return a fallback object instead of throwing an error
    console.warn('useCart called outside of CartProvider, returning fallback');
    return {
      state: { items: [], total: 0 },
      addItem: () => {},
      removeItem: () => {},
      updateQuantity: () => {},
      clearCart: () => {}
    };
  }
  return context;
}

export type { CartItem, CartState };