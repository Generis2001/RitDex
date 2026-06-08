'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { EXPLORER_URL } from '@/lib/chain';

function RitualFigure({
  x, y, scale = 1, delay = 0, robeColor = '#9CA3AF', auraColor = '#19D184',
}: {
  x: number; y: number; scale?: number; delay?: number; robeColor?: string; auraColor?: string;
}) {
  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale})`}
      style={{ animationDelay: `${delay}s` }}
      className="animate-bob"
    >
      <ellipse cx="0" cy="-60" rx="18" ry="18" fill={auraColor} opacity="0.08" />
      <ellipse cx="0" cy="-60" rx="10" ry="10" fill={auraColor} opacity="0.12" />
      <circle cx="0" cy="-80" r="9" fill="#374151" />
      <path d="M-12,-80 Q-9,-95 0,-98 Q9,-95 12,-80 Z" fill={robeColor} opacity="0.9" />
      <path d="M-14,-70 Q-18,-40 -16,-10 Q0,-5 16,-10 Q18,-40 14,-70 Z" fill={robeColor} opacity="0.85" />
      <path d="M-14,-60 Q-28,-48 -26,-38" stroke={robeColor} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M14,-60 Q28,-48 26,-38" stroke={robeColor} strokeWidth="4" strokeLinecap="round" fill="none" />
      <rect x="-30" y="-43" width="4" height="12" fill="#4B5563" rx="1" />
      <ellipse cx="-28" cy="-44" rx="2" ry="3" fill="#FACC15" className="animate-flicker" />
      <rect x="26" y="-43" width="4" height="12" fill="#4B5563" rx="1" />
      <ellipse cx="28" cy="-44" rx="2" ry="3" fill="#FACC15" className="animate-flicker" />
      <ellipse cx="0" cy="-4" rx="12" ry="4" fill="#000" opacity="0.3" />
    </g>
  );
}

function CentralAltar({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-40" y="-20" width="80" height="20" rx="4" fill="#1F2937" />
      <rect x="-32" y="-28" width="64" height="10" rx="3" fill="#374151" />
      <polygon points="0,-60 -12,-40 0,-32 12,-40" fill="#19D184" opacity="0.6" className="animate-ritual-glow" />
      <polygon points="0,-60 -12,-40 0,-44 12,-40" fill="#BFFF00" opacity="0.3" className="animate-ritual-glow" />
      <ellipse cx="0" cy="-22" rx="8" ry="4" fill="#FACC15" opacity="0.3" className="animate-flicker" />
      <ellipse cx="0" cy="-26" rx="5" ry="6" fill="#FB923C" opacity="0.5" className="animate-flicker" />
      <ellipse cx="0" cy="-32" rx="3" ry="7" fill="#FACC15" opacity="0.6" className="animate-flicker" />
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const rx = 50 * Math.cos(rad);
        const ry = 50 * Math.sin(rad) * 0.4 - 30;
        return (
          <text key={deg} x={rx} y={ry} textAnchor="middle" fontSize="10" fill="#19D184" opacity="0.5" fontFamily="serif" className="animate-ritual-glow">
            ᚱ
          </text>
        );
      })}
    </g>
  );
}

function EmberParticle({ index }: { index: number }) {
  const left = 30 + (index * 37) % 40;
  const duration = 2 + (index % 3);
  const delay = (index * 0.4) % 2;
  return (
    <div
      className="absolute bottom-1/3 w-1 h-1 rounded-full bg-yellow-400 animate-ember-rise pointer-events-none"
      style={{ left: `${left}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s`, opacity: 0 }}
    />
  );
}

function SmokeParticle({ index }: { index: number }) {
  const left = 40 + (index * 13) % 20;
  const duration = 4 + (index % 3);
  const delay = (index * 0.7) % 3;
  return (
    <div
      className="absolute bottom-1/3 w-6 h-6 rounded-full bg-gray-600 animate-smoke-rise pointer-events-none"
      style={{ left: `${left}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s`, opacity: 0 }}
    />
  );
}

function RitualFloorboard({ width, height }: { width: number; height: number }) {
  const cols = Math.ceil(width / 40);
  return (
    <svg width={width} height={height} className="absolute bottom-0 left-0 opacity-30">
      <defs>
        <pattern id="hex" x="0" y="0" width="40" height="35" patternUnits="userSpaceOnUse">
          <polygon points="20,2 38,11 38,24 20,33 2,24 2,11" fill="none" stroke="#19D184" strokeWidth="0.8" />
        </pattern>
        <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#19D184" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#19D184" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#hex)" />
      <rect width={width} height={height} fill="url(#floorGrad)" />
      {Array.from({ length: cols + 1 }).map((_, ci) =>
        Array.from({ length: 3 }).map((_, ri) => (
          <circle key={`${ci}-${ri}`} cx={ci * 40} cy={ri * 35 + 17} r="2" fill="#19D184" opacity="0.6" />
        ))
      )}
    </svg>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 400 });

  useEffect(() => {
    const update = () => {
      setDims({ w: window.innerWidth, h: Math.min(window.innerHeight * 0.65, 520) });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const cx = dims.w / 2;
  const cy = dims.h * 0.62;

  const figures = [
    { x: cx - 260, y: cy, scale: 0.85, delay: 0,   robe: '#6B7280', aura: '#19D184' },
    { x: cx - 190, y: cy - 18, scale: 0.9,  delay: 0.3, robe: '#9CA3AF', aura: '#BFFF00' },
    { x: cx - 120, y: cy - 28, scale: 0.95, delay: 0.6, robe: '#D1D5DB', aura: '#19D184' },
    { x: cx - 55,  y: cy - 34, scale: 1.0,  delay: 0.9, robe: '#F3F4F6', aura: '#FACC15' },
    { x: cx + 55,  y: cy - 34, scale: 1.0,  delay: 1.2, robe: '#F3F4F6', aura: '#FACC15' },
    { x: cx + 120, y: cy - 28, scale: 0.95, delay: 1.5, robe: '#D1D5DB', aura: '#19D184' },
    { x: cx + 190, y: cy - 18, scale: 0.9,  delay: 1.8, robe: '#9CA3AF', aura: '#BFFF00' },
    { x: cx + 260, y: cy, scale: 0.85, delay: 2.1, robe: '#6B7280', aura: '#19D184' },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden landing-mesh grain">

      {/* ── rittyyy.jpg watermark background ─── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/rittyyy.jpg"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          style={{
            opacity: 0.13,
            filter: 'grayscale(20%) sepia(40%) hue-rotate(105deg) saturate(2.2) brightness(0.65)',
            mixBlendMode: 'screen',
          }}
        />
        {/* Extra green overlay to deepen the tint */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(8,20,10,0.45) 50%, rgba(0,0,0,0.75) 100%)' }} />
      </div>

      {/* ── Top-right: Explorer button with Ritual Chain logo ─── */}
      <div className="absolute top-5 right-5 z-20">
        <a
          href="http://explorer.ritualfoundation.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-600 text-gray-300 text-sm font-semibold
                     rounded-lg hover:border-ritual-green hover:text-ritual-green transition-colors duration-200
                     bg-black/40 backdrop-blur-sm"
        >
          <img
            src="/ritual-chain-logo.png"
            alt="Ritual Chain"
            width={18}
            height={18}
            className="rounded-sm opacity-80"
            style={{ filter: 'invert(1) brightness(0.85)' }}
          />
          Ritual Explorer
          <span className="text-xs opacity-60">↗</span>
        </a>
      </div>

      {/* ── Ceremony SVG scene ─── */}
      <div className="relative w-full z-10" style={{ height: dims.h }}>
        <div className="absolute bottom-0 left-0 w-full" style={{ height: 80 }}>
          <RitualFloorboard width={dims.w} height={80} />
        </div>
        {Array.from({ length: 12 }).map((_, i) => <EmberParticle key={i} index={i} />)}
        {Array.from({ length: 6 }).map((_, i) => <SmokeParticle key={i} index={i} />)}
        <svg
          ref={svgRef}
          width="100%"
          height={dims.h}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0"
        >
          <radialGradient id="altarGlow" cx="50%" cy="70%" r="30%">
            <stop offset="0%" stopColor="#19D184" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#19D184" stopOpacity="0" />
          </radialGradient>
          <rect width="100%" height="100%" fill="url(#altarGlow)" />
          <line x1={cx - 340} y1={cy + 12} x2={cx + 340} y2={cy + 12} stroke="#374151" strokeWidth="1" opacity="0.4" />
          <CentralAltar x={cx} y={cy - 10} />
          {figures.map((f, i) => (
            <RitualFigure key={i} x={f.x} y={f.y} scale={f.scale} delay={f.delay} robeColor={f.robe} auraColor={f.aura} />
          ))}
          {figures.slice(2, 6).map((f, i) => (
            <line key={i} x1={cx} y1={cy - 50} x2={f.x} y2={f.y - 50} stroke="#19D184" strokeWidth="0.5" opacity="0.12" strokeDasharray="4 6" />
          ))}
        </svg>
      </div>

      {/* ── Hero text block ─── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 pt-2 pb-16">

        {/* Logo + name */}
        <div className="mb-3 flex items-center gap-4">
          <img src="/logo.svg" alt="RitDex logo" width={64} height={64} className="rounded-xl shadow-lg" />
          <h1
            className="font-display tracking-tight text-white text-glow-white"
            style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', letterSpacing: '-0.02em' }}
          >
            RitDex
          </h1>
        </div>

        {/* Tagline */}
        <p
          className="font-display text-gray-300 text-glow-green mb-10"
          style={{ fontSize: 'clamp(1rem, 2.5vw, 1.6rem)', letterSpacing: '0.04em' }}
        >
          The new Dawn of Dex&apos;s
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <button
            onClick={() => router.push('/dapp')}
            className="px-10 py-4 border border-ritual-green text-ritual-green font-semibold text-base rounded-xl
                       hover:bg-ritual-green/10 glow-green transition-all duration-200 active:scale-95"
          >
            Enter the Ritual ↗
          </button>
          <a
            href="http://explorer.ritualfoundation.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 border border-gray-600 text-gray-300 font-semibold text-base rounded-xl
                       hover:border-gray-400 transition-colors duration-200"
          >
            <img
              src="/ritual-chain-logo.png"
              alt="Ritual Chain"
              width={20}
              height={20}
              className="rounded-sm opacity-75"
              style={{ filter: 'invert(1) brightness(0.85)' }}
            />
            View Explorer
          </a>
        </div>

        {/* Sub features hint */}
        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <span className="text-ritual-green">⇄</span>
            <span className="italic text-gray-400">channel your path through the dark</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-ritual-green">◈</span>
            <span className="italic text-gray-400">immerse yourself</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-ritual-green">✦</span>
            <span className="italic text-gray-400">sow your seed</span>
          </span>
        </div>
      </div>

      {/* ── Bottom gradient fade ─── */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />
    </main>
  );
}
