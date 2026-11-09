/**
 * Inline SVG icon set (original, currentColor). Used for objectives, stats,
 * statuses and buttons so meaning never relies on color alone.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const IconFlag = (p: P) => (
  <svg {...base(p)}><path d="M5 21V4" /><path d="M5 4h11l-2.5 4L16 12H5" /></svg>
);
export const IconSword = (p: P) => (
  <svg {...base(p)}><path d="M14.5 14.5 20 4l-3 1-8 8" /><path d="m4 20 5-5" /><path d="M15 15l5 5" /><path d="m9 9-5 5 3 3 5-5" /></svg>
);
export const IconShield = (p: P) => (
  <svg {...base(p)}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /></svg>
);
export const IconBoot = (p: P) => (
  <svg {...base(p)}><path d="M7 4v9l-3 3v4h13a4 4 0 0 0-4-4h-2V4H7Z" /></svg>
);
export const IconEye = (p: P) => (
  <svg {...base(p)}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
);
export const IconCrosshair = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="7" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="1.6" /></svg>
);
export const IconWrench = (p: P) => (
  <svg {...base(p)}><path d="M14 6a4 4 0 1 0 4 4l3 3-4 4-3-3a4 4 0 0 1-4-4L4 4l3-3 6 6Z" /></svg>
);
export const IconMedal = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="14" r="5" /><path d="m9 9-3-6h4l2 4 2-4h4l-3 6" /></svg>
);
export const IconGear = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></svg>
);
export const IconBook = (p: P) => (
  <svg {...base(p)}><path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2V5Z" /><path d="M4 17a2 2 0 0 1 2-2h13" /></svg>
);
export const IconChevron = (p: P) => (
  <svg {...base(p)}><path d="m6 14 6-6 6 6" /></svg>
);
export const IconTimer = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></svg>
);
export const IconCoins = (p: P) => (
  <svg {...base(p)}><circle cx="9" cy="9" r="6" /><path d="M15.5 5.5a6 6 0 1 1-8.9 8.9" /></svg>
);
export const IconSkull = (p: P) => (
  <svg {...base(p)}><path d="M12 3a8 8 0 0 0-8 8c0 2.5 1.2 4.3 3 5.6V20h10v-3.4c1.8-1.3 3-3.1 3-5.6a8 8 0 0 0-8-8Z" /><circle cx="9" cy="11" r="1.4" /><circle cx="15" cy="11" r="1.4" /></svg>
);
export const IconArrow = (p: P) => (
  <svg {...base(p)}><path d="M12 3v18M5 10l7-7 7 7" /></svg>
);
