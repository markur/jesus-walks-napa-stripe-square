
export interface ScreenshotTest {
  id: string;
  description: string;
  expectedConsoleMessages: string[];
  screenshotPath: string;
  timestamp: string;
  status: 'pending' | 'passed' | 'failed';
  consoleMessages: string[];
}

export class ScreenshotTester {
  private tests: ScreenshotTest[] = [];
  private consoleMessages: string[] = [];
  private isCapturing = false;

  constructor() {
    this.setupConsoleCapture();
  }

  private setupConsoleCapture() {
    // Capture console.log messages
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      this.consoleMessages.push(`LOG: ${args.join(' ')}`);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      this.consoleMessages.push(`ERROR: ${args.join(' ')}`);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.consoleMessages.push(`WARN: ${args.join(' ')}`);
      originalWarn.apply(console, args);
    };
  }

  async captureScreenshot(testId: string, description: string): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Use html2canvas if available, otherwise create a simple representation
      if (typeof (window as any).html2canvas !== 'undefined') {
        const canvasElement = await (window as any).html2canvas(document.body);
        return canvasElement.toDataURL();
      } else {
        // Fallback: capture basic page info
        if (ctx) {
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#333';
          ctx.font = '16px Arial';
          ctx.fillText(`Screenshot: ${description}`, 20, 40);
          ctx.fillText(`Time: ${new Date().toISOString()}`, 20, 70);
          ctx.fillText(`URL: ${window.location.href}`, 20, 100);
        }
        return canvas.toDataURL();
      }
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return '';
    }
  }

  async startTest(id: string, description: string, expectedMessages: string[]): Promise<void> {
    this.isCapturing = true;
    this.consoleMessages = []; // Reset console messages for this test
    
    const screenshot = await this.captureScreenshot(id, description);
    
    const test: ScreenshotTest = {
      id,
      description,
      expectedConsoleMessages: expectedMessages,
      screenshotPath: screenshot,
      timestamp: new Date().toISOString(),
      status: 'pending',
      consoleMessages: []
    };

    this.tests.push(test);
    console.log(`📸 Started screenshot test: ${id} - ${description}`);
  }

  async completeTest(id: string): Promise<ScreenshotTest | null> {
    const test = this.tests.find(t => t.id === id && t.status === 'pending');
    if (!test) {
      console.error(`Test ${id} not found or already completed`);
      return null;
    }

    test.consoleMessages = [...this.consoleMessages];
    
    // Check if expected messages are present
    const allExpectedFound = test.expectedConsoleMessages.every(expected =>
      test.consoleMessages.some(actual => actual.includes(expected))
    );

    test.status = allExpectedFound ? 'passed' : 'failed';
    this.isCapturing = false;

    console.log(`📸 Completed screenshot test: ${id} - Status: ${test.status}`);
    
    if (test.status === 'failed') {
      console.error('Missing expected messages:', 
        test.expectedConsoleMessages.filter(expected =>
          !test.consoleMessages.some(actual => actual.includes(expected))
        )
      );
    }

    return test;
  }

  getTestResults(): ScreenshotTest[] {
    return this.tests;
  }

  generateReport(): string {
    const passed = this.tests.filter(t => t.status === 'passed').length;
    const failed = this.tests.filter(t => t.status === 'failed').length;
    const pending = this.tests.filter(t => t.status === 'pending').length;

    return `
📊 Screenshot Test Report
========================
Total Tests: ${this.tests.length}
✅ Passed: ${passed}
❌ Failed: ${failed}
⏳ Pending: ${pending}

Detailed Results:
${this.tests.map(test => `
${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏳'} ${test.id}: ${test.description}
  Expected: ${test.expectedConsoleMessages.join(', ')}
  Actual: ${test.consoleMessages.slice(-3).join(', ')}
  Time: ${test.timestamp}
`).join('')}
    `;
  }
}

// Global instance
export const screenshotTester = new ScreenshotTester();
