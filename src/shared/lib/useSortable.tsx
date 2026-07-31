import { useState, useMemo, useCallback, ReactNode } from "react";

export type SortDir = "asc" | "desc" | null;

export interface SortState {
  key: string;
  dir: SortDir;
}

export function useSortable<T>(data: T[], defaultKey = "", defaultDir: SortDir = "desc") {
  const [sort, setSort] = useState<SortState>({ key: defaultKey, dir: defaultDir });

  const toggle = useCallback(
    (key: string) => {
      setSort((prev) => {
        if (prev.key === key) {
          if (prev.dir === "desc") return { key, dir: "asc" };
          if (prev.dir === "asc") return { key: "", dir: null };
          return { key, dir: "desc" };
        }
        return { key, dir: defaultDir };
      });
    },
    [defaultDir],
  );

  const sorted = useMemo(() => {
    if (!sort.key || !sort.dir) return data;
    return [...data].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sort.key] ?? "");
      const bv = String((b as Record<string, unknown>)[sort.key] ?? "");
      const cmp = av.localeCompare(bv, "ru", { numeric: true });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [data, sort]);

  function SortIcon({ k }: { k: string }): ReactNode {
    if (sort.key !== k) {
      return <span className="inline-block w-4 text-[0.6rem] muted opacity-30 ml-1">↕</span>;
    }
    return (
      <span className="inline-block w-4 text-[0.6rem] ml-1" style={{ color: "var(--primary)" }}>
        {sort.dir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  function SortTh({ k, children }: { k: string; children: ReactNode }): ReactNode {
    return (
      <th
        className="cursor-pointer select-none hover:opacity-80 transition-opacity"
        onClick={() => toggle(k)}
      >
        <span className="inline-flex items-center">
          {children}
          <SortIcon k={k} />
        </span>
      </th>
    );
  }

  return { sorted, sort, toggle, SortIcon, SortTh };
}
