import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';
import { searchWords } from '@/lib/search';
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

export type SearchResult = {
  id: number;
  name: string;
  brand: string;
  release_year: number | null;
};

export const MIN_SEARCH_LENGTH = 2;

export const queryKeys = {
  collection: (userId: string) => ['collection', userId] as const,
  fragrance: (id: number) => ['fragrance', id] as const,
  search: (term: string) => ['search', term] as const,
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

export function useSearchFragrances(term: string) {
  const words = searchWords(term);
  const normalizedTerm = words.join(' ');

  return useQuery({
    queryKey: queryKeys.search(normalizedTerm),
    enabled: normalizedTerm.length >= MIN_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<SearchResult[]> => {
      let query = supabase.from('fragrances').select('id, name, brand, release_year');
      for (const word of words) {
        query = query.ilike('search_text', `%${word}%`);
      }
      const { data, error } = await query
        .order('rating_count', { ascending: false, nullsFirst: false })
        .order('name')
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useAddToCollection() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (fragranceId: number) => {
      if (!userId) throw new Error('Sign in to add fragrances.');
      const { error } = await supabase
        .from('user_fragrances')
        .upsert(
          { user_id: userId, fragrance_id: fragranceId, status: 'owned' },
          { onConflict: 'user_id,fragrance_id' },
        );
      if (error) throw error;
    },
    onSettled: () => {
      if (userId) return queryClient.invalidateQueries({ queryKey: queryKeys.collection(userId) });
    },
  });
}

export function useRemoveFromCollection() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const collectionKey = queryKeys.collection(userId ?? 'signed-out');

  return useMutation({
    mutationFn: async (fragranceId: number) => {
      if (!userId) throw new Error('Sign in to change your collection.');
      // Keep the row and mark it 'not owned' so the status can grow into other states later.
      const { error } = await supabase
        .from('user_fragrances')
        .update({ status: 'not owned' })
        .eq('user_id', userId)
        .eq('fragrance_id', fragranceId);
      if (error) throw error;
    },
    onMutate: async (fragranceId) => {
      await queryClient.cancelQueries({ queryKey: collectionKey });
      const previous = queryClient.getQueryData<CollectionItem[]>(collectionKey);
      queryClient.setQueryData<CollectionItem[]>(collectionKey, (items) =>
        items?.filter((item) => item.id !== fragranceId),
      );
      return { previous };
    },
    onError: (_error, _fragranceId, context) => {
      if (context?.previous) queryClient.setQueryData(collectionKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: collectionKey }),
  });
}
