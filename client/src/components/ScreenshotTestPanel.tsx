
import React, { useState, useEffect } from 'react';
import { screenshotTester, ScreenshotTest } from '@/lib/screenshot-testing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ScreenshotTestPanelProps {
  onClose?: () => void;
}

export default function ScreenshotTestPanel({ onClose }: ScreenshotTestPanelProps) {
  const [tests, setTests] = useState<ScreenshotTest[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [activeTest, setActiveTest] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTests(screenshotTester.getTestResults());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const runLoginTest = async () => {
    const testId = `login-test-${Date.now()}`;
    setActiveTest(testId);
    
    await screenshotTester.startTest(
      testId,
      'Admin Login Flow',
      [
        'Login attempt for username:',
        'Login successful',
        'Admin recovery endpoint accessed'
      ]
    );

    // Simulate login process
    setTimeout(async () => {
      await screenshotTester.completeTest(testId);
      setActiveTest(null);
    }, 5000);
  };

  const runAdminRecoveryTest = async () => {
    const testId = `admin-recovery-${Date.now()}`;
    setActiveTest(testId);
    
    await screenshotTester.startTest(
      testId,
      'Admin Recovery Process',
      [
        'Admin recovery endpoint accessed',
        'Found user: markur',
        'Password reset completed'
      ]
    );

    // Trigger admin recovery
    try {
      const response = await fetch('/api/admin-recovery');
      const data = await response.json();
      console.log('Admin recovery response:', data);
    } catch (error) {
      console.error('Admin recovery failed:', error);
    }

    setTimeout(async () => {
      await screenshotTester.completeTest(testId);
      setActiveTest(null);
    }, 3000);
  };

  const runProductCreationTest = async () => {
    const testId = `product-creation-${Date.now()}`;
    setActiveTest(testId);
    
    await screenshotTester.startTest(
      testId,
      'Product Creation Flow',
      [
        'Product creation',
        'Development product created successfully'
      ]
    );

    // Trigger product creation
    try {
      const response = await fetch('/api/dev/create-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();
      console.log('Product creation response:', data);
    } catch (error) {
      console.error('Product creation failed:', error);
    }

    setTimeout(async () => {
      await screenshotTester.completeTest(testId);
      setActiveTest(null);
    }, 3000);
  };

  const clearTests = () => {
    setTests([]);
    screenshotTester.getTestResults().length = 0;
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '80vh',
      overflowY: 'auto',
      zIndex: 9999,
      backgroundColor: 'white',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
    }}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">📸 Screenshot Tests</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsVisible(false)}>
                Minimize
              </Button>
              {onClose && (
                <Button variant="outline" size="sm" onClick={onClose}>
                  ✕
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <Button 
              size="sm" 
              onClick={runLoginTest}
              disabled={!!activeTest}
              className="w-full"
            >
              {activeTest === `login-test-${Date.now()}` ? '⏳' : '🔐'} Test Login Flow
            </Button>
            
            <Button 
              size="sm" 
              onClick={runAdminRecoveryTest}
              disabled={!!activeTest}
              className="w-full"
            >
              {activeTest?.includes('admin-recovery') ? '⏳' : '🔧'} Test Admin Recovery
            </Button>
            
            <Button 
              size="sm" 
              onClick={runProductCreationTest}
              disabled={!!activeTest}
              className="w-full"
            >
              {activeTest?.includes('product-creation') ? '⏳' : '📦'} Test Product Creation
            </Button>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={clearTests}>
              Clear Tests
            </Button>
            <Button variant="outline" size="sm" onClick={() => console.log(screenshotTester.generateReport())}>
              Show Report
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            <h4 className="font-semibold text-sm">Test Results ({tests.length})</h4>
            
            {tests.length === 0 ? (
              <p className="text-sm text-gray-500">No tests run yet</p>
            ) : (
              tests.slice(-5).reverse().map((test) => (
                <div key={test.id} className="p-2 bg-gray-50 rounded border">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium">{test.description}</span>
                    <Badge variant={
                      test.status === 'passed' ? 'default' : 
                      test.status === 'failed' ? 'destructive' : 'secondary'
                    }>
                      {test.status === 'passed' ? '✅' : 
                       test.status === 'failed' ? '❌' : '⏳'} {test.status}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-1">
                    Expected: {test.expectedConsoleMessages.slice(0, 2).join(', ')}
                    {test.expectedConsoleMessages.length > 2 && '...'}
                  </div>
                  
                  {test.consoleMessages.length > 0 && (
                    <div className="text-xs text-gray-800">
                      Last: {test.consoleMessages.slice(-1)[0]?.substring(0, 50)}...
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(test.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Floating toggle button when minimized
export function ScreenshotTestToggle() {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <>
      {!showPanel && (
        <Button
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9998
          }}
          onClick={() => setShowPanel(true)}
          size="sm"
        >
          📸 Tests
        </Button>
      )}
      
      {showPanel && (
        <ScreenshotTestPanel onClose={() => setShowPanel(false)} />
      )}
    </>
  );
}
