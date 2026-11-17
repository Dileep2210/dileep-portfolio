import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Check, Clock, Link2, Search } from "lucide-react";
import { FaLinkedin, FaXTwitter } from "react-icons/fa6";
import { Link, useParams } from "react-router";
import CoverImage from "../components/CoverImage";
import Markdown from "../components/Markdown";
import PageHeader from "../components/PageHeader";
import Seo from "../components/Seo";
import { CardGridSkeleton, EmptyState, ErrorState, Skeleton } from "../components/States";
import { ApiError } from "../lib/api";
import { formatDate } from "../lib/format";
import { useUrlFilters } from "../lib/useUrlFilters";
import { useBlog, useBlogCategories, useBlogPost, useSite } from "../lib/queries";
import type { BlogPost } from "../lib/types";
import NotFoundPage from "./NotFoundPage";

const PAGE_SIZE = 9;

function PostCard({ post }: { post: BlogPost }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface/60 transition-all hover:-translate-y-1 hover:border-cyan/40">
      <CoverImage src={post.cover_url} title={post.title} className="aspect-[16/9] w-full object-cover" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-mist">
          {post.category && <span className="font-mono uppercase tracking-wider text-cyan">{post.category.name}</span>}
          <span>{formatDate(post.published_at)}</span>
          <span>{post.reading_minutes} min read</span>
        </div>
        <h2 className="mt-2 font-display text-lg font-semibold text-white">
          <Link to={`/blog/${post.slug}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h2>
        <p className="mt-2 line-clamp-3 text-sm text-mist">{post.excerpt}</p>
      </div>
    </article>
  );
}

export function BlogPage() {
  const { params, update } = useUrlFilters();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const tag = params.get("tag") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [search, setSearch] = useState(q);
  useEffect(() => {
    const id = setTimeout(() => search !== q && update({ q: search, page: "" }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { data, isLoading, error, refetch } = useBlog({ q, category, tag, page, page_size: PAGE_SIZE });
  const categories = useBlogCategories().data ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <Seo pageKey="blog" title="Blog" path="/blog" />
      <PageHeader eyebrow="Blog" title="Notes on full-stack & AI engineering" description="React, Python, FastAPI, PostgreSQL, RAG, LLMs and application security — written from real projects." />
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search articles</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles…"
              className="w-full rounded-xl border border-border bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan/60"
            />
          </label>
        </div>
        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {[{ slug: "", name: "All" }, ...categories].map((c) => (
              <button
                key={c.slug || "all"}
                type="button"
                aria-pressed={category === c.slug}
                onClick={() => update({ category: c.slug, page: "" })}
                className={`rounded-full px-4 py-1.5 text-sm ${category === c.slug ? "bg-white text-ink" : "border border-border text-mist hover:text-white"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
        {tag && (
          <p className="mt-4 text-sm text-mist">
            Tagged “{tag}” ·{" "}
            <button type="button" className="text-cyan" onClick={() => update({ tag: "" })}>
              clear
            </button>
          </p>
        )}
        <div className="mt-8">
          {isLoading ? (
            <CardGridSkeleton />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : !data?.items.length ? (
            <EmptyState title={q || category || tag ? "No articles match" : "No articles yet"} text={q || category || tag ? "Try another search." : "New articles are on the way."} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} className="rounded-full border border-border px-4 py-2 text-sm text-white disabled:opacity-40">
              Previous
            </button>
            <span className="px-3 text-sm text-mist">
              Page {page} of {pages}
            </span>
            <button type="button" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })} className="rounded-full border border-border px-4 py-2 text-sm text-white disabled:opacity-40">
              Next
            </button>
          </nav>
        )}
      </section>
    </>
  );
}

function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  return (
    <div className="flex items-center gap-2" aria-label="Share this article">
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" className="flex h-9 w-9 items-center justify-center rounded-full glass text-mist hover:text-white">
        <FaLinkedin size={15} aria-hidden />
      </a>
      <a href={`https://x.com/intent/post?url=${enc(url)}&text=${enc(title)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on X" className="flex h-9 w-9 items-center justify-center rounded-full glass text-mist hover:text-white">
        <FaXTwitter size={14} aria-hidden />
      </a>
      <button
        type="button"
        aria-label="Copy link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            /* clipboard unavailable */
          }
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full glass text-mist hover:text-white"
      >
        {copied ? <Check size={15} aria-hidden /> : <Link2 size={15} aria-hidden />}
      </button>
    </div>
  );
}

export function BlogPostPage() {
  const { slug = "" } = useParams();
  const { data, isLoading, error, refetch } = useBlogPost(slug);
  const site = useSite().data;
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-36" role="status" aria-label="Loading">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage what="article" />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-36">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }
  const { post, related } = data;
  const base = (site?.settings.site_url || window.location.origin).replace(/\/$/, "");
  const url = `${base}/blog/${post.slug}`;
  return (
    <article className="mx-auto max-w-3xl px-6 pb-28 pt-32">
      <Seo
        title={post.seo_title || post.title}
        description={post.seo_description || post.excerpt}
        path={`/blog/${post.slug}`}
        canonical={post.canonical_url || undefined}
        image={post.cover_url}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.published_at,
          dateModified: post.updated_at,
          url,
          image: post.cover_url ? new URL(post.cover_url, base).toString() : undefined,
          author: { "@type": "Person", name: site?.settings.developer_name },
          keywords: post.tags.join(", "),
        }}
      />
      <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-mist hover:text-white">
        <ArrowLeft size={14} aria-hidden /> All articles
      </Link>
      <header className="mt-6">
        {post.category && (
          <Link to={`/blog?category=${post.category.slug}`} className="font-mono text-xs uppercase tracking-wider text-cyan">
            {post.category.name}
          </Link>
        )}
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">{post.title}</h1>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-mist">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} aria-hidden />
              <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} aria-hidden /> {post.reading_minutes} min read
            </span>
          </div>
          <ShareButtons url={url} title={post.title} />
        </div>
      </header>
      {post.cover_url && (
        <div className="mt-8 overflow-hidden rounded-3xl border border-border">
          <CoverImage src={post.cover_url} title={post.title} eager className="aspect-[16/8] w-full object-cover" />
        </div>
      )}
      <Markdown className="mt-10">{post.content}</Markdown>
      {post.tags.length > 0 && (
        <ul className="mt-10 flex flex-wrap gap-2" aria-label="Tags">
          {post.tags.map((t) => (
            <li key={t}>
              <Link to={`/blog?tag=${encodeURIComponent(t.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`} className="rounded-full border border-border px-3 py-1 text-xs text-mist hover:text-white">
                #{t}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold text-white">Related articles</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {related.map((r) => (
              <PostCard key={r.id} post={r} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
