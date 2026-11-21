import '@testing-library/jest-dom';

// Provide dummy Supabase environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test_anon_key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test_service_role_key';
// Las pruebas parten con la tienda según settings, no con la vitrina forzada.
process.env.NEXT_PUBLIC_VITRINA_FORZADA ||= '0';

