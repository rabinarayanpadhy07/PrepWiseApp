import RootLayout from "@/layouts/root-layout";
import RouteErrorPage from "@/pages/route-error-page";

// Each page is code-split and loaded on first navigation.
const page = (load) => async () => ({ Component: (await load()).default });

const publicRoutes = [
  { index: true, lazy: page(() => import("@/pages/public/landing-page")) },
  { path: "features", lazy: page(() => import("@/pages/public/features-page")) },
  { path: "how-it-works", lazy: page(() => import("@/pages/public/how-it-works-page")) },
  { path: "pricing", lazy: page(() => import("@/pages/public/pricing-page")) },
  { path: "login", lazy: page(() => import("@/pages/public/login-page")) },
  { path: "register", lazy: page(() => import("@/pages/public/register-page")) },
  { path: "*", lazy: page(() => import("@/pages/public/not-found-page")) },
];

// Signed-in area. The layout redirects anonymous visitors to /login.
const appRoutes = [
  { index: true, lazy: page(() => import("@/pages/app/dashboard-page")) },
  { path: "resumes", lazy: page(() => import("@/pages/app/resumes-page")) },
  { path: "analyses", lazy: page(() => import("@/pages/app/analyses-page")) },
  { path: "analyses/new", lazy: page(() => import("@/pages/app/new-analysis-page")) },
  { path: "analyses/:analysisId", lazy: page(() => import("@/pages/app/analysis-page")) },
  { path: "interviews", lazy: page(() => import("@/pages/app/interviews-page")) },
  { path: "interviews/new", lazy: page(() => import("@/pages/app/new-interview-page")) },
  { path: "interviews/:sessionId", lazy: page(() => import("@/pages/app/interview-page")) },
  { path: "progress", lazy: page(() => import("@/pages/app/progress-page")) },
  { path: "billing", lazy: page(() => import("@/pages/app/billing-page")) },
  { path: "settings", lazy: page(() => import("@/pages/app/settings-page")) },
  {
    // Administrator area. The layout guards the UI; the API enforces access on every request.
    path: "admin",
    lazy: page(() => import("@/pages/app/admin/admin-layout")),
    children: [
      { index: true, lazy: page(() => import("@/pages/app/admin/overview-page")) },
      { path: "users", lazy: page(() => import("@/pages/app/admin/users-page")) },
      { path: "users/:userId", lazy: page(() => import("@/pages/app/admin/user-detail-page")) },
      { path: "subscriptions", lazy: page(() => import("@/pages/app/admin/subscriptions-page")) },
      { path: "plans", lazy: page(() => import("@/pages/app/admin/plans-page")) },
      { path: "ai", lazy: page(() => import("@/pages/app/admin/ai-page")) },
      { path: "usage", lazy: page(() => import("@/pages/app/admin/usage-page")) },
      { path: "payments", lazy: page(() => import("@/pages/app/admin/payments-page")) },
      { path: "health", lazy: page(() => import("@/pages/app/admin/health-page")) },
      { path: "audit", lazy: page(() => import("@/pages/app/admin/audit-page")) },
    ],
  },
  { path: "*", lazy: page(() => import("@/pages/app/app-not-found-page")) },
];

// Component gallery for development only; excluded from production builds.
const devRoutes = import.meta.env.DEV
  ? [
      {
        path: "dev/design-system/*",
        lazy: page(() => import("@/pages/dev/design-system-page")),
      },
    ]
  : [];

export const routes = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      ...devRoutes,
      {
        path: "app",
        lazy: page(() => import("@/layouts/app-layout")),
        children: appRoutes,
      },
      {
        lazy: page(() => import("@/layouts/public-layout")),
        children: publicRoutes,
      },
    ],
  },
];
