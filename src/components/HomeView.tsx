"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
  resultLink,
  STARTER_PROMPTS,
  type Criteria,
  type Question,
  type ScoredKit,
} from "@/lib/search";
import { respond, suggestions, type ChatLink } from "@/lib/dialogue";
import { ConversationPanel, type ChatMessage } from "./ConversationPanel";
import { HeroBackdrop } from "./HeroBackdrop";
import { KitCard } from "./KitCard";
import { SelectPill } from "./SelectPill";
import { ArrowRightIcon, FilterIcon, SearchIcon } from "./icons";

type Phase = "idle" | "asking" | "results";

const THINKING_MS = 520;
const MAX_RESULTS = 3;

let messageId = 0;
const newMessage = (role: ChatMessage["role"], text: string, link?: ChatLink): ChatMessage => ({
  id: `m${(messageId += 1)}`,
  role,
  text,
  link,
});

/** Lines from the assistant, with the link (if any) hung off the last one. */
const assistantLines = (lines: string[], link?: ChatLink) =>
  lines.map((line, index) => newMessage("assistant", line, index === lines.length - 1 ? link : undefined));

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
  const [misses, setMisses] = useState(0);

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

    // No scroll here on purpose: the page stays where the reader is, and the
    // "See the results" button in the conversation is how they go down.
    setMessages((current) => [...current, ...assistantLines(resultReply(top, finalCriteria), resultLink(top))]);
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
      setMisses(0);
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

  // Anything typed into the conversation after the first message.
  const handleTyped = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const turn = respond(trimmed, { criteria, question, results, misses });
    if (turn.next === "reset") {
      handleReset();
      return;
    }
    setMessages((current) => [...current, newMessage("user", trimmed)]);
    setMisses(turn.missed ? misses + 1 : 0);
    if (turn.openGuide) setGuideOpen(true);

    if (turn.next === "advance") {
      setQuestion(undefined);
      advance(turn.criteria, turn.said);
      return;
    }
    if (turn.next === "rerank") {
      setQuestion(undefined);
      setCriteria(turn.criteria);
      after(() => {
        setMessages((current) => [...current, ...assistantLines(turn.said)]);
        finish(turn.criteria);
      });
      return;
    }
    // "stay": the open question, if any, stays on screen underneath the reply.
    setCriteria(turn.criteria);
    const open = question;
    setQuestion(undefined);
    after(() => {
      setMessages((current) => [...current, ...assistantLines(turn.said, turn.link)]);
      setQuestion(open);
    });
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
    setMisses(0);
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
  // The conversation owns the hero from the first message until "Start over".
  const chatOpen = phase !== "idle";
  const categoryLabel = isSpringType(typeFilter) ? SPRING_TYPE_LABEL[typeFilter] : undefined;
  const describePrompts = STARTER_PROMPTS.filter((prompt) => prompt.kind === "describe");

  return (
    <>
      <section className="hero-wash relative">
        <HeroBackdrop />
        {/* A single-cell grid holding both states. On the wide layout it gets a floor,
            so handing the hero over to the conversation does not snap the whole
            section a couple of hundred pixels shorter as the title leaves. */}
        <div className="relative mx-auto grid max-w-[1320px] items-center px-5 pb-16 pt-14 lg:min-h-[520px]">
          {/* The opening pitch and the conversation are stacked in one grid cell, so
              the one on its way out never pushes the one arriving: asking the first
              question hands the whole hero over to the thread, and the title, the
              search bar and the suggestions fade out from underneath it. Whatever is
              leaving stops taking clicks the moment it starts to go. */}
          <AnimatePresence initial={false}>
            {chatOpen ? (
              <motion.div
                key="conversation"
                initial={{ opacity: 0, y: 22, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 22, scale: 0.97, pointerEvents: "none" }}
                // Arrives just behind the title on its way out, so the two cross
                // rather than both sitting at half opacity in the same place.
                transition={{ duration: 0.42, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
                className="col-start-1 row-start-1 flex items-center justify-center"
              >
                <div className="w-full max-w-[860px]">
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
                    onSend={handleTyped}
                    suggestions={thinking ? [] : suggestions({ criteria, question, results, misses })}
                    finished={showingResults}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16, scale: 0.98, pointerEvents: "none" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="col-start-1 row-start-1 flex flex-col items-center text-center"
              >
                {/* The search is the page. Sessions showed people skipping it when it sat
                    to one side of a picture of the kits, taking it for a secondary
                    keyword box, so it now stands alone in the middle with as little
                    around it as possible — every extra line is one more reason to skim. */}
                <h1 className="text-[clamp(2.4rem,5.2vw,3.6rem)] font-extrabold leading-[1.08] tracking-tight text-ink">
                  Let&rsquo;s find what you are looking for.
                </h1>

                <form
                  className="mt-9 flex w-full max-w-[780px] items-center gap-3 rounded-full bg-surface p-2.5 pl-7 shadow-[0_14px_50px_rgba(11,46,94,0.16)] ring-2 ring-brand-500/25 transition focus-within:ring-brand-500"
                  onSubmit={(event) => {
                    event.preventDefault();
                    start(input);
                  }}
                >
                  <SearchIcon width={24} height={24} className="shrink-0 text-brand-500" />
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="e.g. a spring that pulls a gate shut, or 12 × 38 mm"
                    aria-label="Describe the spring you need, or enter its dimensions"
                    className="w-full min-w-0 bg-transparent py-3.5 text-[17px] text-ink outline-none placeholder:text-muted"
                  />
                  <button
                    type="submit"
                    className="flex h-14 shrink-0 items-center gap-2 rounded-full bg-brand-500 px-4 text-[16px] font-bold text-white transition hover:bg-brand-600 sm:px-7"
                  >
                    <span className="hidden sm:inline">Find my spring</span>
                    <span className="sr-only sm:hidden">Find my spring</span>
                    <ArrowRightIcon width={21} height={21} />
                  </button>
                </form>


                {/* Openers in a customer's own words — the way in for someone who has no spec. */}
                <div className="mt-6">
                  <StarterGroup prompts={describePrompts} onPick={start} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section ref={resultsRef} id="results" className="mx-auto max-w-[1320px] px-5 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-[720px]">
            <h2 className="text-[34px] font-extrabold tracking-tight text-ink">
              {showingResults
                ? "Matching assortments"
                : categoryLabel
                  ? `Assortments with ${categoryLabel.toLowerCase()}s`
                  : "All Kits"}
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
  prompts,
  onPick,
}: {
  prompts: { text: string; kind: string }[];
  onPick: (text: string) => void;
}) {
  return (
    <div role="group" aria-label="Search suggestions" className="flex flex-wrap justify-center gap-2">
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
  );
}
