import {
  CreditCard,
  FileDown,
  FileSearch,
  History,
  KeyRound,
  MessageSquareText,
  Mic,
  Sparkles,
} from "lucide-react";

/**
 * Product capabilities shown on public pages. Keep copy factual: no customer
 * counts, testimonials, performance claims, or integrations we do not have.
 */
export const capabilities = [
  {
    id: "analysis",
    group: "prepare",
    icon: FileSearch,
    title: "Resume and job description analysis",
    summary:
      "Compare your resume with a specific job description to see where they match and where they don't.",
    details: [
      "Upload your resume and paste the job description you are targeting.",
      "See which of the role's requirements your resume already covers and which it doesn't address.",
      "Use the analysis to choose what to prepare and to shape your interview questions.",
    ],
  },
  {
    id: "text-interviews",
    group: "practise",
    icon: MessageSquareText,
    title: "Text mock interviews",
    summary: "Answer interview questions in writing, at your own pace, based on the role you chose.",
    details: [
      "Questions are generated from your resume and the job description.",
      "Write and revise your answers before you submit them.",
      "Useful for structuring your thinking before you practise out loud.",
    ],
  },
  {
    id: "voice-interviews",
    group: "practise",
    icon: Mic,
    title: "Voice mock interviews",
    summary: "Answer questions aloud with your microphone to rehearse how you respond in a live interview.",
    details: [
      "Practise speaking your answers instead of only writing them.",
      "Your browser asks for microphone permission before a voice session starts.",
      "Voice sessions use the same question set and feedback as text sessions.",
    ],
  },
  {
    id: "feedback",
    group: "improve",
    icon: Sparkles,
    title: "AI-generated answer feedback",
    summary: "Get feedback on each answer with specific suggestions for what to strengthen.",
    details: [
      "Feedback is produced by an AI model for every answer you submit.",
      "Suggestions point to what was missing or unclear and how to improve it.",
      "AI feedback can be wrong. Treat it as guidance and use your own judgment.",
    ],
  },
  {
    id: "history",
    group: "improve",
    icon: History,
    title: "Interview history and progress tracking",
    summary: "Return to past sessions and see how your results change over time.",
    details: [
      "Every session is saved to your account with its questions, answers, and feedback.",
      "Review earlier answers before a real interview.",
      "Charts show how your session results change across practice sessions.",
    ],
  },
  {
    id: "reports",
    group: "improve",
    icon: FileDown,
    title: "Downloadable reports",
    summary: "Download a report of a session to review offline or share with a mentor.",
    details: [
      "Reports include the session's questions, your answers, and the feedback you received.",
      "Keep a copy outside PrepWise for your own records.",
    ],
  },
  {
    id: "byok",
    group: "ai-access",
    icon: KeyRound,
    title: "Bring Your Own API Key (BYOK)",
    summary: "Connect your own AI provider API key and run PrepWise's AI features through your provider account.",
    details: [
      "Add an API key from a supported AI provider in your account settings.",
      "Requests made with your key are billed to you by that provider.",
      "You can remove your key at any time.",
    ],
  },
  {
    id: "platform-ai",
    group: "ai-access",
    icon: CreditCard,
    title: "Subscription-based platform AI",
    summary: "Subscribe to use PrepWise's platform AI without managing an API key yourself.",
    details: [
      "Pay upfront for a fixed access period.",
      "Renewal is manual: you are never charged again unless you choose to renew.",
      "Current plan details are shown on the pricing page.",
    ],
  },
];

export const capabilityGroups = [
  { id: "prepare", title: "Prepare", description: "Understand what the role asks for before you practise." },
  { id: "practise", title: "Practise", description: "Rehearse with questions based on your resume and the role." },
  { id: "improve", title: "Improve", description: "Learn from feedback and keep a record of your progress." },
  {
    id: "ai-access",
    title: "Choose how you use AI",
    description: "Use your own provider key or subscribe to PrepWise's platform AI.",
  },
];

export const steps = [
  {
    title: "Create your account",
    description: "Sign up with your email address. Your sessions and reports are kept in your account.",
  },
  {
    title: "Add your resume and a job description",
    description:
      "Upload your resume and paste the description of the role you are applying for. PrepWise analyses both together.",
  },
  {
    title: "Choose how to use AI",
    description:
      "Connect your own AI provider API key (BYOK) or subscribe to use PrepWise's platform AI.",
  },
  {
    title: "Practise a mock interview",
    description: "Answer questions in a text session or out loud in a voice session.",
  },
  {
    title: "Review feedback and track progress",
    description:
      "Read feedback on every answer, revisit past sessions, and download a report when you need one.",
  },
];
