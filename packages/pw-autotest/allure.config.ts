import { defineConfig } from 'allure';

export default defineConfig({
  name: 'PW-MCP AutoTest Report',
  output: './allure-report',
  historyPath: './allure-report/history.jsonl',
  plugins: {
    awesome: {
      options: {
        reportName: 'PW-MCP AutoTest',
        singleFile: false,
        reportLanguage: 'en',
      },
    },
    dashboard: {
      options: {
        layout: [
          { type: 'trend', dataType: 'status', mode: 'percent' },
          { type: 'pie', title: 'Test Results' },
        ],
      },
    },
    log: { options: {} },
    progress: { options: {} },
  },
});
