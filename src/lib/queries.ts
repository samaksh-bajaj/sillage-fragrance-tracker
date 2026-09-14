import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export type CollectionItem = {
  id: number;
  name: string;
  brand: string;
};

export const queryKeys = {
  collection: (userId: string) => ['collection', userId] as const,
};

export function useCollection() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: queryKeys.collection(userId ?? 'signed-out'),
    enabled: !!userId,
    queryFn: async (): Promise<CollectionItem[]> => {
      const { data, error } = await supabase
        .from('user_fragrances')
        .select('fragrance:fragrances!inner(id, name, brand)')
        .eq('user_id', userId!)
        .eq('status', 'owned')
        .order('updated_at', { ascending: true });
      if (error) throw error;
      return data.map((row) => row.fragrance);
    },
  });
}
