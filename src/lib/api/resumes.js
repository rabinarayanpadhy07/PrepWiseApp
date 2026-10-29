import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { aiOptionsPayload } from "@/lib/api/ai";
import { AI_REQUEST_TIMEOUT_MS, apiClient } from "@/lib/api/client";

export const resumeKeys = {
  resumes: ["resumes"],
  resume: (id) => ["resumes", id],
  jobProfiles: ["job-profiles"],
  analyses: ["resume-analyses"],
  analysis: (id) => ["resume-analyses", id],
};

// Lists are small per user; fetch up to the API's maximum page size.
const LIST_PARAMS = { page_size: 100 };

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const RESUME_EXTENSIONS = [".pdf", ".docx"];

export function useResumes() {
  return useQuery({
    queryKey: resumeKeys.resumes,
    queryFn: async () => (await apiClient.get("/resumes/", { params: LIST_PARAMS })).data.results,
  });
}

export function useResume(id, { enabled = true } = {}) {
  return useQuery({
    queryKey: resumeKeys.resume(id),
    queryFn: async () => (await apiClient.get(`/resumes/${id}/`)).data,
    enabled: enabled && Boolean(id),
  });
}

export async function uploadResume(file, { onProgress, signal } = {}) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post("/resumes/", form, {
    signal,
    timeout: 60_000,
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return data;
}

export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }) => uploadResume(file, { onProgress }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resumeKeys.resumes }),
  });
}

export function useDeleteResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiClient.delete(`/resumes/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.resumes });
      queryClient.invalidateQueries({ queryKey: resumeKeys.analyses });
    },
  });
}

export function useJobProfiles() {
  return useQuery({
    queryKey: resumeKeys.jobProfiles,
    queryFn: async () =>
      (await apiClient.get("/job-profiles/", { params: LIST_PARAMS })).data.results,
  });
}

function toJobProfilePayload({ title, company, description }) {
  return { title, company: company ?? "", description };
}

export function useSaveJobProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const payload = toJobProfilePayload(values);
      const request = id
        ? apiClient.patch(`/job-profiles/${id}/`, payload)
        : apiClient.post("/job-profiles/", payload);
      return (await request).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: resumeKeys.jobProfiles }),
  });
}

export function useDeleteJobProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiClient.delete(`/job-profiles/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.jobProfiles });
      queryClient.invalidateQueries({ queryKey: resumeKeys.analyses });
    },
  });
}

export function useAnalyses() {
  return useQuery({
    queryKey: resumeKeys.analyses,
    queryFn: async () =>
      (await apiClient.get("/resume-analyses/", { params: LIST_PARAMS })).data.results,
  });
}

export function useAnalysis(id) {
  return useQuery({
    queryKey: resumeKeys.analysis(id),
    queryFn: async () => (await apiClient.get(`/resume-analyses/${id}/`)).data,
    enabled: Boolean(id),
  });
}

function useAnalysisMutation(request) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (analysis) => {
      queryClient.setQueryData(resumeKeys.analysis(analysis.id), analysis);
    },
    // Failed runs are recorded too, so history and the record change either way.
    onSettled: () => queryClient.invalidateQueries({ queryKey: resumeKeys.analyses }),
  });
}

export function useCreateAnalysis() {
  return useAnalysisMutation(
    // idempotencyKey: one per user action, so a retried request isn't billed twice.
    async ({ resumeId, jobProfileId, aiOptions, idempotencyKey }) =>
      (
        await apiClient.post(
          "/resume-analyses/",
          {
            resume_id: resumeId,
            job_profile_id: jobProfileId,
            idempotency_key: idempotencyKey ?? null,
            ...aiOptionsPayload(aiOptions),
          },
          { timeout: AI_REQUEST_TIMEOUT_MS },
        )
      ).data,
  );
}

export function useRetryAnalysis(id) {
  return useAnalysisMutation(
    async (aiOptions) =>
      (
        await apiClient.post(`/resume-analyses/${id}/retry/`, aiOptionsPayload(aiOptions), {
          timeout: AI_REQUEST_TIMEOUT_MS,
        })
      ).data,
  );
}
