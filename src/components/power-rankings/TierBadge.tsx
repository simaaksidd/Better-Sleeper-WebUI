"use client";

import { useState, useRef } from "react";

const TIER_DESCRIPTIONS: Record<string, string> = {
  Dynasty: "Paid off the commish.",
  Contender: "Surely we are winning this year.",
  Mid: "meh.",
  Rebuild: "I'll be good in 5 years, trust.",
  Fraud: "Bad roster, no plan. Yikes.",
};

export default function TierBadge({
  label,
  color,
  bgColor,
}: {
  label: string;
  color: string;
  bgColor: string;
}) {
  const description = TIER_DESCRIPTIONS[label];
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const badgeRef = useRef<HTMLSpanElement>(null);

  function handleEnter() {
    if (!badgeRef.current || !description) return;
    const rect = badgeRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
    setShow(true);
  }

  return (
    <>
      <span
        ref={badgeRef}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap cursor-default"
        style={{ backgroundColor: bgColor, color }}
      >
        {label}
      </span>
      {show && description && (
        <span
          className="fixed -translate-x-1/2 max-w-52 px-3 py-2 rounded-lg text-xs font-normal text-text-primary bg-bg-card border border-border shadow-sm z-[9999] pointer-events-none text-center"
          style={{ top: pos.top, left: pos.left }}
        >
          {description}
        </span>
      )}
    </>
  );
}
