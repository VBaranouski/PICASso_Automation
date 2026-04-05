import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

export default class CustomReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult): void {
    console.log(`${result.status === 'passed' ? '✓' : '✗'} ${test.title} (${result.duration}ms)`);
  }

  onEnd(result: FullResult): void {
    console.log(`\nTest run finished: ${result.status}`);
  }
}
