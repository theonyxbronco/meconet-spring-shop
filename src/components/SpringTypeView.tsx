"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SpringPhoto } from "@/assets/brand";
import { variantName, type SpringListing } from "@/data/kits";
import { SPRING_TYPE_LABEL, type SpringType } from "@/data/types";
import { SelectPill } from "./SelectPill";

/** What the second dimension means for each type — free length is not universal. */
const LENGTH_LABEL: Record<SpringType, string> = {
  compression: "Free length",
  extension: "Length",
  torsion: "Leg length",
  die: "Free length",
  disc: "Height",
};

const ENDS_LABEL: Record<SpringType, string> = {
  compression: "Ends",
  extension: "Ends",
  torsion: "Legs",
  die: "Load class",
  disc: "Series",
};

const SORTS = [
  { value: "default", label: "Sort" },
  { value: "outer", label: "Outside Ø" },
  { value: "length", label: "Length" },
  { value: "wire", label: "Wire Ø" },
];

/** Accepts "5.5" and "5,5" alike, as people type either. */
const parse = (text: string) => {
  const value = Number.parseFloat(text.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

/*
 * How far off still counts as the same size. A tenth of the diameter and a
 * twentieth of the length — never tighter than 0.5 mm and 1 mm — is enough to absorb
 * a caliper reading, and tight enough that the near-miss sizes in a kit (Ø7 against
 * Ø8, 44 against 48 mm) fall outside it.
 */
const diameterTolerance = (target: number) => Math.max(0.5, target * 0.1);
const lengthTolerance = (target: number) => Math.max(1, target * 0.05);

/**
 * Every spring of one type across the range — what the spring-type tabs open.
 *
 * People who know what kind of spring they hold reach for these tabs first, so the
 * tab lists springs rather than kits: almost every kit has a compression spring in
 * it, and a list of kits would not narrow anything. Type in the two numbers off the
 * part and the list closes in on it; each spring opens its kit with it selected.
 */
export function SpringTypeView({ type, listings }: { type: SpringType; listings: SpringListing[] }) {
  const [outerText, setOuterText] = useState("");
  const [lengthText, setLengthText] = useState("");
  const [ends, setEnds] = useState("all");
  const [sort, setSort] = useState("default");

  const outer = parse(outerText);
  const length = parse(lengthText);
  const measuring = outer !== undefined || length !== undefined;

  const endOptions = useMemo(
    () => [...new Set(listings.map((listing) => listing.component.endType))].sort(),
    [listings],
  );

  const { matches, closest } = useMemo(() => {
    const pool = listings.filter((listing) => ends === "all" || listing.component.endType === ends);

    // How many tolerances away a spring is, summed over the numbers given.
    const distance = ({ component }: SpringListing) =>
      (outer === undefined ? 0 : Math.abs(component.outerDiameter - outer) / diameterTolerance(outer)) +
      (length === undefined ? 0 : Math.abs(component.freeLength - length) / lengthTolerance(length));

    const within = ({ component }: SpringListing) =>
      (outer === undefined || Math.abs(component.outerDiameter - outer) <= diameterTolerance(outer)) &&
      (length === undefined || Math.abs(component.freeLength - length) <= lengthTolerance(length));

    const by = (key: string) => (a: SpringListing, b: SpringListing) => {
      const x = a.component;
      const y = b.component;
      if (key === "length") return x.freeLength - y.freeLength || x.outerDiameter - y.outerDiameter;
      if (key === "wire") return x.wireDiameter - y.wireDiameter || x.outerDiameter - y.outerDiameter;
      return x.outerDiameter - y.outerDiameter || x.freeLength - y.freeLength;
    };

    if (!measuring) return { matches: [...pool].sort(by(sort)), closest: [] };

    const ranked = [...pool].sort((a, b) => distance(a) - distance(b));
    const found = ranked.filter(within);
    return {
      matches: sort === "default" ? found : found.sort(by(sort)),
      closest: found.length === 0 ? ranked.slice(0, 3) : [],
    };
  }, [listings, ends, outer, length, measuring, sort]);

  const label = SPRING_TYPE_LABEL[type];
  const plural = `${label}s`;
  const kitCount = new Set(listings.map((listing) => listing.kit.slug)).size;

  return (
    <>
      <nav aria-label="Breadcrumb" className="border-b border-line bg-brand-50/50">
        <ol className="mx-auto flex max-w-[1320px] gap-2 px-5 py-3 text-[13.5px] text-muted">
          <li>
            <Link href="/" className="hover:text-brand-600">
              Frontpage
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-semibold text-brand-600" aria-current="page">
            {plural}
          </li>
        </ol>
      </nav>

      <section className="mx-auto max-w-[1320px] px-5 pb-16 pt-9">
        <h1 className="text-[clamp(2.2rem,4.4vw,3.1rem)] font-extrabold leading-tight tracking-tight text-ink">
          {plural}
        </h1>
        <p className="mt-3 max-w-[680px] text-[15.5px] leading-relaxed text-ink-soft">
          All {listings.length} {plural.toLowerCase()} we stock, across {kitCount}{" "}
          {kitCount === 1 ? "assortment" : "assortments"}. Every spring is sold inside an assortment —
          enter the size of yours to find it, then open the kit it comes in.
        </p>

        <div className="mt-7 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-brand-50 p-4">
          <SizeInput label="Outside Ø" value={outerText} onChange={setOuterText} placeholder="e.g. 5.5" />
          <span aria-hidden className="pb-3 text-[18px] text-muted">
            ×
          </span>
          <SizeInput label={LENGTH_LABEL[type]} value={lengthText} onChange={setLengthText} placeholder="e.g. 40" />
          {endOptions.length > 1 && (
            <SelectPill
              label={ENDS_LABEL[type]}
              value={ends}
              onChange={setEnds}
              options={[{ value: "all", label: ENDS_LABEL[type] }, ...endOptions.map((end) => ({ value: end, label: end }))]}
            />
          )}
          <SelectPill label="Sort" value={sort} onChange={setSort} options={SORTS} compact />
          {(measuring || ends !== "all") && (
            <button
              onClick={() => {
                setOuterText("");
                setLengthText("");
                setEnds("all");
              }}
              className="pb-2.5 text-[14px] font-semibold text-brand-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <p className="mt-5 text-[14px] text-muted" aria-live="polite">
          {measuring
            ? matches.length === 0
              ? `No ${plural.toLowerCase()} within a caliper reading of that size. The closest we have:`
              : `${matches.length} of ${listings.length} match that size${sort === "default" ? ", closest first" : ""}.`
            : `${matches.length} ${matches.length === 1 ? "size" : "sizes"}${ends === "all" ? "" : ` with ${ends.toLowerCase()}`}.`}
        </p>

        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(matches.length > 0 ? matches : closest).map((listing) => (
            <li key={listing.component.id}>
              <SpringCard listing={listing} type={type} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function SizeInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-semibold text-ink-soft">{label}</span>
      <span className="mt-1 flex items-center rounded-full border border-line-strong bg-surface pr-4 focus-within:border-brand-500">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-[104px] rounded-full bg-transparent py-2.5 pl-4 text-[15px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
        />
        <span className="text-[13px] text-muted">mm</span>
      </span>
    </label>
  );
}

function SpringCard({ listing, type }: { listing: SpringListing; type: SpringType }) {
  const { component, kit, tier } = listing;
  return (
    <Link
      href={`/assortments/${kit.slug}?spring=${component.id}`}
      className="group flex h-full items-center gap-3.5 rounded-xl border-2 border-transparent bg-surface p-3.5 shadow-card transition hover:border-brand-200"
    >
      <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-lg bg-brand-50/70 p-1.5">
        <SpringPhoto spring={component} className="h-full w-full" sizes="72px" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-ink group-hover:text-brand-600">{component.code}</p>
        <p className="mt-0.5 text-[13.5px] font-medium text-ink-soft">
          Ø{component.outerDiameter} × {component.freeLength} mm
        </p>
        <p className="truncate text-[12.5px] text-muted">
          {type === "disc" ? "t" : "wire"} {component.wireDiameter} · {component.endType}
        </p>
        <p className="mt-1.5 truncate text-[12.5px] font-semibold text-brand-600">
          In the {variantName(kit, tier)} →
        </p>
      </div>
    </Link>
  );
}
