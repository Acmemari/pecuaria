import { supabase } from './supabase';

export interface Person {
  id: string;
  created_by: string;
  full_name: string;
  preferred_name: string | null;
  person_type: string;
  job_role: string | null;
  phone_whatsapp: string | null;
  email: string | null;
  location_farm: string | null;
  location_city_uf: string | null;
  base: string | null;
  photo_url: string | null;
  main_activities: string | null;
  created_at: string;
  updated_at: string;
}

export type PersonFormData = Omit<Person, 'id' | 'created_by' | 'created_at' | 'updated_at'> & {
  full_name: string;
  preferred_name?: string;
  person_type: string;
  job_role?: string;
  phone_whatsapp?: string;
  email?: string;
  location_farm?: string;
  location_city_uf?: string;
  base?: string;
  photo_url?: string | null;
  main_activities?: string;
};

export async function fetchPeople(userId: string): Promise<Person[]> {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('created_by', userId)
    .order('full_name', { ascending: true });
  if (error) throw error;
  return (data || []) as Person[];
}

export async function createPerson(userId: string, payload: Partial<PersonFormData>): Promise<Person> {
  const { data, error } = await supabase
    .from('people')
    .insert({
      created_by: userId,
      full_name: payload.full_name || '',
      preferred_name: payload.preferred_name || null,
      person_type: payload.person_type || 'Colaborador Fazenda',
      job_role: payload.job_role || null,
      phone_whatsapp: payload.phone_whatsapp || null,
      email: payload.email || null,
      location_farm: payload.location_farm || null,
      location_city_uf: payload.location_city_uf || null,
      base: payload.base || null,
      photo_url: payload.photo_url || null,
      main_activities: payload.main_activities || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Person;
}

export async function updatePerson(id: string, payload: Partial<PersonFormData>): Promise<Person> {
  const { data, error } = await supabase
    .from('people')
    .update({
      full_name: payload.full_name,
      preferred_name: payload.preferred_name ?? null,
      person_type: payload.person_type,
      job_role: payload.job_role ?? null,
      phone_whatsapp: payload.phone_whatsapp ?? null,
      email: payload.email ?? null,
      location_farm: payload.location_farm ?? null,
      location_city_uf: payload.location_city_uf ?? null,
      base: payload.base ?? null,
      photo_url: payload.photo_url ?? null,
      main_activities: payload.main_activities ?? null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Person;
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) throw error;
}

const BUCKET = 'people-photos';

export async function uploadPersonPhoto(userId: string, personId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${personId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}
