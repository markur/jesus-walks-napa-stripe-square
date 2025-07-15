
import { useState, useEffect, useCallback } from 'react';
import { screenshotTester, ScreenshotTest } from '@/lib/screenshot-testing';

export function useScreenshotTesting() {
  const [tests, setTests] = useState<ScreenshotTest[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTests([...screenshotTester.getTestResults()]);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const runTest = useCallback(async (
    testId: string,
    description: string,
    expectedMessages: string[],
    testAction: () => Promise<void>
  ) => {
    if (isRunning) return;
    
    setIsRunning(true);
    
    try {
      console.log(`🚀 Starting automated test: ${testId}`);
      await screenshotTester.startTest(testId, description, expectedMessages);
      
      // Run the test action
      await testAction();
      
      // Wait a bit for console messages to appear
      setTimeout(async () => {
        const result = await screenshotTester.completeTest(testId);
        console.log(`📊 Test ${testId} completed:`, result?.status);
        setIsRunning(false);
      }, 2000);
      
    } catch (error) {
      console.error(`❌ Test ${testId} failed:`, error);
      setIsRunning(false);
    }
  }, [isRunning]);

  const runLoginTest = useCallback(async (username: string, password: string) => {
    await runTest(
      `login-${Date.now()}`,
      `Login Test: ${username}`,
      ['Login attempt for username:', 'Login successful'],
      async () => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        console.log('Login test response:', data);
      }
    );
  }, [runTest]);

  const runAdminRecoveryTest = useCallback(async () => {
    await runTest(
      `admin-recovery-${Date.now()}`,
      'Admin Recovery Test',
      ['Admin recovery endpoint accessed', 'Found user:', 'Password reset completed'],
      async () => {
        const response = await fetch('/api/admin-recovery');
        const data = await response.json();
        console.log('Admin recovery test response:', data);
      }
    );
  }, [runTest]);

  const runApiTest = useCallback(async (endpoint: string, method = 'GET', body?: any) => {
    await runTest(
      `api-${endpoint.replace('/', '-')}-${Date.now()}`,
      `API Test: ${method} ${endpoint}`,
      ['in', 'ms'],
      async () => {
        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined
        });
        const data = await response.json();
        console.log(`API test ${endpoint} response:`, data);
      }
    );
  }, [runTest]);

  return {
    tests,
    isRunning,
    runTest,
    runLoginTest,
    runAdminRecoveryTest,
    runApiTest,
    generateReport: () => screenshotTester.generateReport(),
    clearTests: () => {
      setTests([]);
      screenshotTester.getTestResults().length = 0;
    }
  };
}
