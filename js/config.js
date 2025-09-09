import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const config = {
    GOOGLE_MAPS_API_KEY: 'AIzaSyA656-dVM0wWGEYtZDtWQIYvLn8MzFkj_M',
    // Supabase client (public) configuration
    SUPABASE_URL: 'https://kffflwvztmzkbyojazlj.supabase.com',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmZsd3Z6dG16a2J5b2phemxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NDQxMzksImV4cCI6MjA2MjMyMDEzOX0._yvmvlUiq4eMeQD_XY6ZmztrLM1uWZjw-msUMzvvQSo'
};

export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);






