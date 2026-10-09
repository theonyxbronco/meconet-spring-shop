"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatLink } from "@/lib/dialogue";
import { MEASURING_STEPS, SPRING_SHAPES, type Question } from "@/lib/search";
import { ScreenRulerOverlay } from "./ScreenRuler";
import { ArrowRightIcon, CheckIcon, HelpIcon, RulerIcon, SparkIcon } from "./icons";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** A next step the assistant is pointing at, shown as a button under the message. */
  link?: ChatLink;
}

export function ConversationPanel({
  messages,
  question,
  thinking,
  matchCount,
  guideOpen,
  onToggleGuide,
  onAnswer,
  onSkip,
  onReset,
  onSend,
  suggestions,
  finished,
}: {
  messages: ChatMessage[];
  question?: Question;
  thinking: boolean;
  matchCount: number;
  guideOpen: boolean;
  onToggleGuide: () => void;
  onAnswer: (questionId: Question["id"], value: string, label: string, opensGuide?: boolean) => void;
  onSkip: () => void;
  onReset: () => void;
  /** Anything typed into the conversation after the opening message. */
  onSend: (text: string) => void;
  /** Tap-to-ask follow-ups, shown once there is a result to ask about. */
  suggestions: string[];
  finished: boolean;
}) {
  const [draft, setDraft] = useState("");
  // The 1:1 ruler from the kit pages, reachable here too: the finder keeps asking for
  // millimetres, so the thing that produces them belongs next to the question.
  const [rulerOpen, setRulerOpen] = useState(false);
  // Only the newest "open this" button is live; older ones would just repeat it.
  const linkedId = messages.findLast((message) => message.link)?.id;

  const latestRef = useRef<HTMLLIElement>(null);
  const scrolledFor = useRef<string | null>(null);
  const latest = messages[messages.length - 1];

  // With the measuring guide open, the reply box sits a long way under the thread,
  // so a message sent from down there lands off the top of the screen and reads as
  // if it vanished. Only the reader's own messages pull the view back to the thread
  // — `nearest` leaves it alone when the thread is already on screen, and the
  // assistant's answers still arrive without moving the page.
  useEffect(() => {
    if (!latest || latest.role !== "user") return;
    if (scrolledFor.current === latest.id) return;
    scrolledFor.current = latest.id;
    latestRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
    });
  }, [latest]);

  return (
    // No entry animation and no outer margin of its own: in the hero, opening this
    // panel *is* the takeover, so the animation and the spacing belong to the
    // wrapper that fades the title and the search bar out around it.
    <section
      aria-label="Guided spring finder"
      className="w-full rounded-2xl border border-line bg-surface/95 p-5 shadow-card backdrop-blur sm:p-6"
    >
      <header className="flex flex-wrap items-center gap-2.5 border-b border-line pb-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <SparkIcon width={18} height={18} />
        </span>
        <div>
          <p className="text-[15px] font-bold text-ink">Spring finder</p>
          <p className="text-[12.5px] text-muted">
            Describe the problem or give me a spec — both work
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleGuide}
            aria-expanded={guideOpen}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
              guideOpen
                ? "border-brand-500 bg-brand-50 text-brand-600"
                : "border-line text-muted hover:border-brand-400 hover:text-brand-600"
            }`}
          >
            <HelpIcon width={15} height={15} />
            How to measure
          </button>
          {/* While a question is open the ruler sits under its answers instead, where
              the need for a measurement actually arises. */}
          {!question && (
            <button
              onClick={() => setRulerOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-muted transition hover:border-brand-400 hover:text-brand-600"
            >
              <RulerIcon width={15} height={15} />
              Measure on screen
            </button>
          )}
          <button
            onClick={onReset}
            className="rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-muted transition hover:border-brand-400 hover:text-brand-600"
          >
            Start over
          </button>
        </div>
      </header>

      {/* Messages sit on one left edge — the assistant and the user read as one thread. */}
      <ol className="space-y-3 py-5">
        {messages.map((message) => (
          <motion.li
            key={message.id}
            ref={message.id === latest?.id ? latestRef : undefined}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            // scroll-mt clears the fixed header when a sent message pulls the view back.
            className="flex scroll-mt-24 justify-start"
          >
            <span
              className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed ${
                message.role === "user"
                  ? "rounded-bl-sm bg-brand-500 text-white"
                  : "rounded-bl-sm bg-brand-50 text-ink"
              }`}
            >
              {message.text}
              {message.link && message.id === linkedId && (
                <Link
                  href={message.link.href}
                  className="mt-2.5 flex w-fit items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-600"
                >
                  {message.link.label}
                  <ArrowRightIcon width={16} height={16} />
                </Link>
              )}
            </span>
          </motion.li>
        ))}

        <AnimatePresence>
          {thinking && (
            <motion.li
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <span className="flex gap-1.5 rounded-2xl rounded-bl-sm bg-brand-50 px-4 py-3.5">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full bg-brand-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: dot * 0.18 }}
                  />
                ))}
              </span>
            </motion.li>
          )}
        </AnimatePresence>
      </ol>

      {question && !thinking && (
        <div className="animate-rise border-t border-line pt-4">
          <p className="text-[14px] font-semibold text-ink">{question.prompt}</p>
          {question.note && <p className="mt-1 text-[13px] text-muted">{question.note}</p>}
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {question.options.map((option) => (
              <button
                key={option.value}
                onClick={() => onAnswer(question.id, option.value, option.label, option.opensGuide)}
                className="rounded-xl border border-line-strong bg-surface px-4 py-3 text-left transition hover:border-brand-500 hover:bg-brand-50"
              >
                <span className="block text-[14px] font-semibold text-ink">{option.label}</span>
                <span className="mt-0.5 block text-[12.5px] text-muted">{option.hint}</span>
              </button>
            ))}
          </div>
          {/* The ruler right under the answers: sessions showed people reading the
              size question, not knowing the number, and never spotting the ruler up in
              the header. Here it reads as one more way to answer. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              onClick={() => setRulerOpen(true)}
              className="flex items-center gap-2 rounded-full border border-brand-400 bg-brand-50 px-4 py-2 text-[13.5px] font-semibold text-brand-600 transition hover:border-brand-500 hover:bg-brand-100"
            >
              <RulerIcon width={16} height={16} />
              Measure on screen
            </button>
            <span className="text-[12.5px] text-muted">Lay your spring on a life-size ruler</span>
            {matchCount > 0 && (
              <button
                onClick={onSkip}
                className="text-[13.5px] font-medium text-brand-600 hover:underline sm:ml-auto"
              >
                Skip ahead and show me {matchCount} assortment{matchCount === 1 ? "" : "s"} now
              </button>
            )}
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-4">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSend(suggestion)}
              className="rounded-full border border-brand-100 bg-surface px-3.5 py-1.5 text-left text-[13px] text-ink-soft transition hover:border-brand-400 hover:text-brand-600"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {finished && !thinking && (
        <div className="animate-rise flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <span className="flex items-center gap-2 rounded-full bg-stock-bg px-3.5 py-1.5 text-[13.5px] font-semibold text-stock">
            <CheckIcon width={15} height={15} />
            {matchCount} assortment{matchCount === 1 ? "" : "s"} matched
          </span>
          {/* Pushed to the right and given a filled button: with the page no longer
              scrolling itself, this is the only way down to the kits. */}
          <a
            href="#results"
            onClick={(event) => {
              const results = document.getElementById("results");
              if (!results) return;
              // The jump is the browser's default for an anchor; this takes it over so
              // the reader can see the page travel down to the kits. Reduced-motion
              // keeps the instant jump.
              if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
              event.preventDefault();
              results.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="ml-auto flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            See the results below
            <ArrowRightIcon width={17} height={17} />
          </a>
        </div>
      )}

      {/* The guide sits under the follow-ups on purpose: it is reference material,
          and anything the conversation asks next has to stay next to the thread
          rather than being pushed below a wall of measuring instructions. */}
      <AnimatePresence initial={false}>
        {guideOpen && <MeasuringGuide onClose={onToggleGuide} />}
      </AnimatePresence>

      {/* Typing is always allowed: an answer, a measurement, a question, a correction. */}
      <form
        className="mt-4 flex items-center gap-2 rounded-full border border-line-strong bg-surface p-1.5 pl-4 focus-within:border-brand-500"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim() || thinking) return;
          onSend(draft);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            question
              ? "Or type your answer — a measurement or a question works too"
              : "Ask a question, or tell me more about the spring"
          }
          aria-label="Reply to the spring finder"
          className="w-full bg-transparent py-2 text-[14.5px] outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim() || thinking}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-40"
        >
          <ArrowRightIcon width={18} height={18} />
        </button>
      </form>

      <AnimatePresence>
        {rulerOpen && <ScreenRulerOverlay onClose={() => setRulerOpen(false)} />}
      </AnimatePresence>
    </section>
  );
}

/**
 * The teaching panel. Meconet's previous finder assumed people could already name
 * and measure a spring; this is the part that was missing, so it is reachable at any
 * point in the conversation rather than buried in a help page.
 */
function MeasuringGuide({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden"
    >
      <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50/60 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-brand-600">
            <RulerIcon width={16} height={16} />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-bold text-ink">Which spring is it, and how do you measure it?</p>
            <p className="mt-1 text-[13px] text-muted">
              You do not need any of this to use the finder — but it is here if you want it.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[13px] font-medium text-brand-600 hover:underline"
          >
            Hide
          </button>
        </div>

        <p className="mt-5 text-[12.5px] font-bold uppercase tracking-[0.12em] text-brand-600">
          Step 1 — tell the three kinds apart
        </p>
        <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
          {SPRING_SHAPES.map((shape) => (
            <li key={shape.kind} className="rounded-lg bg-surface p-3.5">
              <p className="text-[13.5px] font-bold text-ink">{shape.kind}</p>
              <p className="text-[12.5px] font-medium text-brand-600">{shape.does}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{shape.tell}</p>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-[12.5px] font-bold uppercase tracking-[0.12em] text-brand-600">
          Step 2 — the three measurements, if you want them
        </p>
        <ol className="mt-2.5 space-y-2.5">
          {MEASURING_STEPS.map((step, index) => (
            <li key={step.term} className="flex gap-3 rounded-lg bg-surface p-3.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12.5px] font-bold text-brand-600">
                {index + 1}
              </span>
              <div>
                <p className="text-[13.5px] font-bold text-ink">
                  {step.term} <span className="font-normal text-muted">— {step.what}</span>
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{step.how}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-soft">
          Still unsure? Pick the nearest band and carry on. Every result is an assortment that
          covers a spread of sizes, so being a millimetre or two out does not cost you the order.
        </p>
      </div>
    </motion.div>
  );
}
