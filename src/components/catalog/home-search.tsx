"use client";

import { FormEvent, KeyboardEvent, useEffect, useId, useRef, useState } from "react";
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

type HomeSearchProps = {
  defaultValue?: string;
  action?: string;
  placeholder?: string;
  formClassName?: string;
  /** Limit suggestions to a single partner when searching inside its catalog. */
  storeSlug?: string;
  /** Limit suggestions to this directory's store category. */
  storeTypeSlug?: string;
};

export function HomeSearch(props: HomeSearchProps) {
  const key = `${props.action ?? "/stores"}:${props.defaultValue ?? ""}:${props.storeSlug ?? ""}:${props.storeTypeSlug ?? ""}`;
  return <HomeSearchInput key={key} {...props} />;
}

function HomeSearchInput({
  defaultValue = "",
  action = "/stores",
  placeholder = "Search stores, products or categories",
  formClassName = "home-search",
  storeSlug,
  storeTypeSlug,
}: HomeSearchProps) {
  const router = useRouter();
  const shellRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(Boolean(defaultValue.trim()));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestionError, setSuggestionError] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 1) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/catalog/suggestions?q=${encodeURIComponent(term)}${storeSlug ? `&store=${encodeURIComponent(storeSlug)}` : ""}${storeTypeSlug ? `&storeType=${encodeURIComponent(storeTypeSlug)}` : ""}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Suggestion request failed");
        const data = (await response.json()) as { suggestions: SearchSuggestion[] };
        setSuggestions(data.suggestions);
        setSuggestionError(false);
        setActiveIndex(-1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSuggestions([]);
          setSuggestionError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 140);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, storeSlug, storeTypeSlug]);

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
    const separator = action.includes("?") ? "&" : "?";
    router.push(term ? `${action}${separator}q=${encodeURIComponent(term)}` : action);
    setOpen(false);
  }

  function chooseSuggestion(suggestion: SearchSuggestion) {
    setQuery(suggestion.label);
    setOpen(false);
    router.push(suggestion.href);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open || loading || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeIndex]);
    }
  }

  const showPanel = open && query.trim().length >= 1;

  return (
    <div
      className="home-search-shell"
      ref={shellRef}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <form className={formClassName} onSubmit={submitSearch} role="search">
        <Search aria-hidden="true" />
        <input
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-controls={showPanel ? listboxId : undefined}
          aria-expanded={showPanel}
          aria-activedescendant={showPanel && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          role="combobox"
          autoComplete="off"
          maxLength={100}
          name="q"
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            setActiveIndex(-1);
            setSuggestionError(false);
            if (value.trim().length < 1) {
              setSuggestions([]);
              setLoading(false);
              setOpen(false);
            } else {
              setLoading(true);
              setOpen(true);
            }
          }}
          onKeyDown={handleInputKeyDown}
          onFocus={() => query.trim().length >= 1 && setOpen(true)}
          placeholder={placeholder}
          value={query}
        />
        <button type="submit">Search</button>
      </form>

      {showPanel && (
        <div
          className="home-search-suggestions"
          id={listboxId}
          aria-label="Search suggestions"
          role="listbox"
        >
          {loading && <p className="home-search-message">Finding matches…</p>}
          {!loading && suggestions.length === 0 && (
            <p className="home-search-message">
              {suggestionError ? "Suggestions unavailable. Press Search to see results." : "No matching items yet."}
            </p>
          )}
          {!loading &&
            suggestions.map((suggestion, index) => {
              const Icon = suggestionIcons[suggestion.kind];
              return (
                <button
                  key={`${suggestion.kind}-${suggestion.id}`}
                  id={`${listboxId}-option-${index}`}
                  onClick={() => chooseSuggestion(suggestion)}
                  onFocus={() => setActiveIndex(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                  aria-selected={activeIndex === index}
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
