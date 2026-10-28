export default function WatsonMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Watson" className={className}>
      <circle cx="27" cy="27" r="17" fill="none" stroke="currentColor" strokeWidth="5" />
      <path d="M40 40 L56 56" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M17 19 l4 16 l6-11 l6 11 l4-16" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
