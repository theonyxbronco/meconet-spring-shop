"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { kits } from "@/data/kits";
import { SPRING_TYPE_LABEL, type SpringType } from "@/data/types";
import {
  emptyCriteria,
  interpret,
  nextQuestion,
  openingReply,
  answerReply,
  rankKits,
  criteriaSummary,
  resultReply,
  STARTER_PROMPTS,
  type Criteria,
  type Question,
  type ScoredKit,
} from "@/lib/search";
import { ConversationPanel, type ChatMessage } from "./ConversationPanel";
import { KitCard } from "./KitCard";
import { SelectPill } from "./SelectPill";
import { ArrowRightIcon, FilterIcon, SearchIcon } from "./icons";

type Phase = "idle" | "asking" | "results";

const THINKING_MS = 520;
const MAX_RESULTS = 3;

let messageId = 0;
const newMessage = (role: ChatMessage["role"], text: string): ChatMessage => ({
  id: `m${(messageId += 1)}`,
  role,
  text,
});

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Product type" },
  { value: "compression", label: "Compression springs" },
  { value: "extension", label: "Extension springs" },
  { value: "torsion", label: "Torsion springs" },
  { value: "die", label: "Die springs" },
  { value: "disc", label: "Disc springs" },
];

const SIZE_OPTIONS = [
  { value: "all", label: "Size range" },
  { value: "small", label: "Under 30 mm" },
  { value: "medium", label: "30 to 80 mm" },
  { value: "large", label: "Over 80 mm" },
];

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "name", label: "Name A–Z" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "pieces", label: "Most pieces" },
];

const isSpringType = (value: string | null): value is SpringType =>
  value !== null && value in SPRING_TYPE_LABEL;

export function HomeView() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const typeParam = searchParams.get("type");

  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [criteria, setCriteria] = useState<Criteria>(emptyCriteria);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState<Question | undefined>();
  const [thinking, setThinking] = useState(false);
  const [results, setResults] = useState<ScoredKit[]>([]);
  const [guideOpen, setGuideOpen] = useState(false);

  const [typeFilter, setTypeFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [sort, setSort] = useState("default");

  const resultsRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const handledQuery = useRef<string | null>(null);
  const handledType = useRef<string | null>(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const after = useCallback((fn: () => void) => {
    setThinking(true);
    const timer = setTimeout(() => {
      setThinking(false);
      fn();
    }, THINKING_MS);
    timers.current.push(timer);
  }, []);

  const finish = useCallback((finalCriteria: Criteria) => {
    const ranked = rankKits(finalCriteria);
    const top = ranked.slice(0, MAX_RESULTS);
    setResults(top);
    setQuestion(undefined);
    setPhase("results");

    setMessages((current) => [
      ...current,
      ...resultReply(top, finalCriteria).map((line) => newMessage("assistant", line)),
    ]);

    const timer = setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 420);
    timers.current.push(timer);
  }, []);

  const advance = useCallback(
    (updated: Criteria, said: string[] = []) => {
      setCriteria(updated);
      after(() => {
        const upcoming = nextQuestion(updated);
        setMessages((current) => [...current, ...said.map((line) => newMessage("assistant", line))]);
        if (upcoming) {
          setQuestion(upcoming);
          setPhase("asking");
        } else {
          finish(updated);
        }
      });
    },
    [after, finish],
  );

  const start = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      const understood = interpret(trimmed, emptyCriteria());
      setMessages([newMessage("user", trimmed)]);
      setInput("");
      setResults([]);
      setPhase("asking");
      setGuideOpen(understood.needsMeasuringHelp);
      advance(understood, openingReply(understood));
    },
    [advance],
  );

  // A search from the header bar arrives as ?q= and opens the conversation here.
  useEffect(() => {
    if (!queryParam || handledQuery.current === queryParam) return;
    handledQuery.current = queryParam;
    start(queryParam);
  }, [queryParam, start]);

  // A catalogue tab arrives as ?type= — the categories are not standalone pages,
  // they filter the assortments that happen to contain that kind of spring.
  useEffect(() => {
    // Back to "All assortments" clears the category the row last applied.
    if (!typeParam) {
      if (handledType.current !== null) {
        handledType.current = null;
        setTypeFilter("all");
      }
      return;
    }
    if (handledType.current === typeParam) return;
    handledType.current = typeParam;
    if (!isSpringType(typeParam)) return;
    setTypeFilter(typeParam);
    const timer = setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    timers.current.push(timer);
  }, [typeParam]);

  const handleAnswer = (
    questionId: Question["id"],
    value: string,
    label: string,
    opensGuide?: boolean,
  ) => {
    const updated = { ...criteria, [questionId]: value } as Criteria;
    setMessages((current) => [...current, newMessage("user", label)]);
    setQuestion(undefined);
    if (opensGuide) setGuideOpen(true);
    const acknowledgement = answerReply(questionId, value);
    advance(updated, acknowledgement ? [acknowledgement] : []);
  };

  const handleSkip = () => {
    setMessages((current) => [...current, newMessage("user", "Show me what you have so far")]);
    setQuestion(undefined);
    after(() => finish(criteria));
  };

  const handleReset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    handledQuery.current = null;
    setPhase("idle");
    setCriteria(emptyCriteria());
    setMessages([]);
    setQuestion(undefined);
    setResults([]);
    setThinking(false);
    setGuideOpen(false);
  };

  const baseList = useMemo(
    () =>
      phase === "results" && results.length > 0
        ? results
        : kits.map((kit) => ({ kit, score: 0, reasons: [] as string[], highlight: undefined })),
    [phase, results],
  );

  const visible = useMemo(() => {
    let list = baseList.filter(({ kit }) => {
      const typeOk =
        typeFilter === "all" || kit.components.some((component) => component.type === (typeFilter as SpringType));
      const sizeOk = sizeFilter === "all" || kit.components.some((component) => component.sizeBand === sizeFilter);
      return typeOk && sizeOk;
    });

    const pieces = (entry: (typeof baseList)[number]) =>
      entry.kit.components.reduce((total, component) => total + component.quantity, 0);

    if (sort === "name") list = [...list].sort((a, b) => a.kit.name.localeCompare(b.kit.name));
    if (sort === "price-asc") list = [...list].sort((a, b) => a.kit.priceEUR - b.kit.priceEUR);
    if (sort === "pieces") list = [...list].sort((a, b) => pieces(b) - pieces(a));

    return list;
  }, [baseList, typeFilter, sizeFilter, sort]);

  const showingResults = phase === "results" && results.length > 0;
  const categoryLabel = isSpringType(typeFilter) ? SPRING_TYPE_LABEL[typeFilter] : undefined;
  const describePrompts = STARTER_PROMPTS.filter((prompt) => prompt.kind === "describe");
  const specPrompts = STARTER_PROMPTS.filter((prompt) => prompt.kind === "spec");

  return (
    <>
      <section className="hero-wash">
        <div className="relative mx-auto max-w-[1320px] px-5 pb-16 pt-14">
          <div className="relative z-10 max-w-[760px]">
            <p className="text-[14px] font-bold uppercase tracking-[0.18em] text-brand-500">
              Spring Shop · for home, workshop and small business
            </p>
            <h1 className="mt-3 text-[clamp(2.4rem,5.2vw,3.6rem)] font-extrabold leading-[1.08] tracking-tight text-ink">
              Let&rsquo;s find what you
              <br />
              are looking for.
            </h1>
            <p className="mt-4 max-w-[560px] text-[16.5px] leading-relaxed text-ink-soft">
              Tell us what the spring has to do, or give us the exact dimensions if you have
              them. Either way you end up at the assortment that contains it.
            </p>

            <form
              className="mt-8 flex items-center gap-3 rounded-full bg-surface p-2 pl-6 shadow-[0_10px_40px_rgba(11,46,94,0.12)]"
              onSubmit={(event) => {
                event.preventDefault();
                start(input);
              }}
            >
              <SearchIcon width={22} height={22} className="shrink-0 text-ink/60" />
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Describe the spring, or paste its dimensions"
                aria-label="Describe the spring you need, or enter its dimensions"
                className="w-full bg-transparent py-3 text-[16px] outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                aria-label="Start the spring finder"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600"
              >
                <ArrowRightIcon width={22} height={22} />
              </button>
            </form>

            {/* Two ways in, shown side by side: the novice path is not the lesser one. */}
            {phase === "idle" && (
              <div className="mt-6 space-y-4">
                <StarterGroup
                  label="Not sure what you need?"
                  prompts={describePrompts}
                  onPick={start}
                />
                <StarterGroup
                  label="Know the spec already?"
                  prompts={specPrompts}
                  onPick={start}
                />
              </div>
            )}

            {phase !== "idle" && (
              <ConversationPanel
                messages={messages}
                question={question}
                thinking={thinking}
                matchCount={showingResults ? results.length : rankKits(criteria).slice(0, MAX_RESULTS).length}
                guideOpen={guideOpen}
                onToggleGuide={() => setGuideOpen((open) => !open)}
                onAnswer={handleAnswer}
                onSkip={handleSkip}
                onReset={handleReset}
                finished={showingResults}
              />
            )}
          </div>

          {/* Decorative coil, generated rather than photographed */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 hidden h-full w-[42%] items-center justify-center lg:flex"
          >
            <div className="absolute right-8 top-6 h-[78%] w-[76%] rotate-[8deg] rounded-[28px] bg-gradient-to-br from-white/70 to-brand-100/40" />
            <HeroCoil />
          </div>
        </div>
      </section>

      <section ref={resultsRef} id="results" className="mx-auto max-w-[1320px] scroll-mt-32 px-5 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-[720px]">
            <h2 className="text-[34px] font-extrabold tracking-tight text-ink">
              {showingResults
                ? "Matching assortments"
                : categoryLabel
                  ? `Assortments with ${categoryLabel.toLowerCase()}s`
                  : "Every spring assortment"}
            </h2>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">
              {showingResults
                ? `Matched on: ${criteriaSummary(criteria) || "what you described"}.`
                : "We sell springs as assortments: a box covering a spread of sizes, so you do not have to get the measurement exactly right."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-muted">Sort by</span>
            <SelectPill label="Default" value={sort} options={SORT_OPTIONS} onChange={setSort} compact />
          </div>
        </div>

        {categoryLabel && !showingResults && (
          <p className="mt-5 rounded-card border border-brand-100 bg-brand-50/70 px-4 py-3 text-[14px] leading-relaxed text-ink">
            <span className="font-semibold">{categoryLabel}s are not sold individually here.</span>{" "}
            They come inside these assortments — open one to see every size it contains.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 pr-1 text-[15px] font-semibold text-ink">
            <FilterIcon width={20} height={20} />
            Filter
          </span>
          <SelectPill label="Product type" value={typeFilter} options={TYPE_OPTIONS} onChange={setTypeFilter} />
          <SelectPill label="Size range" value={sizeFilter} options={SIZE_OPTIONS} onChange={setSizeFilter} />
          {(typeFilter !== "all" || sizeFilter !== "all") && (
            <button
              onClick={() => {
                setTypeFilter("all");
                setSizeFilter("all");
              }}
              className="text-[13.5px] font-medium text-brand-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <p className="mt-6 text-[14px] text-muted">
          Result: <span className="font-bold text-brand-600">{visible.length}</span>
        </p>

        <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visible.map(({ kit, reasons, highlight }) => (
            <KitCard key={kit.slug} kit={kit} reasons={showingResults ? reasons : undefined} highlight={highlight} />
          ))}
        </div>

        {visible.length === 0 && (
          <p className="mt-8 rounded-card border border-line bg-surface p-8 text-center text-[15px] text-muted">
            No assortments match those filters. Try clearing them.
          </p>
        )}

        {showingResults && (
          <button
            onClick={handleReset}
            className="mt-8 text-[14px] font-semibold text-brand-600 hover:underline"
          >
            Show the full range again
          </button>
        )}
      </section>
    </>
  );
}

function StarterGroup({
  label,
  prompts,
  onPick,
}: {
  label: string;
  prompts: { text: string; kind: string }[];
  onPick: (text: string) => void;
}) {
  return (
    <div>
      <p className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-ink-soft/80">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt.text}
            onClick={() => onPick(prompt.text)}
            className="rounded-full border border-brand-100 bg-surface/70 px-4 py-2 text-left text-[13.5px] text-ink-soft transition hover:border-brand-400 hover:text-brand-600"
          >
            {prompt.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Generated stand-in for the hero photograph: a helix drawn in projection. */
function HeroCoil() {
  const turns = 5;
  const radius = 78;
  // Axis of the coil, running up and to the right like the mockup.
  const from = { x: 76, y: 236 };
  const to = { x: 404, y: 112 };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const axis = { x: dx / length, y: dy / length };
  const perp = { x: -axis.y, y: axis.x };
  const pitch = length / turns;
  // A circular section seen at an angle projects to a foreshortened ellipse.
  const depth = 0.32;

  const samples = turns * 72;
  const points: string[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = (i / samples) * turns * Math.PI * 2;
    const along = (t / (Math.PI * 2)) * pitch + radius * depth * Math.sin(t);
    const across = radius * Math.cos(t);
    const x = from.x + axis.x * along + perp.x * across;
    const y = from.y + axis.y * along + perp.y * across;
    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return (
    <svg viewBox="0 0 470 330" className="relative h-[92%] w-[92%]" aria-hidden>
      <defs>
        <linearGradient
          id="hero-steel"
          gradientUnits="userSpaceOnUse"
          x1={from.x - perp.x * radius}
          y1={from.y - perp.y * radius}
          x2={from.x + perp.x * radius}
          y2={from.y + perp.y * radius}
        >
          <stop offset="0%" stopColor="#223044" />
          <stop offset="22%" stopColor="#8fa6bd" />
          <stop offset="42%" stopColor="#f2f7fc" />
          <stop offset="62%" stopColor="#6e8299" />
          <stop offset="84%" stopColor="#2b3a4d" />
          <stop offset="100%" stopColor="#141d28" />
        </linearGradient>
        <filter id="hero-shadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="2" dy="10" stdDeviation="9" floodColor="#0b2e5e" floodOpacity="0.24" />
        </filter>
      </defs>
      <path
        d={points.join(" ")}
        fill="none"
        stroke="url(#hero-steel)"
        strokeWidth="27"
        strokeLinecap="round"
        filter="url(#hero-shadow)"
      />
    </svg>
  );
}
