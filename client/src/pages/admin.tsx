
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, queryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { User, Order, Product } from '@shared/schema';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [authChecked, setAuthChecked] = useState(false);
  const { toast } = useToast();

  // Check if user is logged in and is admin with better error handling
  const { data: currentUser, isLoading: isLoadingUser, error: userError, isError } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 10000, // Cache for 10 seconds
    gcTime: 30000, // Keep in cache for 30 seconds
    refetchInterval: false,
  });

  // Mark auth as checked after first load attempt
  useEffect(() => {
    if (!isLoadingUser) {
      setAuthChecked(true);
    }
  }, [isLoadingUser]);

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: currentUser?.isAdmin === true,
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: currentUser?.isAdmin === true,
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: currentUser?.isAdmin === true,
  });

  // Show loading only for initial auth check
  if (isLoadingUser && !authChecked) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h1>Loading...</h1>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Handle authentication errors
  if (isError || userError) {
    console.error('Authentication error:', userError);
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h1>Authentication Error</h1>
          <p>There was a problem checking your authentication status.</p>
          <button 
            style={styles.actionButton}
            onClick={() => {
              // Clear auth cache and redirect to login
              queryClient.removeQueries({ queryKey: ["/api/auth/me"] });
              window.location.href = '/login';
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Not logged in
  if (authChecked && !currentUser) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h1>Please Log In</h1>
          <p>You need to be logged in to access the admin dashboard.</p>
          <button 
            style={styles.actionButton}
            onClick={() => window.location.href = '/login'}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Not admin
  if (authChecked && currentUser && !currentUser.isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h1>Access Denied</h1>
          <p>You don't have admin privileges.</p>
          <button 
            style={styles.actionButton}
            onClick={() => window.location.href = '/'}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // If we're still loading user data but auth is checked, show minimal loading
  if (!currentUser && authChecked) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h1>Loading user data...</h1>
          <p>Please wait a moment.</p>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div style={styles.grid}>
      <div style={styles.statCard}>
        <h3>Total Users</h3>
        <div style={styles.statNumber}>{users?.length || 0}</div>
      </div>
      <div style={styles.statCard}>
        <h3>Total Orders</h3>
        <div style={styles.statNumber}>{orders?.length || 0}</div>
      </div>
      <div style={styles.statCard}>
        <h3>Total Products</h3>
        <div style={styles.statNumber}>{products?.length || 0}</div>
      </div>
      <div style={styles.statCard}>
        <h3>Revenue</h3>
        <div style={styles.statNumber}>
          ${orders?.reduce((sum, order) => sum + Number(order.total), 0).toFixed(2) || '0.00'}
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div style={styles.tableContainer}>
      <h2>Users Management</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Username</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Admin</th>
            <th style={styles.th}>Verified</th>
          </tr>
        </thead>
        <tbody>
          {users?.map(user => (
            <tr key={user.id} style={styles.tr}>
              <td style={styles.td}>{user.id}</td>
              <td style={styles.td}>{user.username}</td>
              <td style={styles.td}>{user.email}</td>
              <td style={styles.td}>{user.isAdmin ? '✅' : '❌'}</td>
              <td style={styles.td}>{user.isVerified ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderOrders = () => (
    <div style={styles.tableContainer}>
      <h2>Orders Management</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Order ID</th>
            <th style={styles.th}>User ID</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Total</th>
            <th style={styles.th}>Created</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders?.map(order => (
            <tr key={order.id} style={styles.tr}>
              <td style={styles.td}>{order.id}</td>
              <td style={styles.td}>{order.userId}</td>
              <td style={styles.td}>
                <span style={{
                  ...styles.status,
                  backgroundColor: getStatusColor(order.status)
                }}>
                  {order.status}
                </span>
              </td>
              <td style={styles.td}>${Number(order.total).toFixed(2)}</td>
              <td style={styles.td}>{new Date(order.createdAt).toLocaleDateString()}</td>
              <td style={styles.td}>
                <button style={styles.actionButton}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderProducts = () => (
    <div style={styles.tableContainer}>
      <h2>Products Management</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Price</th>
            <th style={styles.th}>Stock</th>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products?.map(product => (
            <tr key={product.id} style={styles.tr}>
              <td style={styles.td}>{product.id}</td>
              <td style={styles.td}>{product.name}</td>
              <td style={styles.td}>${Number(product.price).toFixed(2)}</td>
              <td style={styles.td}>{product.stock}</td>
              <td style={styles.td}>{product.category}</td>
              <td style={styles.td}>
                <button style={styles.actionButton}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Admin Dashboard</h1>
        <div style={styles.userInfo}>
          Welcome, {currentUser?.username || 'Admin'}
        </div>
      </div>

      <div style={styles.nav}>
        {['overview', 'users', 'orders', 'products'].map(tab => (
          <button
            key={tab}
            style={{
              ...styles.navButton,
              backgroundColor: activeTab === tab ? '#2563eb' : 'transparent',
              color: activeTab === tab ? 'white' : '#374151'
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'products' && renderProducts()}
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return '#fbbf24';
    case 'paid': return '#10b981';
    case 'shipped': return '#3b82f6';
    case 'delivered': return '#059669';
    case 'cancelled': return '#ef4444';
    default: return '#6b7280';
  }
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    backgroundColor: 'white',
    padding: '1rem 2rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  nav: {
    backgroundColor: 'white',
    padding: '0 2rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    gap: '0.5rem',
  },
  navButton: {
    padding: '0.75rem 1rem',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  content: {
    padding: '2rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: '0.5rem',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    backgroundColor: '#f9fafb',
    padding: '0.75rem',
    textAlign: 'left' as const,
    fontWeight: '600',
    color: '#374151',
    fontSize: '0.875rem',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '0.75rem',
    fontSize: '0.875rem',
    color: '#1f2937',
  },
  status: {
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: 'white',
  },
  actionButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  errorCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const,
    margin: '2rem',
  },
};
