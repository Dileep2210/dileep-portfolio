import { Suspense, lazy, type ReactNode } from "react";
import { createBrowserRouter, isRouteErrorResponse, useRouteError, type RouteObject } from "react-router";
import PublicLayout from "./pages/PublicLayout";

// Route-level code splitting: visitors never download the admin bundle.
const HomePage = lazy(() => import("./pages/HomePage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPages").then((m) => ({ default: m.ServicesPage })));
const ServiceDetailPage = lazy(() => import("./pages/ServicesPages").then((m) => ({ default: m.ServiceDetailPage })));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const BlogPage = lazy(() => import("./pages/BlogPages").then((m) => ({ default: m.BlogPage })));
const BlogPostPage = lazy(() => import("./pages/BlogPages").then((m) => ({ default: m.BlogPostPage })));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const AdminApp = lazy(() => import("./admin/AdminApp"));

function Loading() {
  return <div role="status" aria-label="Loading" className="min-h-[60vh]" />;
}

const s = (node: ReactNode) => <Suspense fallback={<Loading />}>{node}</Suspense>;

function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-bold text-white">{notFound ? "Page not found" : "Something went wrong"}</h1>
      <p className="mt-3 text-mist">{notFound ? "The page you are looking for does not exist." : "Please reload the page. If it keeps happening, try again later."}</p>
      <a href="/" className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink">
        Go home
      </a>
    </main>
  );
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: s(<HomePage />) },
      { path: "about", element: s(<AboutPage />) },
      { path: "services", element: s(<ServicesPage />) },
      { path: "services/:slug", element: s(<ServiceDetailPage />) },
      { path: "projects", element: s(<ProjectsPage />) },
      { path: "projects/:slug", element: s(<ProjectDetailPage />) },
      { path: "blog", element: s(<BlogPage />) },
      { path: "blog/:slug", element: s(<BlogPostPage />) },
      { path: "contact", element: s(<ContactPage />) },
      { path: "*", element: s(<NotFoundPage />) },
    ],
  },
  { path: "/admin/*", element: s(<AdminApp />), errorElement: <RouteError /> },
];

export const router = createBrowserRouter(routes);
