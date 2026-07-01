interface TrainSvgProps {
  className?: string;
}

/** Simple colored train icon used inside each platform square. */
export function TrainSvg({ className }: TrainSvgProps) {
  return (
    <svg
      viewBox="0 0 64 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="8" y="6" width="48" height="30" rx="7" fill="currentColor" opacity="0.92" />
      <rect x="13" y="11" width="16" height="11" rx="2.5" fill="#0b0f16" opacity="0.55" />
      <rect x="35" y="11" width="16" height="11" rx="2.5" fill="#0b0f16" opacity="0.55" />
      <rect x="14" y="27" width="36" height="4" rx="2" fill="#0b0f16" opacity="0.4" />
      <circle cx="19" cy="40" r="4" fill="currentColor" />
      <circle cx="45" cy="40" r="4" fill="currentColor" />
      <rect x="2" y="33" width="6" height="3" rx="1.5" fill="currentColor" opacity="0.7" />
      <rect x="56" y="33" width="6" height="3" rx="1.5" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
