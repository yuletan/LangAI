import { useQuery } from "@tanstack/react-query";
import { getActivityByDate, getStatsByType, getUserProfile } from "@/db/actions";

export const useDailyStats = () => {
  return useQuery({
    queryKey: ["stats", "daily"],
    queryFn: getActivityByDate,
  });
};

export const useStatsByType = () => {
  return useQuery({
    queryKey: ["stats", "type"],
    queryFn: getStatsByType,
  });
};

export const useProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: getUserProfile,
  });
};
