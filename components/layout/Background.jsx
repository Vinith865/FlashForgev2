export default function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas">
      {/* soft blue glows, top-left and top-right */}
      <div className="absolute -left-48 -top-56 h-[38rem] w-[38rem] rounded-full bg-brand-100/50 blur-[130px] animate-floaty" />
      <div
        className="absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-brand-200/40 blur-[140px] animate-floaty"
        style={{ animationDelay: '3s' }}
      />
      <div
        className="absolute -bottom-64 left-1/4 h-[34rem] w-[34rem] rounded-full bg-brand-50 blur-[150px] animate-floaty"
        style={{ animationDelay: '5s' }}
      />
    </div>
  );
}
