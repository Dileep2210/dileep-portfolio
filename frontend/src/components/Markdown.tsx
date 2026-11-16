import ReactMarkdown from "react-markdown";
import { Link } from "react-router";

/**
 * Renders CMS markdown safely: raw HTML is ignored (react-markdown never parses it without
 * rehype-raw) and unsafe URL schemes are stripped by the default urlTransform.
 */
export default function Markdown({ children, className = "" }: { children: string; className?: string }) {
  if (!children?.trim()) return null;
  return (
    <div className={`prose-cms ${className}`}>
      <ReactMarkdown
        skipHtml
        components={{
          a: ({ href = "", children: kids }) =>
            href.startsWith("/") && !href.startsWith("//") ? (
              <Link to={href}>{kids}</Link>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                {kids}
              </a>
            ),
          img: ({ src = "", alt = "" }) => <img src={typeof src === "string" ? src : ""} alt={alt} loading="lazy" decoding="async" />,
          h1: ({ children: kids }) => <h2>{kids}</h2>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
