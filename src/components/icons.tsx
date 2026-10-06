import type { SVGProps } from "react";

type Icon = (props: SVGProps<SVGSVGElement>) => React.ReactElement;

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const SearchIcon: Icon = (p) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const CartIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M3 4h2.2l1.8 10.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L20 7H6" />
    <circle cx="9.5" cy="20" r="1.4" />
    <circle cx="17" cy="20" r="1.4" />
  </svg>
);

export const UserIcon: Icon = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
);

export const HeartIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M12 20.2 4.9 13.4a4.4 4.4 0 0 1 6.2-6.2l.9.9.9-.9a4.4 4.4 0 0 1 6.2 6.2Z" />
  </svg>
);

export const ArrowRightIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const ChevronDownIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronLeftIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);

export const ChevronRightIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const FilterIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M4 7h16" />
    <path d="M7 12h10" />
    <path d="M10 17h4" />
  </svg>
);

export const PinIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

export const PhoneIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M6 3h3l1.6 4-2 1.4a12 12 0 0 0 5.6 5.6L15.6 12l4 1.6v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 6.2 2 2 0 0 1 6 3Z" />
  </svg>
);

export const MailIcon: Icon = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 5.5L20 7" />
  </svg>
);

export const LinkedInIcon: Icon = (p) => (
  <svg {...base({ ...p, fill: "currentColor", stroke: "none" })}>
    <path d="M4.5 3A1.8 1.8 0 1 0 4.5 6.6 1.8 1.8 0 0 0 4.5 3ZM3 8.4h3V21H3Zm5.4 0h2.9v1.7a3.2 3.2 0 0 1 2.9-1.6c3 0 3.8 1.9 3.8 4.4V21h-3v-6.5c0-1.6-.6-2.5-1.9-2.5-1 0-1.7.7-1.9 1.4V21h-3Z" />
  </svg>
);

export const YouTubeIcon: Icon = (p) => (
  <svg {...base({ ...p, fill: "currentColor", stroke: "none" })}>
    <path d="M21.6 7.5a2.5 2.5 0 0 0-1.8-1.8C18.2 5.3 12 5.3 12 5.3s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.5 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.5 2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.5ZM10 15.1V8.9l5.2 3.1Z" />
  </svg>
);

export const TruckIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M3 7h10v9H3z" />
    <path d="M13 10h4l3 3v3h-7" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </svg>
);

export const ZoomIcon: Icon = (p) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M11 8.5v5M8.5 11h5M19.5 19.5 16 16" />
  </svg>
);

export const CubeIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="m12 3 8 4.3v9.4L12 21l-8-4.3V7.3Z" />
    <path d="m4 7.3 8 4.4 8-4.4" />
    <path d="M12 11.7V21" />
  </svg>
);

export const ImageIcon: Icon = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <circle cx="8.5" cy="10" r="1.5" />
    <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
  </svg>
);

export const PlusIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);

export const CheckIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const CloseIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const SparkIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M12 3.5 13.7 9 19 10.7 13.7 12.4 12 18l-1.7-5.6L5 10.7 10.3 9Z" />
    <path d="M18.5 16.5 19.2 18.6 21 19.3 19.2 20 18.5 22 17.8 20 16 19.3 17.8 18.6Z" />
  </svg>
);

export const DownloadIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M12 4v10" />
    <path d="m8 11 4 4 4-4" />
    <path d="M5 19h14" />
  </svg>
);

export const RulerIcon: Icon = (p) => (
  <svg {...base(p)}>
    <rect x="2.5" y="8" width="19" height="8" rx="1.6" />
    <path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
  </svg>
);

export const RotateIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v4h-4" />
  </svg>
);

export const GridIcon: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </svg>
);

/** A dimensioned sheet: frame, part, and a dimension arrowed at both ends. */
export const DrawingIcon: Icon = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="1.6" />
    <path d="M7 8.5h10" />
    <path d="M7 10.5v6M17 10.5v6" strokeDasharray="2 2" />
    <path d="M7 15h10" />
    <path d="m9 13.4-2 1.6 2 1.6M15 13.4l2 1.6-2 1.6" />
  </svg>
);

/** A rail of cards: the alternative to the grid, in the Included springs switch. */
export const CarouselIcon: Icon = (p) => (
  <svg {...base(p)}>
    <rect x="8" y="6" width="8" height="12" rx="1.4" />
    <path d="M4 8v8M20 8v8" />
  </svg>
);

export const HelpIcon: Icon = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.3" />
    <path d="M12 17h.01" />
  </svg>
);
