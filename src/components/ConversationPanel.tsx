"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MEASURING_STEPS, SPRING_SHAPES, type Question } from "@/lib/search";
import { ArrowRightIcon, CheckIcon, RulerIcon, SparkIcon } from "./icons";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
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
  finished: boolean;
}) {
  return (
    <section
      aria-label="Guided spring finder"
      className="animate-rise mt-6 w-full rounded-2xl border border-line bg-surface/95 p-5 shadow-card backdrop-blur sm:p-6"
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
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onToggleGuide}
            aria-expanded={guideOpen}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
              guideOpen
                ? "border-brand-500 bg-brand-50 text-brand-600"
                : "border-line text-muted hover:border-brand-400 hover:text-brand-600"
            }`}
          >
            <RulerIcon width={15} height={15} />
            How to measure
          </button>
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <span
              className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed ${
                message.role === "user"
                  ? "rounded-bl-sm bg-brand-500 text-white"
                  : "rounded-bl-sm bg-brand-50 text-ink"
              }`}
            >
              {message.text}
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

      <AnimatePresence initial={false}>
        {guideOpen && <MeasuringGuide onClose={onToggleGuide} />}
      </AnimatePresence>

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
          {matchCount > 0 && (
            <button
              onClick={onSkip}
              className="mt-3 text-[13.5px] font-medium text-brand-600 hover:underline"
            >
              Skip ahead and show me {matchCount} assortment{matchCount === 1 ? "" : "s"} now
            </button>
          )}
        </div>
      )}

      {finished && !thinking && (
        <div className="animate-rise flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <span className="flex items-center gap-2 rounded-full bg-stock-bg px-3.5 py-1.5 text-[13.5px] font-semibold text-stock">
            <CheckIcon width={15} height={15} />
            {matchCount} assortment{matchCount === 1 ? "" : "s"} matched
          </span>
          <a
            href="#results"
            className="flex items-center gap-2 text-[14px] font-semibold text-brand-600 hover:underline"
          >
            See the results below
            <ArrowRightIcon width={17} height={17} />
          </a>
        </div>
      )}
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
      <div className="mb-5 rounded-xl border border-brand-100 bg-brand-50/60 p-4 sm:p-5">
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
