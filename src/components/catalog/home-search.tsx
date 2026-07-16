"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Search, Store, Tags } from "lucide-react";

type SearchSuggestion = {
  id: string;
  kind: "store" | "product" | "category";
  label: string;
  subtitle: string;
  href: string;
};

const suggestionIcons = {
  store: Store,
  product: Package,
  category: Tags,
};

export function HomeSearch() {
  const router = useRouter();
  const shellRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/catalog/suggestions?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Suggestion request failed");
        const data = (await response.json()) as { suggestions: SearchSuggestion[] };
        setSuggestions(data.suggestions);
        setOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const closeSuggestions = (event: PointerEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeSuggestions);
    return () => document.removeEventListener("pointerdown", closeSuggestions);
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    router.push(term ? `/stores?q=${encodeURIComponent(term)}` : "/stores");
    setOpen(false);
  }

  function chooseSuggestion(suggestion: SearchSuggestion) {
    setQuery(suggestion.label);
    setOpen(false);
    router.push(suggestion.href);
  }

  const showPanel = open && query.trim().length >= 2;

  return (
    <div className="home-search-shell" ref={shellRef}>
      <form className="home-search" onSubmit={submitSearch} role="search">
        <Search aria-hidden="true" />
        <input
          aria-autocomplete="list"
          aria-controls="home-search-suggestions"
          autoComplete="off"
          maxLength={100}
          name="q"
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            if (value.trim().length < 2) {
              setSuggestions([]);
              setLoading(false);
              setOpen(false);
            } else {
              setOpen(true);
            }
          }}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Search stores, products or categories"
          value={query}
        />
        <button type="submit">Search</button>
      </form>

      {showPanel && (
        <div
          className="home-search-suggestions"
          id="home-search-suggestions"
          aria-label="Search suggestions"
        >
          {loading && <p className="home-search-message">Finding matches…</p>}
          {!loading && suggestions.length === 0 && (
            <p className="home-search-message">No matching items yet.</p>
          )}
          {!loading &&
            suggestions.map((suggestion) => {
              const Icon = suggestionIcons[suggestion.kind];
              return (
                <button
                  key={`${suggestion.kind}-${suggestion.id}`}
                  onClick={() => chooseSuggestion(suggestion)}
                  type="button"
                >
                  <span>
                    <Icon />
                  </span>
                  <span>
                    <b>{suggestion.label}</b>
                    <small>{suggestion.subtitle}</small>
                  </span>
                  <em>{suggestion.kind}</em>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
