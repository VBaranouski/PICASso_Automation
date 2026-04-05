declare namespace NodeJS {
  interface ProcessEnv {
    BASE_URL: string;
    TEST_ENV: 'dev' | 'qa' | 'ppr';
    TEST_ROLE?: 'product_owner' | 'security_manager' | 'security_and_data_protection_advisor' | 'process_quality_leader' | 'it_owner' | 'project_manager' | 'docl' | 'drl' | 'dedicated_privacy_advisor';
    CI?: string;
  }
}
