import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
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

  const { data: users, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: () => apiRequest("/api/users"),
    enabled: currentUser?.isAdmin === true,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: () => apiRequest("/api/orders"),
    enabled: currentUser?.isAdmin === true,
  });

  const { data: products, error: productsError, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: () => apiRequest("/api/products"),
    enabled: currentUser?.isAdmin === true,
    staleTime: 0,
    gcTime: 0,
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

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Password changed successfully" });
      setShowPasswordForm(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to change password",
        variant: "destructive" 
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/auth/logout', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/login';
    },
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (userData: { username: string; email: string; password: string; isAdmin: boolean }) => {
      return apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      refetchUsers(); // Force refresh
      setShowAddUserForm(false);
      setNewUserForm({ username: '', email: '', password: '', confirmPassword: '', isAdmin: false });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create user",
        variant: "destructive" 
      });
    },
  });

  // State for forms
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    isAdmin: false
  });

  // Order creation state
  const [showCreateOrderForm, setShowCreateOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({
    userId: '',
    productId: '',
    quantity: 1,
    shippingAddress: {
      fullName: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    }
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest('/api/admin/create-order', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Order created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setShowCreateOrderForm(false);
      setOrderForm({
        userId: '',
        productId: '',
        quantity: 1,
        shippingAddress: {
          fullName: '',
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US'
        }
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create order",
        variant: "destructive" 
      });
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserForm.password !== newUserForm.confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newUserForm.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    addUserMutation.mutate({
      username: newUserForm.username,
      email: newUserForm.email,
      password: newUserForm.password,
      isAdmin: newUserForm.isAdmin
    });
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.userId || !orderForm.productId) {
      toast({ title: "Error", description: "Please select both user and product", variant: "destructive" });
      return;
    }
    if (orderForm.quantity < 1) {
      toast({ title: "Error", description: "Quantity must be at least 1", variant: "destructive" });
      return;
    }

    const selectedProduct = products?.find(p => p.id.toString() === orderForm.productId);
    if (!selectedProduct) {
      toast({ title: "Error", description: "Selected product not found", variant: "destructive" });
      return;
    }

    const total = Number(selectedProduct.price) * orderForm.quantity;

    createOrderMutation.mutate({
      userId: parseInt(orderForm.userId),
      items: [{
        productId: parseInt(orderForm.productId),
        quantity: orderForm.quantity,
        price: selectedProduct.price
      }],
      total: total.toFixed(2),
      shippingAddress: orderForm.shippingAddress,
      status: 'pending'
    });
  };

  // State and function to handle editing users
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  const renderUsers = () => (
    <div style={styles.tableContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
        <h2>Users Management</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            style={styles.actionButton}
            onClick={() => setShowPasswordForm(true)}
          >
            Change My Password
          </button>
          <button 
            style={styles.actionButton}
            onClick={() => setShowAddUserForm(true)}
          >
            Add New User
          </button>
        </div>
      </div>

      {/* Password Change Form */}
      {showPasswordForm && (
        <div style={styles.formOverlay}>
          <div style={styles.formContainer}>
            <h3>Change Password</h3>
            <form onSubmit={handlePasswordChange}>
              <div style={styles.formGroup}>
                <label>Current Password:</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  style={styles.formInput}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>New Password:</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  style={styles.formInput}
                  required
                  minLength={6}
                />
              </div>
              <div style={styles.formGroup}>
                <label>Confirm New Password:</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  style={styles.formInput}
                  required
                />
              </div>
              <div style={styles.formButtons}>
                <button type="submit" style={styles.actionButton} disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </button>
                <button 
                  type="button" 
                  style={{ ...styles.actionButton, backgroundColor: '#6b7280' }}
                  onClick={() => setShowPasswordForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Form */}
      {showAddUserForm && (
        <div style={styles.formOverlay}>
          <div style={styles.formContainer}>
            <h3>Add New User</h3>
            <form onSubmit={handleAddUser}>
              <div style={styles.formGroup}>
                <label>Username:</label>
                <input
                  type="text"
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, username: e.target.value }))}
                  style={styles.formInput}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Email:</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                  style={styles.formInput}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Password:</label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                  style={styles.formInput}
                  required
                  minLength={6}
                />
              </div>
              <div style={styles.formGroup}>
                <label>Confirm Password:</label>
                <input
                  type="password"
                  value={newUserForm.confirmPassword}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  style={styles.formInput}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={newUserForm.isAdmin}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                  />
                  Admin User
                </label>
              </div>
              <div style={styles.formButtons}>
                <button type="submit" style={styles.actionButton} disabled={addUserMutation.isPending}>
                  {addUserMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
                <button 
                  type="button" 
                  style={{ ...styles.actionButton, backgroundColor: '#6b7280' }}
                  onClick={() => setShowAddUserForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Username</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Admin</th>
            <th style={styles.th}>Verified</th>
            <th style={styles.th}>Actions</th>
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
              <td style={styles.td}>
                <button 
                  style={styles.actionButton}
                  onClick={() => handleEditUser(user)}
                >
                  Edit
                </button>
              </td>
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

  // Test product creation mutation
  const createTestProductMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/create-test-product', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Test product created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create test product",
        variant: "destructive" 
      });
    },
  });

  const renderProducts = () => (
    <div style={styles.tableContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
        <h2>Products Management</h2>
        <button 
          style={styles.actionButton}
          onClick={() => createTestProductMutation.mutate()}
          disabled={createTestProductMutation.isPending}
        >
          {createTestProductMutation.isPending ? 'Creating...' : 'Create Test Product'}
        </button>
      </div>
      
      {productsError && (
        <div style={{ padding: '1rem', color: 'red', backgroundColor: '#fee' }}>
          Error loading products: {productsError.message}
        </div>
      )}
      
      {productsLoading && (
        <div style={{ padding: '1rem' }}>Loading products...</div>
      )}
      
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

  const renderCreateOrder = () => (
    <div style={styles.tableContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
        <h2>Create Manual Order</h2>
        <button 
          style={styles.actionButton}
          onClick={() => setShowCreateOrderForm(true)}
        >
          Create New Order
        </button>
      </div>

      {/* Create Order Form */}
      {showCreateOrderForm && (
        <div style={styles.formOverlay}>
          <div style={{ ...styles.formContainer, minWidth: '600px' }}>
            <h3>Create Order for Customer</h3>
            <form onSubmit={handleCreateOrder}>
              <div style={styles.formGroup}>
                <label>Select Customer:</label>
                <select
                  value={orderForm.userId}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, userId: e.target.value }))}
                  style={styles.formInput}
                  required
                >
                  <option value="">Choose a customer...</option>
                  {users?.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label>Select Product:</label>
                <select
                  value={orderForm.productId}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, productId: e.target.value }))}
                  style={styles.formInput}
                  required
                >
                  <option value="">Choose a product... ({products?.length || 0} available)</option>
                  {products?.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ${Number(product.price).toFixed(2)} (Stock: {product.stock})
                    </option>
                  ))}
                </select>
                {!products?.length && (
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    No products found. Create a test product first.
                  </div>
                )}
              </div>

              <div style={styles.formGroup}>
                <label>Quantity:</label>
                <input
                  type="number"
                  min="1"
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  style={styles.formInput}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Shipping Address:</h4>
                <div style={styles.formGroup}>
                  <label>Full Name:</label>
                  <input
                    type="text"
                    value={orderForm.shippingAddress.fullName}
                    onChange={(e) => setOrderForm(prev => ({ 
                      ...prev, 
                      shippingAddress: { ...prev.shippingAddress, fullName: e.target.value }
                    }))}
                    style={styles.formInput}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Street Address:</label>
                  <input
                    type="text"
                    value={orderForm.shippingAddress.street}
                    onChange={(e) => setOrderForm(prev => ({ 
                      ...prev, 
                      shippingAddress: { ...prev.shippingAddress, street: e.target.value }
                    }))}
                    style={styles.formInput}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div style={styles.formGroup}>
                    <label>City:</label>
                    <input
                      type="text"
                      value={orderForm.shippingAddress.city}
                      onChange={(e) => setOrderForm(prev => ({ 
                        ...prev, 
                        shippingAddress: { ...prev.shippingAddress, city: e.target.value }
                      }))}
                      style={styles.formInput}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>State:</label>
                    <input
                      type="text"
                      value={orderForm.shippingAddress.state}
                      onChange={(e) => setOrderForm(prev => ({ 
                        ...prev, 
                        shippingAddress: { ...prev.shippingAddress, state: e.target.value }
                      }))}
                      style={styles.formInput}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Zip Code:</label>
                    <input
                      type="text"
                      value={orderForm.shippingAddress.zipCode}
                      onChange={(e) => setOrderForm(prev => ({ 
                        ...prev, 
                        shippingAddress: { ...prev.shippingAddress, zipCode: e.target.value }
                      }))}
                      style={styles.formInput}
                      required
                    />
                  </div>
                </div>
              </div>

              {orderForm.productId && (
                <div style={{ ...styles.formGroup, backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '0.25rem' }}>
                  <strong>Order Summary:</strong>
                  <div>Product: {products?.find(p => p.id.toString() === orderForm.productId)?.name}</div>
                  <div>Quantity: {orderForm.quantity}</div>
                  <div>Total: ${(Number(products?.find(p => p.id.toString() === orderForm.productId)?.price || 0) * orderForm.quantity).toFixed(2)}</div>
                </div>
              )}

              <div style={styles.formButtons}>
                <button type="submit" style={styles.actionButton} disabled={createOrderMutation.isPending}>
                  {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
                </button>
                <button 
                  type="button" 
                  style={{ ...styles.actionButton, backgroundColor: '#6b7280' }}
                  onClick={() => setShowCreateOrderForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ padding: '1rem' }}>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Use this feature to manually create orders for customers. This is useful for phone orders, 
          special requests, or testing purposes.
        </p>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Admin Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={styles.userInfo}>
            Welcome, {currentUser?.username || 'Admin'}
          </div>
          <button 
            style={styles.logoutButton}
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>

      <div style={styles.nav}>
        {['overview', 'users', 'orders', 'products', 'create-order'].map(tab => (
          <button
            key={tab}
            style={{
              ...styles.navButton,
              backgroundColor: activeTab === tab ? '#2563eb' : 'transparent',
              color: activeTab === tab ? 'white' : '#374151'
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'create-order' ? 'Create Order' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'create-order' && renderCreateOrder()}
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
  formOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    minWidth: '400px',
    maxWidth: '500px',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  formInput: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.25rem',
    fontSize: '0.875rem',
    marginTop: '0.25rem',
  },
  formButtons: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
    marginTop: '1.5rem',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '0.25rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontWeight: '500',
  },
};