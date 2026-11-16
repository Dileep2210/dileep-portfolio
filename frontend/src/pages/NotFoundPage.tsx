import { Link } from "react-router";
import Seo from "../components/Seo";

export default function NotFoundPage({ what = "page" }: { what?: string }) {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-6 pb-28 pt-40 text-center">
      <Seo title="Page not found" path="/404" noindex />
      <p className="font-mono text-sm text-cyan">404</p>
      <h1 className="mt-3 font-display text-4xl font-bold text-white">This {what} could not be found</h1>
      <p className="mt-3 text-mist">It may have been moved, unpublished, or the link may be mistyped.</p>
      <div className="mt-8 flex gap-3">
        <Link to="/" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink">
          Go home
        </Link>
        <Link to="/projects" className="rounded-full glass px-5 py-2.5 text-sm font-semibold text-white">
          See projects
        </Link>
      </div>
    </section>
  );
}
