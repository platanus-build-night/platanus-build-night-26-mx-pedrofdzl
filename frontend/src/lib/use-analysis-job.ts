import { useQuery } from "@tanstack/react-query";

import { getAnalysisJob } from "@/lib/resources";

export function useAnalysisJob(jobId: number) {
  return useQuery({
    queryKey: ["analysis-job", jobId],
    queryFn: () => getAnalysisJob(jobId),
    refetchInterval: (query) =>
      ["done", "failed"].includes(query.state.data?.status ?? "") ? false : 1200,
  });
}
