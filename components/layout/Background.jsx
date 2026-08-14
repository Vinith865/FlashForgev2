export default function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* dot grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)',
          backgroundSize: '38px 38px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)',
        }}
      />
      {/* aurora blobs */}
      <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-neon-cyan/20 blur-[140px] animate-floaty" />
      <div className="absolute -right-32 top-10 h-[30rem] w-[30rem] rounded-full bg-neon-violet/20 blur-[150px] animate-floaty" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-[-18rem] left-1/3 h-[36rem] w-[36rem] rounded-full bg-cyan-500/10 blur-[160px] animate-floaty" style={{ animationDelay: '4s' }} />
      {/* vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-900" />
    </div>
  );
}
