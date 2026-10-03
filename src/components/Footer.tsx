"use client";

import { Wordmark } from "@/assets/brand";
import { ArrowRightIcon, LinkedInIcon, MailIcon, PhoneIcon, PinIcon, YouTubeIcon } from "./icons";

export function Footer() {
  return (
    <footer className="relative mt-20 overflow-hidden bg-navy-900 text-white">
      {/* The angled blue corner from the mockups */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -right-16 h-64 w-96 rotate-[-28deg] bg-brand-500/70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-4 h-64 w-96 rotate-[-28deg] bg-brand-600/50"
      />

      <div className="relative mx-auto grid max-w-[1320px] gap-10 px-5 py-14 md:grid-cols-[1.2fr_1fr_auto]">
        <div>
          <Wordmark className="text-[34px] leading-none" />
          <ul className="mt-7 space-y-3 text-[14px] text-white/85">
            <li className="flex gap-3">
              <PinIcon width={18} height={18} className="mt-0.5 shrink-0 text-white/70" />
              <span>
                Pavintie 8
                <br />
                01260 Vantaa, FI
              </span>
            </li>
            <li className="flex items-center gap-3">
              <PhoneIcon width={18} height={18} className="shrink-0 text-white/70" />
              +358 207 699 300
            </li>
            <li className="flex items-center gap-3">
              <MailIcon width={18} height={18} className="shrink-0 text-white/70" />
              sales@meconet.net
            </li>
          </ul>
        </div>

        <div className="flex flex-col items-start gap-6">
          <button className="flex items-center gap-3 rounded-full bg-brand-500 px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-400">
            Contact us
            <ArrowRightIcon width={18} height={18} />
          </button>
          <nav className="space-y-2.5 text-[14px] text-white/85">
            <p className="cursor-pointer hover:text-white">Cookie settings</p>
            <p className="cursor-pointer hover:text-white">Privacy Policy</p>
          </nav>
        </div>

        <div className="flex gap-3 md:justify-end">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-white/15 text-white">
            <LinkedInIcon width={18} height={18} />
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded bg-white/15 text-white">
            <YouTubeIcon width={18} height={18} />
          </span>
        </div>
      </div>
    </footer>
  );
}
