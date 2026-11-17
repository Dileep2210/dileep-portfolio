import { useCallback } from "react";
import { useSearchParams } from "react-router";

/**
 * Filter state kept in the URL (shareable, back-button friendly).
 *
 * `update` starts from the *live* URL, not the params captured at render time: a debounced search
 * callback otherwise rebuilds the query from a stale snapshot and silently restores a filter the
 * visitor had just cleared.
 */
export function useUrlFilters() {
  const [params, setParams] = useSearchParams();
  const update = useCallback(
    (next: Record<string, string>) => {
      const p = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(next)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      setParams(p, { replace: true });
    },
    [setParams],
  );
  return { params, update };
}
