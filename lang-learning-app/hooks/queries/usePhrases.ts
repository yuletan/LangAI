import { useQuery } from "@tanstack/react-query";
import { getAllPhrases, getPhrasesForReview } from "@/db/actions";

export const usePhrases = () => {
  return useQuery({
    queryKey: ["phrases"],
    queryFn: getAllPhrases,
  });
};

export const useDuePhrases = () => {
  return useQuery({
    queryKey: ["phrases", "due"],
    queryFn: getPhrasesForReview,
  });
};
