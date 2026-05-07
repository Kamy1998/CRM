import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';
import SubmitClientForm from './SubmitClientForm';
import type { Profile } from '@/types';

export default async function SubmitClientPage() {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profile || profile.role !== 'agent') {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Submit New Client</h1>
        <p className="text-sm text-gray-500 mt-1">Fill out the form below to submit a new lead.</p>
      </div>
      <SubmitClientForm currentProfile={profile as Profile} />
    </div>
  );
}
