import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MasterShell({
  active,
  title,
  badge,
  search,
  action,
  children,
}: {
  active: string;
  title: string;
  badge?: string;
  search?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [shellSearch, setShellSearch] = useState("");

  return (
    <div className="dashboard-light min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)]">
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="space-y-6 p-3 sm:p-4 lg:p-6">
          {(title || search || action) && (
            <div className="flex flex-wrap items-center bg-white justify-between gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-sm">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Master console</p>
                <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                {search && <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input value={shellSearch} onChange={(event) => setShellSearch(event.target.value)} placeholder={search} className="h-10 w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" aria-label={search} /></div>}
                {action}
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export function StatGrid({
  items,
}: {
  items: { label: string; value: string; hint?: string; tone?: string }[];
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="glass-card rounded-2xl bg-white border border-border/70 bg-card/95 p-5">
          <p className="text-sm text-muted-foreground">{s.label}</p>
          <p className={"mt-2 text-3xl font-bold tracking-tight " + (s.tone ?? "text-foreground")}>
            {s.value}
          </p>
          {s.hint && <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>}
        </div>
      ))}
    </section>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"glass-card rounded-2xl border border-border/70 bg-card/95 bg-white p-6 " + (className ?? "")}>
      <div className="mb-5">
        <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

const stringifyCell = (cell: ReactNode): string => {
  if (cell == null || cell === false || typeof cell === "boolean") return "";
  if (typeof cell === "string" || typeof cell === "number") return String(cell);
  if (Array.isArray(cell)) return cell.map(stringifyCell).join(" ");
  if (typeof cell === "object" && "props" in cell && cell.props && "children" in cell.props) {
    return stringifyCell((cell as any).props.children);
  }
  return "";
};

export function SimpleTable({
  head,
  rows,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  exportCsv,
  exportLabel = "Export CSV",
  dateValue,
  onDateChange,
  onViewData,
  startDateValue,
  endDateValue,
  onStartDateChange,
  onEndDateChange,
  pageSize = 5,
  selectable = true,
}: {
  head: string[];
  rows: (string | ReactNode)[][];
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  exportCsv?: () => void;
  exportLabel?: string;
  dateValue?: string;
  onDateChange?: (value: string) => void;
  onViewData?: () => void;
  startDateValue?: string;
  endDateValue?: string;
  onStartDateChange?: (value: string) => void;
  onEndDateChange?: (value: string) => void;
  pageSize?: number;
  selectable?: boolean;
}) {
  const [internalSearch, setInternalSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const activeSearch = onSearchChange ? searchValue ?? "" : internalSearch;

  const filteredRows = useMemo(() => {
    const term = activeSearch.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => row.some((cell) => stringifyCell(cell).toLowerCase().includes(term)));
  }, [activeSearch, rows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pageCount));
  }, [pageCount]);

  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const visibleRowKeys = visibleRows.map((_, idx) => `row-${(page - 1) * pageSize + idx}`);
  const allVisibleSelected = selectable && visibleRowKeys.length > 0 && visibleRowKeys.every((key) => selectedRowKeys.includes(key));

  const handleSearchChange = (value: string) => {
    if (onSearchChange) onSearchChange(value);
    else setInternalSearch(value);
  };

  const toggleRowSelection = (rowIndex: number) => {
    if (!selectable) return;
    const rowKey = `row-${rowIndex}`;
    setSelectedRowKeys((current) => {
      if (current.includes(rowKey)) return current.filter((key) => key !== rowKey);
      return [...current, rowKey];
    });
  };

  const toggleSelectAllVisible = () => {
    if (!selectable) return;
    setSelectedRowKeys((current) => {
      if (allVisibleSelected) {
        return current.filter((key) => !visibleRowKeys.includes(key));
      }
      return Array.from(new Set([...current, ...visibleRowKeys]));
    });
  };

  return (
    <div className="space-y-4">
      {(searchPlaceholder || exportCsv || (dateValue !== undefined && onDateChange && onViewData) || (startDateValue !== undefined && onStartDateChange) || (endDateValue !== undefined && onEndDateChange)) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {searchPlaceholder && (
            <div className="relative max-w-sm flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={activeSearch}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm outline-none ring-0 placeholder:text-muted-foreground"
              />
            </div>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {startDateValue !== undefined && onStartDateChange && (
              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Start date</div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
                  <input
                    type="date"
                    value={startDateValue}
                    onChange={(event) => onStartDateChange(event.target.value)}
                    className="border-0 bg-transparent px-0 py-1 text-sm outline-none"
                    aria-label="Start date"
                  />
                </div>
              </div>
            )}
            {endDateValue !== undefined && onEndDateChange && (
              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">End date</div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
                  <input
                    type="date"
                    value={endDateValue}
                    onChange={(event) => onEndDateChange(event.target.value)}
                    className="border-0 bg-transparent px-0 py-1 text-sm outline-none"
                    aria-label="End date"
                  />
                </div>
              </div>
            )}
            {dateValue !== undefined && onDateChange && onViewData && (
              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Date</div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
                  <input
                    type="date"
                    value={dateValue}
                    onChange={(event) => onDateChange(event.target.value)}
                    className="border-0 bg-transparent px-0 py-1 text-sm outline-none"
                    aria-label="Date"
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={onViewData} className="mt-2">View data</Button>
              </div>
            )}
            {exportCsv && (
              <Button
                variant="default"
                size="sm"
                onClick={exportCsv}
                className="gap-1 mt-5 border border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:text-white"
              >
                <Download className="size-4" />
                {exportLabel}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
              {selectable && (
                <th className="w-12 px-3 py-3 font-medium">
                  <input
                    type="checkbox"
                    aria-label="Select all visible rows"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="h-4 w-4 rounded border-border"
                  />
                </th>
              )}
              {head.map((h) => (
                <th key={h} className="px-3 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={head.length + (selectable ? 1 : 0)} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No records found.
                </td>
              </tr>
            ) : (
              visibleRows.map((r, i) => {
                const rowIndex = (page - 1) * pageSize + i;
                const rowKey = `row-${rowIndex}`;
                const isSelected = selectedRowKeys.includes(rowKey);

                return (
                  <tr key={rowIndex} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                    {selectable && (
                      <td className="w-12 px-3 py-3.5 align-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          aria-label={`Select row ${rowIndex + 1}`}
                          onChange={() => toggleRowSelection(rowIndex)}
                          className="h-4 w-4 rounded border-border"
                        />
                      </td>
                    )}
                    {r.map((c, j) => (
                      <td key={j} className="px-3 py-3.5 align-top">
                        {c}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectable && selectedRowKeys.length > 0 && (
        <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">{selectedRowKeys.length}</span>
            rows selected
          </span>
          <button
            type="button"
            onClick={() => setSelectedRowKeys([])}
            className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            Clear selection
          </button>
        </div>
      )}

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>
            Showing {filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))} disabled={page === 1} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="rounded border px-2 py-1 text-xs font-medium">Page {page} / {pageCount}</span>
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage((currentPage) => Math.min(pageCount, currentPage + 1))} disabled={page === pageCount} aria-label="Next page">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
