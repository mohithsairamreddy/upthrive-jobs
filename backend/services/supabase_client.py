import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Public client — respects RLS (used for user-facing requests)
def get_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Service-role client — bypasses RLS (used only in cron jobs / admin ops)
def get_service_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Authenticated client — attach user JWT so RLS applies correctly
def get_authed_client(jwt: str) -> Client:
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    client.auth.set_session(jwt, "")
    return client
