import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export type CollectionItem = {
  id: number;
  name: string;
  brand: string;
};

export type FragranceDetail = {
  id: number;
  name: string;
  brand: string;
  release_year: number | null;
  concentration: string | null;
  main_accords: string[];
  top_notes: string[];
  middle_notes: string[];
  base_notes: string[];
  perfumers: string[];
};

export const queryKeys = {
  collection: (userId: string) => ['collection', userId] as const,
  fragrance: (id: number) => ['fragrance', id] as const,
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

export function useFragrance(id: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.fragrance(id),
    enabled: Number.isSafeInteger(id),
    queryFn: async (): Promise<FragranceDetail> => {
      const { data, error } = await supabase
        .from('fragrances')
        .select(
          'id, name, brand, release_year, concentration, main_accords, top_notes, middle_notes, base_notes, perfumers',
        )
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    // Show the name and brand from the collection grid while details load.
    placeholderData: () => {
      for (const [, items] of queryClient.getQueriesData<CollectionItem[]>({ queryKey: ['collection'] })) {
        const match = items?.find((item) => item.id === id);
        if (match) {
          return {
            ...match,
            release_year: null,
            concentration: null,
            main_accords: [],
            top_notes: [],
            middle_notes: [],
            base_notes: [],
            perfumers: [],
          };
        }
      }
      return undefined;
    },
  });
}
