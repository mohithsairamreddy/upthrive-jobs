import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      // Match Supabase email redirect links (hash tokens). PKCE recovery completes as SIGNED_IN
      // without PASSWORD_RECOVERY; we still consume the URL session in ResetPassword via getSession.
      flowType: 'implicit',
    },
  }
)
