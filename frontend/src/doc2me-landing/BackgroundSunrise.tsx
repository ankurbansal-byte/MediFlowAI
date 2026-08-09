/**
 * BackgroundSunrise.tsx (Cinematic Dark Purple Theme)
 * Deep violet/dark purple gradient canvas with glowing ambient light spheres,
 * indigo & fuchsia flares, and subtle grid lines.
 */

export function BackgroundSunrise() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-[#090417]">
      {/* Primary Cinematic Dark Purple Gradient Base */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: 'radial-gradient(circle at 50% 20%, #1c0b3b 0%, #0d0622 45%, #070312 100%)'
        }}
      />

      {/* Top Center Glowing Neon Purple Spotlight */}
      <div
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[90vw] h-[650px] max-w-[1100px] rounded-full opacity-60 blur-[130px] animate-pulse-glow"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, rgba(126, 34, 206, 0.25) 45%, rgba(88, 28, 135, 0) 75%)'
        }}
      />

      {/* Top Left Fuchsia/Violet Ambient Glow */}
      <div
        className="absolute top-[10%] -left-[10%] w-[55vw] h-[55vw] max-w-[750px] rounded-full opacity-40 blur-[110px] animate-float-slow"
        style={{
          background: 'radial-gradient(circle, rgba(217, 70, 239, 0.35) 0%, rgba(147, 51, 234, 0.2) 60%, transparent 80%)'
        }}
      />

      {/* Right Emerald/Cyan WhatsApp Accent Glow */}
      <div
        className="absolute top-[25%] -right-[15%] w-[50vw] h-[50vw] max-w-[650px] rounded-full opacity-25 blur-[120px] animate-float-reverse"
        style={{
          background: 'radial-gradient(circle, rgba(37, 211, 102, 0.35) 0%, rgba(16, 185, 129, 0.15) 50%, transparent 80%)'
        }}
      />

      {/* Bottom Subtle Indigo Atmosphere */}
      <div
        className="absolute -bottom-[20%] left-[10%] w-[80vw] h-[400px] rounded-full opacity-35 blur-[140px]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(124, 58, 237, 0.3) 0%, rgba(67, 56, 202, 0.15) 50%, transparent 80%)'
        }}
      />

      {/* Subtle Linear/Stripe Style Grid Overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(rgba(216, 180, 254, 0.8) 0.8px, transparent 0.8px)`,
          backgroundSize: '32px 32px'
        }}
      />
    </div>
  );
}
