import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addPhrase, updatePhraseReview, deletePhrase } from "@/db/actions";

export const useAddPhrase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ original, translated, pronunciation }: { original: string; translated: string; pronunciation?: string }) => 
      addPhrase(original, translated, pronunciation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phrases"] });
    },
  });
};

export const useReviewPhrase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quality }: { id: number; quality: 1 | 2 | 3 | 4 | 5 }) => 
      updatePhraseReview(id, quality),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phrases"] });
    },
  });
};

export const useDeletePhrase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePhrase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phrases"] });
    },
  });
};
