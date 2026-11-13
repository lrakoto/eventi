import { createContext, useContext, useMemo, useState } from 'react';

export type DateFilter = 'all' | 'today' | 'weekend' | 'week';
export type PriceFilter = 'any' | 'free' | 'paid';

export type EventFilters = {
  dateFilter: DateFilter;
  priceFilter: PriceFilter;
  activeCategory: string | null;
};

// Minimal shape the filters need — both NearbyEvent and EventSummary satisfy it.
type FilterableEvent = {
  starts_at: string;
  price_min: number | null;
  price_max: number | null;
  category: string | null;
};

export function topCategory(raw: string | null): string | null {
  if (!raw) return null;
  return raw.split('/')[0].trim();
}

function isFree(e: FilterableEvent): boolean {
  return e.price_min === 0 && (e.price_max === 0 || e.price_max === null);
}

function isPaid(e: FilterableEvent): boolean {
  return (e.price_min ?? 0) > 0 || (e.price_max ?? 0) > 0;
}

function dateMatcher(filter: DateFilter, timeZone?: string): (iso: string) => boolean {
  if (filter === 'all') return () => true;

  const now = Date.now();
  if (filter === 'week') {
    const weekOut = now + 7 * 24 * 60 * 60 * 1000;
    return (iso) => Date.parse(iso) >= now && Date.parse(iso) <= weekOut;
  }

  const calendar = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'numeric', day: 'numeric', timeZone,
  });
  // Represent each city's calendar date as UTC midnight for date arithmetic across DST.
  function calendarDay(timestamp: number): Date {
    const parts = calendar.formatToParts(timestamp);
    return new Date(Date.UTC(
      Number(parts.find((part) => part.type === 'year')?.value),
      Number(parts.find((part) => part.type === 'month')?.value) - 1,
      Number(parts.find((part) => part.type === 'day')?.value),
    ));
  }

  const start = calendarDay(now);
  const day = start.getUTCDay();
  if (filter === 'weekend' && day !== 0) start.setUTCDate(start.getUTCDate() + 6 - day);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + (filter === 'weekend' && day !== 0 ? 2 : 1));

  return (iso) => {
    const time = Date.parse(iso);
    if (!Number.isFinite(time) || time < now) return false;
    const date = calendarDay(time);
    return date >= start && date < end;
  };
}

/** Pure helper — apply the active filters to any list of events. */
export function applyFilters<T extends FilterableEvent>(events: T[], f: EventFilters, timeZone?: string): T[] {
  const matchesDate = dateMatcher(f.dateFilter, timeZone);
  return events.filter((e) => {
    if (!matchesDate(e.starts_at)) return false;
    if (f.priceFilter === 'free' && !isFree(e)) return false;
    if (f.priceFilter === 'paid' && !isPaid(e)) return false;
    if (f.activeCategory && topCategory(e.category) !== f.activeCategory) return false;
    return true;
  });
}

/** Top N categories present in a set of events, by frequency. */
export function deriveCategories(events: FilterableEvent[], limit = 6): string[] {
  const counts: Record<string, number> = {};
  for (const e of events) {
    const cat = topCategory(e.category);
    if (cat && cat !== 'undefined') counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([cat]) => cat);
}

type FilterContextType = EventFilters & {
  setDateFilter: (f: DateFilter) => void;
  setPriceFilter: (f: PriceFilter) => void;
  setActiveCategory: (c: string | null) => void;
  isActive: boolean;
  reset: () => void;
};

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('any');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const value = useMemo<FilterContextType>(
    () => ({
      dateFilter,
      priceFilter,
      activeCategory,
      setDateFilter,
      setPriceFilter,
      setActiveCategory,
      isActive: dateFilter !== 'all' || priceFilter !== 'any' || activeCategory !== null,
      reset: () => {
        setDateFilter('all');
        setPriceFilter('any');
        setActiveCategory(null);
      },
    }),
    [dateFilter, priceFilter, activeCategory],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within a FilterProvider');
  return ctx;
}
