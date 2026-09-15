export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/planetai99_logo.jpeg" alt="PlanetAI9" className={`${className} shrink-0`} />;
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-8" />
      <span className="leading-none">
        <span className="block text-[19px] font-black tracking-tightest text-ink">PlanetAI9</span>
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-muted sm:block">
          Yapay Zekâ Haberleri
        </span>
      </span>
    </span>
  );
}
