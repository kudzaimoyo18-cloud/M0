"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Price } from "@/components/site/price";

interface SearchHit {
  productId: string;
  slug: string;
  name: string;
  priceUsdMinor: number;
  imageUrl: string | null;
}

const DEBOUNCE_MS = 250;
const MIN_TERM_LENGTH = 2;

/**
 * Header-anchored search overlay. Opens below the header with an input and
 * a live results list. Closes on Escape, click-outside, or after the user
 * navigates to a result.
 */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus input when the overlay opens.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setTerm("");
      setHits([]);
      setError(null);
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Debounced fetch. Aborts in-flight requests when the term changes.
  useEffect(() => {
    if (!open) return;
    if (term.trim().length < MIN_TERM_LENGTH) {
      setHits([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term.trim())}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as { ok: boolean; hits?: SearchHit[]; error?: string };
        if (!json.ok || !Array.isArray(json.hits)) {
          setError(json.error ?? "Search failed");
          setHits([]);
        } else {
          setHits(json.hits);
        }
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setError("Search failed");
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, term]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Search"
      className="fixed inset-0 z-50 bg-paper/95 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} className="max-w-3xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
        <div className="flex items-center gap-3 border-b border-ink-900 pb-2">
          <Search className="h-5 w-5 text-ink-500" strokeWidth={1.25} />
          <input
            ref={inputRef}
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search the collection"
            autoComplete="off"
            className="flex-1 bg-transparent outline-none text-[18px] tracking-tight placeholder:text-ink-500"
            aria-label="Search products"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-1 hover:opacity-70"
          >
            <X className="h-5 w-5" strokeWidth={1.25} />
          </button>
        </div>

        <div className="mt-6 min-h-[60svh]">
          {term.trim().length < MIN_TERM_LENGTH ? (
            <p className="caption text-ink-500">
              Type at least {MIN_TERM_LENGTH} characters.
            </p>
          ) : loading ? (
            <p className="caption text-ink-500">Searching…</p>
          ) : error ? (
            <p role="alert" className="caption text-danger">{error}</p>
          ) : hits.length === 0 ? (
            <p className="caption text-ink-500">No matches.</p>
          ) : (
            <ul
              role="list"
              aria-label="Search results"
              className="grid grid-cols-2 md:grid-cols-3 gap-px bg-ink-300"
            >
              {hits.map((h) => (
                <li key={h.productId} className="bg-paper">
                  <Link
                    href={`/product/${h.slug}`}
                    onClick={onClose}
                    className="block group"
                  >
                    <div className="relative aspect-product bg-ink-100">
                      {h.imageUrl && (
                        <Image
                          src={h.imageUrl}
                          alt={h.name}
                          fill
                          sizes="(min-width: 768px) 33vw, 50vw"
                          className="object-cover transition-opacity duration-base ease-std"
                        />
                      )}
                    </div>
                    <div className="px-2 py-3 flex items-baseline justify-between gap-2">
                      <span className="text-[13px] leading-tight truncate">{h.name}</span>
                      <Price usdMinor={h.priceUsdMinor} className="text-[13px]" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
