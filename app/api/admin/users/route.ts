import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getCallerProfile() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
  return data;
}

export async function POST(req: NextRequest) {
  const caller = await getCallerProfile();
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { email, full_name, role, password } = await req.json();
  if (!email || !full_name || !role || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const admin = adminSupabase();

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Profile is auto-created by trigger, but update it to be sure
  await admin.from('profiles').upsert({
    id: authData.user.id,
    email,
    full_name,
    role,
    is_active: true,
  });

  return NextResponse.json({ success: true, userId: authData.user.id });
}

export async function PATCH(req: NextRequest) {
  const caller = await getCallerProfile();
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { userId, full_name, role, is_active, password } = await req.json();
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const admin = adminSupabase();

  // Update profile
  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name, role, is_active })
    .eq('id', userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  // Reset password if provided
  if (password) {
    const { error: pwError } = await admin.auth.admin.updateUserById(userId, { password });
    if (pwError) {
      return NextResponse.json({ error: pwError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true });
}
