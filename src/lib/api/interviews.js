import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { aiOptionsPayload } from "@/lib/api/ai";
import { AI_REQUEST_TIMEOUT_MS, apiClient } from "@/lib/api/client";

export const interviewKeys = {
  sessions: ["interviews"],
  session: (id) => ["interviews", id],
  evaluations: ["evaluations"],
  evaluationSummary: ["evaluations", "summary"],
};

export function useInterviews({ status } = {}) {
  return useQuery({
    queryKey: [...interviewKeys.sessions, { status }],
    queryFn: async () =>
      (await apiClient.get("/interviews/", { params: { page_size: 100, status } })).data.results,
  });
}

export function useInterview(id) {
  return useQuery({
    queryKey: interviewKeys.session(id),
    queryFn: async () => (await apiClient.get(`/interviews/${id}/`)).data,
    enabled: Boolean(id),
  });
}

export function useStartInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roleTitle,
      jobProfileId,
      resumeId,
      mode,
      questionCount,
      aiOptions,
      idempotencyKey,
    }) =>
      (
        await apiClient.post(
          "/interviews/",
          {
            role_title: roleTitle || "",
            job_profile_id: jobProfileId || null,
            resume_id: resumeId || null,
            mode,
            question_count: questionCount,
            idempotency_key: idempotencyKey ?? null,
            ...aiOptionsPayload(aiOptions),
          },
          { timeout: AI_REQUEST_TIMEOUT_MS },
        )
      ).data,
    onSuccess: (session) => {
      queryClient.setQueryData(interviewKeys.session(session.id), session);
      queryClient.invalidateQueries({ queryKey: interviewKeys.sessions, exact: false });
      queryClient.invalidateQueries({ queryKey: ["ai", "access"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export async function submitAnswer(sessionId, position, payload) {
  const { data } = await apiClient.post(
    `/interviews/${sessionId}/questions/${position}/answer/`,
    {
      text: payload.text,
      input_mode: payload.inputMode,
      voice_seconds: payload.voiceSeconds ?? null,
      idempotency_key: payload.idempotencyKey,
    },
  );
  return data;
}

export async function requestEvaluation(sessionId, position) {
  const { data } = await apiClient.post(
    `/interviews/${sessionId}/questions/${position}/evaluate/`,
    null,
    { timeout: AI_REQUEST_TIMEOUT_MS },
  );
  return data;
}

function useSessionMutation(sessionId, mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: interviewKeys.sessions, exact: false });
    },
  });
}

export function useSubmitAnswer(sessionId) {
  return useSessionMutation(sessionId, ({ position, ...payload }) =>
    submitAnswer(sessionId, position, payload),
  );
}

export function useEvaluateAnswer(sessionId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (position) => requestEvaluation(sessionId, position),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: interviewKeys.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: interviewKeys.evaluations });
      queryClient.invalidateQueries({ queryKey: ["ai", "access"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCompleteInterview(sessionId) {
  return useSessionMutation(
    sessionId,
    async () => (await apiClient.post(`/interviews/${sessionId}/complete/`)).data,
  );
}

export function useEvaluations({ sessionId } = {}) {
  return useQuery({
    queryKey: [...interviewKeys.evaluations, "list", { sessionId }],
    queryFn: async () =>
      (
        await apiClient.get("/evaluations/", {
          params: { page_size: 50, session: sessionId },
        })
      ).data,
  });
}

export function useEvaluationSummary() {
  return useQuery({
    queryKey: interviewKeys.evaluationSummary,
    queryFn: async () => (await apiClient.get("/evaluations/summary/")).data,
  });
}
