import { defineConfig } from 'allure';
import path from 'path';

const projectRoot = path.resolve(__dirname, '..');

export default defineConfig({
  name: 'PW-MCP AutoTest Report',
  output: path.resolve(projectRoot, 'allure-report'),
  historyPath: path.resolve(projectRoot, 'allure-report/history.jsonl'),
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
