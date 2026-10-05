"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Wordmark, KitBoxArt } from "@/assets/brand";
import type { SpringType } from "@/data/types";
import { formatEUR, useCart } from "@/lib/cart";
import { CartIcon, ChevronDownIcon, SearchIcon } from "./icons";

/**
 * The catalogue row. None of these are standalone pages: every spring in the shop is
 * supplied inside an assortment, so a category tab filters the assortments that
 * contain that kind of spring rather than opening a range of its own.
 */
const CATALOGUE: { label: string; type?: SpringType }[] = [
  { label: "Compression Springs", type: "compression" },
  { label: "Extension Springs", type: "extension" },
  { label: "Torsion Springs", type: "torsion" },
  { label: "Die Springs", type: "die" },
  { label: "Disc Springs", type: "disc" },
  { label: "Spring Band Clamps" },
  { label: "Other Springs" },
];

export function Header() {
  const router = useRouter();
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeen = useRef<number>(0);

  // Opening the field is a click on the icon, so the caret belongs in it straight away.
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  // Adding to the order flashes the badge and shows the preview unprompted,
  // so the confirmation is impossible to miss during the task.
  useEffect(() => {
    if (!cart.lastAdded || cart.lastAdded.at === lastSeen.current) return;
    lastSeen.current = cart.lastAdded.at;
    setBump(true);
    setPreviewOpen(true);
    const bumpTimer = setTimeout(() => setBump(false), 700);
    const closeTimer = setTimeout(() => setPreviewOpen(false), 4200);
    return () => {
      clearTimeout(bumpTimer);
      clearTimeout(closeTimer);
    };
  }, [cart.lastAdded]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  };

  const openPreview = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setPreviewOpen(true);
  };
  const closePreview = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setPreviewOpen(false), 220);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        {/* Brand, search and cart all live on one bar, so the search is the first thing
            in reach wherever you are in the shop. It also paints above the category row,
            which slides up behind it. */}
        <div className="relative z-10 bg-navy-900 text-white">
          <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-5">
            <Link href="/" className="flex shrink-0 items-center gap-4">
              <Wordmark className="text-[26px] leading-none" />
              <span className="hidden h-6 w-px bg-white/30 sm:block" aria-hidden />
              <span className="hidden text-[15px] font-medium text-white/95 sm:block">Spring Shop</span>
            </Link>

            {/* Collapsed to its icon so the bar stays uncluttered; the field opens in place
                on the first click and folds away again once it is empty and left alone. */}
            <form
              className={`min-w-0 transition-[flex] ${searchOpen ? "flex-1 lg:max-w-[440px]" : "flex-none"}`}
              onSubmit={(event) => {
                event.preventDefault();
                if (!query.trim()) return;
                router.push(`/?q=${encodeURIComponent(query.trim())}`);
                setQuery("");
                setSearchOpen(false);
              }}
            >
              {searchOpen ? (
                <label className="flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 transition focus-within:border-white/60 focus-within:bg-white/15">
                  <SearchIcon width={18} height={18} className="shrink-0 text-white/70" />
                  <input
                    ref={searchInput}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onBlur={() => {
                      if (!query.trim()) setSearchOpen(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setSearchOpen(false);
                    }}
                    placeholder="Search springs, or describe what you need"
                    aria-label="Search springs, or describe what you need"
                    className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/60"
                  />
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search springs, or describe what you need"
                  aria-expanded={false}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:border-white/60 hover:bg-white/20"
                >
                  <SearchIcon width={19} height={19} />
                </button>
              )}
            </form>

            <nav className="ml-auto hidden items-center gap-6 text-[13.5px] text-white/85 xl:flex">
              <button onClick={() => showToast("Registration is outside this prototype")} className="hover:text-white">
                Registration
              </button>
              <button onClick={() => showToast("The Finnish storefront is outside this prototype")} className="hover:text-white">
                Jousikauppa
              </button>
              <button onClick={() => showToast("About us is outside this prototype")} className="hover:text-white">
                About us
              </button>
              <button
                onClick={() => showToast("Only English is available in this prototype")}
                className="flex items-center gap-1.5 hover:text-white"
              >
                Eng <ChevronDownIcon width={15} height={15} />
              </button>
            </nav>

            {/* The archive is where people come back for paperwork, so it needs to be
                reachable from every page, not only from the order they just placed. */}
            <Link
              href="/orders"
              className="ml-auto shrink-0 text-[13.5px] text-white/90 hover:text-white xl:ml-0"
            >
              <span className="hidden sm:inline">My orders &amp; documents</span>
              <span className="sm:hidden">Orders</span>
            </Link>

            <div className="relative shrink-0" onMouseEnter={openPreview} onMouseLeave={closePreview}>
              <Link
                href="/cart"
                aria-label={`Cart, ${cart.count} item${cart.count === 1 ? "" : "s"}`}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:border-white/60 hover:bg-white/20"
              >
                <motion.span animate={bump ? { scale: [1, 1.25, 1] } : {}} transition={{ duration: 0.6 }}>
                  <CartIcon width={20} height={20} />
                </motion.span>
                <AnimatePresence>
                  {cart.count > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white"
                    >
                      {cart.count}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              <AnimatePresence>
                {previewOpen && <CartPreview onNavigate={() => setPreviewOpen(false)} />}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <Suspense fallback={<div className="h-[50px] border-b border-line bg-surface" />}>
          <CatalogueBar onInert={showToast} />
        </Suspense>
      </header>

      {/* Reserves the full header height for good, hidden row or not. */}
      <div className="h-[114px]" aria-hidden />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-8 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-navy-900 px-5 py-2.5 text-[13.5px] text-white shadow-pop"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * The category row gets out of the way as soon as you start reading, and comes back
 * when you return to the top of the page. The brand bar above it never moves, so the
 * search and the cart stay reachable throughout.
 */
function CatalogueBar({ onInert }: { onInert: (message: string) => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeType = searchParams.get("type");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const away = window.scrollY > 80;
      setHidden(away);
      // Only the brand bar is left once the catalogue row has slid up, so anything
      // scrolled to needs to clear that much and no more.
      document.documentElement.style.setProperty("--header-offset", away ? "80px" : "130px");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onHome = pathname === "/";

  return (
    <motion.div
      initial={false}
      animate={{ y: hidden ? -50 : 0, opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`relative z-0 border-b border-line bg-surface ${hidden ? "pointer-events-none" : ""}`}
      aria-hidden={hidden}
    >
      <nav className="no-scrollbar mx-auto flex h-[49px] max-w-[1320px] items-stretch gap-7 overflow-x-auto px-5 text-[14px]">
        <Link
          href="/"
          className={`flex shrink-0 items-center border-b-[3px] font-semibold transition ${
            onHome && !activeType
              ? "border-brand-500 text-brand-600"
              : "border-transparent text-ink hover:text-brand-600"
          }`}
        >
          All assortments
        </Link>
        {CATALOGUE.map((item) =>
          item.type ? (
            <Link
              key={item.label}
              href={`/?type=${item.type}#results`}
              title="Supplied inside an assortment"
              className={`flex shrink-0 items-center border-b-[3px] transition ${
                onHome && activeType === item.type
                  ? "border-brand-500 font-semibold text-brand-600"
                  : "border-transparent text-ink/80 hover:text-brand-600"
              }`}
            >
              {item.label}
            </Link>
          ) : (
            <button
              key={item.label}
              onClick={() => onInert(`${item.label} are outside the assortment range in this prototype`)}
              title="Available in the full shop"
              className="flex shrink-0 items-center border-b-[3px] border-transparent text-ink/80 transition hover:text-brand-600"
            >
              {item.label}
            </button>
          ),
        )}
      </nav>
    </motion.div>
  );
}

function CartPreview({ onNavigate }: { onNavigate: () => void }) {
  const cart = useCart();

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.16 }}
      className="absolute right-0 top-[calc(100%+10px)] w-[360px] rounded-card border border-line bg-surface p-4 shadow-pop"
      role="dialog"
      aria-label="Cart preview"
    >
      <div className="absolute -top-[7px] right-4 h-3 w-3 rotate-45 border-l border-t border-line bg-surface" />
      {cart.lines.length === 0 ? (
        <p className="py-6 text-center text-[14px] text-muted">Your cart is empty.</p>
      ) : (
        <>
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">
            In your cart ({cart.count})
          </p>
          <ul className="space-y-3">
            {cart.lines.map((line) => (
              <li key={line.slug} className="flex items-center gap-3">
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-brand-50 p-1">
                  <KitBoxArt kit={line.kit} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{line.kit.name}</p>
                  <p className="text-[12.5px] text-muted">
                    {line.quantity} × {formatEUR(line.kit.priceEUR)} · Part {line.kit.partNumber}
                  </p>
                </div>
                <span className="text-[14px] font-semibold text-ink">{formatEUR(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[14px]">
            <span className="text-muted">Subtotal</span>
            <span className="text-[16px] font-bold text-ink">{formatEUR(cart.subtotal)}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <Link
              href="/cart"
              onClick={onNavigate}
              className="flex-1 rounded-full border border-line-strong py-2.5 text-center text-[14px] font-semibold text-ink hover:border-brand-400 hover:text-brand-600"
            >
              View cart
            </Link>
            <Link
              href="/checkout"
              onClick={onNavigate}
              className="flex-1 rounded-full bg-brand-500 py-2.5 text-center text-[14px] font-semibold text-white hover:bg-brand-600"
            >
              Checkout
            </Link>
          </div>
        </>
      )}
    </motion.div>
  );
}
