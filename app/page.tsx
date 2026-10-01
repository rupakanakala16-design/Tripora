"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import AgraDestinationExplorer from "./components/AgraDestinationExplorer";

interface FeaturedDestination {
  id: string;
  name: string;
  region: string;
  coordinates: string;
  elevation: string;
  season: string;
  highlight: string;
}

const FEATURED_DESTINATIONS: FeaturedDestination[] = [
  {
    id: "dolomites",
    name: "Dolomites",
    region: "Northern Alps, Italy",
    coordinates: "46°26'N 11°51'E",
    elevation: "2,450m",
    season: "Autumn Sunset",
    highlight: "Dramatic limestone spires glowing in warm alpine amber light",
  },
  {
    id: "kyoto",
    name: "Kyoto Arashiyama",
    region: "Kansai, Japan",
    coordinates: "35°00'N 135°40'E",
    elevation: "380m",
    season: "Dusk Twilight",
    highlight: "Atmospheric cedar forests with quiet lantern-lit stone pathways",
  },
  {
    id: "patagonia",
    name: "Torres del Paine",
    region: "Magallanes, Chile",
    coordinates: "51°15'S 72°58'W",
    elevation: "1,200m",
    season: "Dawn Glacial",
    highlight: "Turquoise glacial lakes reflecting early morning golden sunbursts",
  },
  {
    id: "sahara",
    name: "Erg Chebbi",
    region: "Merzouga, Morocco",
    coordinates: "31°12'N 03°58'W",
    elevation: "740m",
    season: "Golden Hour",
    highlight: "Endless sculpted terracotta dunes casting long cinematic shadows",
  },
];

const TOTAL_FRAMES = 78;

const TRIPORA_DESTINATIONS_ROW_1 = [
  { name: "KYOTO", region: "JAPAN", mark: "✦" },
  { name: "PARIS", region: "FRANCE", mark: "•" },
  { name: "SWITZERLAND", region: "ALPS", mark: "✦" },
  { name: "BALI", region: "INDONESIA", mark: "•" },
  { name: "SANTORINI", region: "GREECE", mark: "✦" },
  { name: "TOKYO", region: "JAPAN", mark: "•" },
  { name: "NORWAY", region: "FJORDS", mark: "✦" },
  { name: "NEW YORK", region: "USA", mark: "•" },
];

const TRIPORA_DESTINATIONS_ROW_2 = [
  { name: "MALDIVES", region: "ATOLLS", mark: "✦" },
  { name: "ICELAND", region: "NORDIC", mark: "•" },
  { name: "AMALFI", region: "ITALY", mark: "✦" },
  { name: "DUBAI", region: "EMIRATES", mark: "•" },
  { name: "LONDON", region: "UK", mark: "✦" },
  { name: "DOLOMITES", region: "ITALY", mark: "•" },
  { name: "PATAGONIA", region: "CHILE", mark: "✦" },
  { name: "ARASHIYAMA", region: "KYOTO", mark: "•" },
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [activeDestination, setActiveDestination] = useState<FeaturedDestination>(
    FEATURED_DESTINATIONS[0]
  );
  const [isMuted, setIsMuted] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Refs for Scroll Canvas Animation
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>(new Array(TOTAL_FRAMES).fill(null));
  const loadingSetRef = useRef<Set<number>>(new Set());
  const targetProgressRef = useRef(0);
  const currentFrameRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const lastDrawnFrameRef = useRef(-1);
  const isVisibleRef = useRef(true);
  const dimsRef = useRef({ w: 0, h: 0, dpr: 1 });

  // Progressive Frame Loading & Canvas Scroll-Linked Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Helper: Build zero-padded frame filename (ezgif-frame-001.webp ... ezgif-frame-078.webp)
    const getFrameUrl = (idx: number) => {
      const paddedNum = String(idx + 1).padStart(3, "0");
      return `/frames/ezgif-frame-${paddedNum}.webp`;
    };

    // Update cached canvas dimensions on resize only (avoids layout thrashing)
    const updateDimensions = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;

      const targetCanvasWidth = Math.round(w * dpr);
      const targetCanvasHeight = Math.round(h * dpr);

      if (canvas.width !== targetCanvasWidth || canvas.height !== targetCanvasHeight) {
        canvas.width = targetCanvasWidth;
        canvas.height = targetCanvasHeight;
      }

      dimsRef.current = { w, h, dpr };
    };
    updateDimensions();

    // Helper: Draw single image with cinematic cover fit and DPR support using cached dimensions
    const drawImageCover = (img: HTMLImageElement) => {
      if (!canvas || !ctx) return;
      const { w, h, dpr } = dimsRef.current;
      if (w === 0 || h === 0) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;

      if (imgW > 0 && imgH > 0) {
        const scale = Math.max(w / imgW, h / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const x = (w - drawW) / 2;
        const y = (h - drawH) / 2;

        ctx.drawImage(img, x, y, drawW, drawH);
      }
      ctx.restore();
    };

    // Find and draw target frame or nearest loaded frame
    const drawNearestFrame = (targetIndex: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, targetIndex));
      const directMatch = framesRef.current[clamped];

      if (directMatch && directMatch.complete && directMatch.naturalWidth > 0) {
        drawImageCover(directMatch);
        lastDrawnFrameRef.current = clamped;
        return;
      }

      // Outward search for closest available loaded frame (guarantees zero black/blank frames)
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const lower = clamped - offset;
        if (lower >= 0) {
          const lowerImg = framesRef.current[lower];
          if (lowerImg && lowerImg.complete && lowerImg.naturalWidth > 0) {
            drawImageCover(lowerImg);
            lastDrawnFrameRef.current = lower;
            return;
          }
        }
        const upper = clamped + offset;
        if (upper < TOTAL_FRAMES) {
          const upperImg = framesRef.current[upper];
          if (upperImg && upperImg.complete && upperImg.naturalWidth > 0) {
            drawImageCover(upperImg);
            lastDrawnFrameRef.current = upper;
            return;
          }
        }
      }
    };

    // Load individual frame with asynchronous decode optimization
    const loadFrame = (index: number, onLoadCallback?: () => void) => {
      if (index < 0 || index >= TOTAL_FRAMES) return;
      if (framesRef.current[index] || loadingSetRef.current.has(index)) return;

      loadingSetRef.current.add(index);
      const img = new window.Image();
      img.src = getFrameUrl(index);

      const handleReady = () => {
        framesRef.current[index] = img;
        loadingSetRef.current.delete(index);
        if (onLoadCallback) onLoadCallback();

        // If this newly loaded frame matches what we are currently trying to show, redraw
        const currentTarget = Math.round(currentFrameRef.current);
        if (currentTarget === index && lastDrawnFrameRef.current !== index) {
          drawNearestFrame(index);
        }
      };

      let resolved = false;
      const onDone = () => {
        if (resolved) return;
        resolved = true;
        handleReady();
      };

      img.onload = onDone;
      img.onerror = () => {
        loadingSetRef.current.delete(index);
      };

      if (typeof img.decode === "function") {
        img.decode().then(onDone).catch(onDone);
      }
    };

    // Priority loader around current scroll position (+/- 8 frames)
    const prioritizeFramesAround = (centerIndex: number) => {
      const radius = 8;
      loadFrame(centerIndex);
      for (let r = 1; r <= radius; r++) {
        loadFrame(centerIndex + r);
        loadFrame(centerIndex - r);
      }
    };

    // Preloading Strategy:
    // 1. Immediately load frame 001 and render it on load
    loadFrame(0, () => {
      drawNearestFrame(0);
    });

    // 2. Load milestone anchor frames for rapid scrubbing
    [15, 30, 45, 60, 77].forEach((f) => loadFrame(f));

    // 3. Load initial nearby cluster (frames 1 to 10)
    for (let i = 1; i <= 10; i++) {
      loadFrame(i);
    }

    // 4. Progressively preload remaining frames in background idle batches
    let currentBatch = 11;
    const preloadBatch = () => {
      if (currentBatch >= TOTAL_FRAMES) return;
      const end = Math.min(currentBatch + 6, TOTAL_FRAMES);
      for (let i = currentBatch; i < end; i++) {
        loadFrame(i);
      }
      currentBatch = end;
      if (currentBatch < TOTAL_FRAMES) {
        if ("requestIdleCallback" in window) {
          (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
            preloadBatch
          );
        } else {
          setTimeout(preloadBatch, 30);
        }
      }
    };
    preloadBatch();

    // RequestAnimationFrame Adaptive Lerp Loop
    const loop = () => {
      if (!isVisibleRef.current) {
        rafIdRef.current = null;
        return;
      }

      const targetFrame = targetProgressRef.current * (TOTAL_FRAMES - 1);
      const diff = targetFrame - currentFrameRef.current;
      const absDiff = Math.abs(diff);

      // Settle and sleep when within micro-threshold (preserves GPU/CPU)
      if (absDiff <= 0.02) {
        currentFrameRef.current = targetFrame;
        const frameToDraw = Math.round(targetFrame);
        if (frameToDraw !== lastDrawnFrameRef.current) {
          drawNearestFrame(frameToDraw);
        }
        rafIdRef.current = null;
        return;
      }

      // Dynamic adaptive lerp: fast tracking when scrolling quickly, silky smooth when slow
      const lerpFactor = absDiff > 4 ? 0.32 : absDiff > 1.5 ? 0.22 : 0.16;
      currentFrameRef.current += diff * lerpFactor;

      const frameToDraw = Math.round(currentFrameRef.current);
      if (frameToDraw !== lastDrawnFrameRef.current) {
        drawNearestFrame(frameToDraw);
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    // Wake up loop helper
    const wakeLoop = () => {
      if (!rafIdRef.current && isVisibleRef.current) {
        rafIdRef.current = requestAnimationFrame(loop);
      }
    };

    // Lightweight passive scroll listener
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollableDist = rect.height - window.innerHeight;
      if (scrollableDist <= 0) return;

      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / scrollableDist));
      targetProgressRef.current = progress;

      // Prioritize loading frames near target scroll position
      const targetFrame = Math.round(progress * (TOTAL_FRAMES - 1));
      prioritizeFramesAround(targetFrame);

      wakeLoop();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Resize handler with cached dimensions
    let resizeTimer: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateDimensions();
        drawNearestFrame(Math.round(currentFrameRef.current));
      }, 50);
    };
    window.addEventListener("resize", handleResize, { passive: true });

    // IntersectionObserver: Pause loop when hero is off-screen (prevents GPU conflict with Taj Mahal)
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && containerRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isVisibleRef.current = entry.isIntersecting;
          if (entry.isIntersecting) {
            handleScroll();
            wakeLoop();
          } else {
            if (rafIdRef.current) {
              cancelAnimationFrame(rafIdRef.current);
              rafIdRef.current = null;
            }
          }
        },
        { threshold: 0.01 }
      );
      observer.observe(containerRef.current);
    }

    // Initial calculation and start loop
    handleScroll();
    wakeLoop();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (observer) observer.disconnect();
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <main className="relative min-h-screen w-full bg-[#09080B] text-[#FFFDFE] overflow-x-clip selection:bg-[#FF9FC7] selection:text-[#351D32]">
      {/* Outer scroll container creates generous scroll distance (400vh) for the 78-frame journey */}
      <div
        ref={containerRef}
        className="relative w-full h-[400vh] bg-[#09080B] text-[#FFFDFE] selection:bg-[#FF9FC7] selection:text-[#351D32]"
      >
      {/* Sticky Full-Viewport Container: Pinned while user scrolls through the 78 frames */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between">

        {/* ========================================================================= */}
        {/* 1. CINEMATIC SCROLL IMAGE SEQUENCE CANVAS (Behind all UI)                 */}
        {/* ========================================================================= */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 filter brightness-[1.05] contrast-[1.03] saturate-[1.10]"
        />

        {/* Soft Sunset Illumination Layer & Reduced Translucent Charcoal Mask (15–25%) */}
        <div className="sakura-sunset-glow" />
        <div className="video-cinematic-mask pointer-events-none z-[1]" />
        <div className="film-grain pointer-events-none z-[2]" />

        {/* Soft Sakura, Peach & Lavender Evening Atmospheric Ambient Accents */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[550px] bg-[#FF9FC7]/[0.08] rounded-full blur-[140px] pointer-events-none z-[2]" />
        <div className="absolute -bottom-32 left-10 w-[550px] h-[550px] bg-[#FFC6B0]/[0.06] rounded-full blur-[160px] pointer-events-none z-[2]" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-[#D9C7F2]/[0.05] rounded-full blur-[130px] pointer-events-none z-[2]" />

        {/* ========================================================================= */}
        {/* 2. OVERSIZED EDITORIAL BRAND TYPOGRAPHY: "TRIPORA" (Subtle 5–8% Opacity)  */}
        {/* ========================================================================= */}
        <div
          className="trip-oversized-brand top-16 sm:top-20 md:top-28 lg:top-24 left-1/2 -translate-x-1/2 tracking-[-0.04em] opacity-[0.07] pointer-events-none z-[3]"
          aria-hidden="true"
        >
          <span className="trip-oversized-brand-gradient">TRIPORA</span>
        </div>

        {/* ========================================================================= */}
        {/* 3. MINIMAL EDITORIAL NAVIGATION (Bright Sakura Sunset Palette)            */}
        {/* ========================================================================= */}
        <header className="relative z-40 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pt-7 pb-4">
          <nav className="flex items-center justify-between">
            {/* Brand Logo & Name */}
            <a
              href="/"
              className="flex items-center gap-3 group focus:outline-none"
            >
              <span className="font-display font-black text-xl sm:text-2xl tracking-[0.14em] uppercase text-[#FFFDFE] transition-opacity duration-300 group-hover:opacity-85">
                TRIPORA
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono text-[#FF9FC7] tracking-widest uppercase pl-2 border-l border-white/20">
                {activeDestination.coordinates}
              </span>
            </a>

            {/* Understated Editorial Navigation Links */}
            <div className="hidden md:flex items-center gap-8 lg:gap-10">
              {["Destinations", "Experiences", "Explore", "About"].map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  className="text-xs uppercase font-medium tracking-[0.2em] text-[#FFF5FA] hover:text-[#FF9FC7] transition-colors duration-200 relative group py-1"
                >
                  {link}
                  <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#FF9FC7] transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </div>

            {/* Right Action: Start Exploring & Audio Toggle */}
            <div className="flex items-center gap-4">
              {/* Audio Atmosphere Toggle */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-[#FFF5FA] hover:text-[#FFFDFE] transition-all text-[11px] font-mono tracking-wider"
                title={isMuted ? "Audio inactive" : "Audio active"}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isMuted ? "bg-zinc-500" : "bg-[#FF6FAE] animate-pulse shadow-[0_0_8px_rgba(255,111,174,0.9)]"}`} />
                <span>{isMuted ? "AUDIO: OFF" : "AUDIO: ON"}</span>
              </button>

              {/* Understated Nav CTA Button with Bright Sakura Gradient */}
              <button
                onClick={() => setIsExplorerOpen(true)}
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-[0.14em] uppercase text-[#351D32] bg-gradient-to-r from-[#FFD1E3] to-[#FF6FAE] hover:from-[#FFE8F1] hover:to-[#FF9FC7] shadow-[0_4px_22px_rgba(255,111,174,0.35)] transition-all duration-300 hover:-translate-y-0.5 border border-white/45"
              >
                <span>START EXPLORING</span>
              </button>

              {/* Mobile Hamburger Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg bg-white/10 border border-white/15 text-[#FFF5FA] hover:text-white focus:outline-none"
                aria-label="Toggle navigation"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h16M4 12h16M4 17h16" />
                  )}
                </svg>
              </button>
            </div>
          </nav>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 p-5 rounded-2xl bg-[#23121e]/95 backdrop-blur-2xl border border-[#FFD1E3]/25 animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex flex-col gap-3">
                {["Destinations", "Experiences", "Explore", "About"].map((link) => (
                  <a
                    key={link}
                    href={`#${link.toLowerCase()}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-sm tracking-widest uppercase font-medium text-[#FFF5FA] hover:text-[#FF9FC7] hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {link}
                  </a>
                ))}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-xs font-mono text-[#FFF5FA] flex items-center gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full ${isMuted ? "bg-zinc-500" : "bg-[#FF6FAE]"}`} />
                    <span>{isMuted ? "Audio: Muted" : "Audio: Active"}</span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsExplorerOpen(true);
                  }}
                  className="btn-tripora-cta w-full justify-center mt-2 !py-3"
                >
                  <span>START EXPLORING</span>
                </button>
              </div>
            </div>
          )}
        </header>

        {/* ========================================================================= */}
        {/* 4. MAIN HERO SECTION (Editorial hierarchy, spacious, high-end travel film)*/}
        {/* ========================================================================= */}
        <section className="relative z-30 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 md:py-16 lg:py-20 flex-1 flex flex-col justify-center animate-editorial-reveal">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-end">

            {/* Left Column: Headline, Badge, Description, CTA */}
            <div className="lg:col-span-8 xl:col-span-7 flex flex-col items-start">

              {/* Bright Glass AI Badge */}
              <div className="editorial-badge mb-6 sm:mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6FAE] animate-pulse shadow-[0_0_8px_rgba(255,111,174,0.9)]" />
                <span className="text-[#FFFDFE]">AI-POWERED TRAVEL EXPERIENCES</span>
              </div>

              {/* Concise Cinematic Headline: Pure Warm White + Bright Sakura Pink */}
              <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[4.75rem] tracking-[-0.035em] leading-[1.04] text-[#FFFDFE] mb-6 sm:mb-8">
                TRAVEL BEYOND
                <br />
                <span className="text-[#FF9FC7] drop-shadow-[0_0_35px_rgba(255,159,199,0.20)]">
                  THE ORDINARY.
                </span>
              </h1>

              {/* Short Supporting Description in Crisp Warm White */}
              <p className="text-[#FFFDFE]/90 text-base sm:text-lg md:text-xl font-normal leading-relaxed max-w-xl mb-9 sm:mb-11 tracking-wide">
                Explore destinations through immersive visuals and AI-powered experiences designed to inspire your next journey.
              </p>

              {/* Premium CTA Row */}
              <div className="flex flex-wrap items-center gap-6 sm:gap-9">
                {/* Primary CTA: START EXPLORING (Bright Sakura Gradient #FFD1E3 → #FF6FAE) */}
                <button
                  onClick={() => setIsExplorerOpen(true)}
                  className="btn-tripora-cta group"
                  id="btn-start-exploring"
                >
                  <span>START EXPLORING</span>
                  <svg
                    className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.4}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>

                {/* Secondary Text Link: EXPLORE DESTINATIONS → */}
                <button
                  onClick={() => setIsExplorerOpen(true)}
                  className="link-explore-destinations group"
                >
                  <span className="text-[#FFFDFE]">EXPLORE DESTINATIONS</span>
                  <span className="text-[#FF9FC7] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#FFD1E3]">
                    →
                  </span>
                </button>
              </div>

            </div>

            {/* Right Column: Editorial Destination Telemetry & Interactive Preview */}
            <div className="lg:col-span-4 xl:col-span-5 flex flex-col items-start lg:items-end justify-end">
              <div className="destination-preview-card p-5 sm:p-6 w-full max-w-md">

                {/* Card Header: Region & Live Tag */}
                <div className="flex items-center justify-between mb-3 text-xs font-mono">
                  <span className="text-[#FF9FC7] tracking-wider uppercase font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF9FC7] shadow-[0_0_8px_rgba(255,159,199,0.8)]" />
                    CURRENT DISCOVERY
                  </span>
                  <span className="text-[#FFD1E3] tracking-widest">
                    {activeDestination.season}
                  </span>
                </div>

                {/* Destination Title & Region */}
                <h3 className="font-display font-bold text-2xl text-[#FFFDFE] tracking-tight mb-1">
                  {activeDestination.name}
                </h3>
                <p className="text-xs text-[#E8CBD8] tracking-wide mb-4">
                  {activeDestination.region}
                </p>

                {/* Cinematic Description */}
                <p className="text-xs text-[#FFFDFE]/90 leading-relaxed mb-5 italic border-l-2 border-[#FF9FC7]/55 pl-3">
                  &ldquo;{activeDestination.highlight}&rdquo;
                </p>

                {/* Destination Metrics */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-[11px] font-mono">
                  <div>
                    <span className="text-[#E8CBD8] block uppercase">Coordinates</span>
                    <span className="text-[#FF9FC7] font-semibold">{activeDestination.coordinates}</span>
                  </div>
                  <div>
                    <span className="text-[#E8CBD8] block uppercase">Elevation</span>
                    <span className="text-[#FF9FC7] font-semibold">{activeDestination.elevation}</span>
                  </div>
                </div>

                {/* Interactive Destination Switcher */}
                <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-white/5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#E8CBD8] mr-1">
                    Select:
                  </span>
                  {FEATURED_DESTINATIONS.map((dest, idx) => (
                    <button
                      key={dest.id}
                      onClick={() => setActiveDestination(dest)}
                      className={`text-[11px] font-mono px-2.5 py-1 rounded-md transition-all duration-200 ${
                        activeDestination.id === dest.id
                          ? "bg-[#FF9FC7]/[0.25] border border-[#FF9FC7] text-[#FFFDFE] font-bold shadow-[0_0_12px_rgba(255,159,199,0.30)]"
                          : "bg-white/[0.06] hover:bg-white/[0.12] text-[#E8CBD8] hover:text-[#FFFDFE] border border-[#FFD1E3]/20"
                      }`}
                    >
                      0{idx + 1}
                    </button>
                  ))}
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. BOTTOM EDITORIAL STATUS BAR (Cinematic, minimal luxury)                */}
        {/* ========================================================================= */}
        <footer className="relative z-30 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pb-7 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-5 border-t border-white/10 text-xs font-mono text-[#E8CBD8]">

            {/* Left: Atmospheric State */}
            <div className="flex items-center gap-3">
              <span className="inline-block w-2 h-2 rounded-full bg-[#FF9FC7] shadow-[0_0_8px_rgba(255,159,199,0.8)]" />
              <span className="text-[#FFFDFE] font-medium tracking-wider uppercase">
                CINEMATIC TRAVEL ENGINE • 4K HDR
              </span>
            </div>

            {/* Center: Geographic Metadata */}
            <div className="hidden md:flex items-center gap-6 text-[11px] tracking-widest uppercase text-[#E8CBD8]">
              <span className="text-[#FF9FC7] font-semibold">SAKURA EVENING LIGHT</span>
              <span className="text-white/20">•</span>
              <span>AI ITINERARY SYNTHESIS</span>
              <span className="text-white/20">•</span>
              <span>UNCOMPRESSED CAPTURE</span>
            </div>

            {/* Right: Copyright / Luxury Brand Mark */}
            <div className="text-right text-[11px] tracking-widest uppercase text-[#E8CBD8]">
              TRIPORA © 2026 • TRAVEL ELEVATED
            </div>

          </div>
        </footer>

      </div>

      {/* ========================================================================= */}
      {/* 6. IMMERSIVE TRAVEL DISCOVERY MODAL (Bright Sakura Sunset Theme)           */}
      {/* ========================================================================= */}
      {isExplorerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-2xl animate-in fade-in duration-300"
          onClick={() => setIsExplorerOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-[#23121e]/95 border border-[#FFD1E3]/35 rounded-3xl p-6 sm:p-9 shadow-[0_25px_70px_rgba(0,0,0,0.95)] text-left animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div>
                <span className="text-[10px] font-mono tracking-[0.2em] text-[#FF9FC7] uppercase block mb-1">
                  TRIPORA INTELLIGENT DISCOVERY
                </span>
                <h3 className="font-display font-bold text-2xl text-[#FFFDFE]">
                  Find Your Next Cinematic Journey
                </h3>
              </div>
              <button
                onClick={() => setIsExplorerOpen(false)}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            {/* AI Search Prompt Bar */}
            <div className="mb-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#E8CBD8] mb-2">
                Describe your desired travel mood or landscape:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Cherry blossom stroll through Kyoto lantern-lit temples..."
                  className="w-full rounded-2xl bg-black/40 border border-white/20 px-4 py-3.5 text-sm text-[#FFFDFE] placeholder-zinc-400 focus:outline-none focus:border-[#FF9FC7] focus:ring-1 focus:ring-[#FF9FC7] font-sans"
                />
              </div>
            </div>

            {/* Curated AI Journey Highlights */}
            <div className="space-y-3 mb-6">
              <span className="text-xs font-mono uppercase tracking-wider text-[#E8CBD8] block">
                Featured Cinematic Expeditions:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURED_DESTINATIONS.map((dest) => (
                  <div
                    key={dest.id}
                    onClick={() => {
                      setActiveDestination(dest);
                      setIsExplorerOpen(false);
                    }}
                    className="p-3.5 rounded-xl bg-white/[0.04] hover:bg-[#FF9FC7]/15 border border-white/10 hover:border-[#FF9FC7]/50 cursor-pointer transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#FFFDFE] group-hover:text-[#FFD1E3]">
                        {dest.name}
                      </span>
                      <span className="text-[10px] font-mono text-[#E8CBD8]">
                        {dest.elevation}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#E8CBD8] line-clamp-1">
                      {dest.highlight}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsExplorerOpen(false)}
                className="text-xs uppercase tracking-wider font-semibold text-[#E8CBD8] hover:text-[#FFFDFE]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setIsExplorerOpen(false)}
                className="btn-tripora-cta !py-2.5 !px-6 !text-xs"
              >
                Launch Experience →
              </button>
            </div>

          </div>
        </div>
      )}
    </div>

    {/* ========================================================================= */}
    {/* SECTION 1: TRIPORA INFINITE DESTINATION MARQUEE (Two Seamless Rows)       */}
    {/* ========================================================================= */}
    <section className="relative z-30 w-full pt-6 sm:pt-8 pb-10 sm:pb-14 bg-[#09080B] border-t border-white/[0.06] overflow-hidden">
      {/* Subtle atmospheric pink/lavender glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[550px] h-[550px] bg-[#FF9FC7]/[0.03] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-[#D9C7F2]/[0.03] rounded-full blur-[140px] pointer-events-none" />

      {/* Minimal Editorial Badge */}
      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 text-center mb-5 sm:mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] sm:text-[11px] font-mono tracking-widest text-[#FF9FC7] uppercase shadow-[0_0_20px_rgba(255,159,199,0.12)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6FAE] animate-ping" />
          <span>CURATED DESTINATIONS ✦ GLOBAL EXPEDITIONS</span>
        </div>
      </div>

      {/* Marquee Rows with Edge Fade Mask */}
      <div className="relative w-full overflow-hidden marquee-mask marquee-container space-y-3.5 sm:space-y-4">
        {/* Row 1: Right -> Left (continuous marquee-left) */}
        <div className="animate-marquee-left flex items-center gap-4 sm:gap-6 pr-4 sm:pr-6">
          {[...TRIPORA_DESTINATIONS_ROW_1, ...TRIPORA_DESTINATIONS_ROW_1].map((dest, index) => (
            <div
              key={`dest1-${index}`}
              className="flex-shrink-0 flex items-center gap-3.5 px-6 py-3 rounded-full bg-[#140D17]/80 hover:bg-[#201323] border border-white/[0.08] hover:border-[#FF9FC7]/40 shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-300 group cursor-default"
            >
              <span className="font-display font-bold text-xs sm:text-sm tracking-[0.22em] uppercase text-[#FFFDFE] group-hover:text-[#FFD1E3] transition-colors whitespace-nowrap">
                {dest.name}
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#FF9FC7]/75 whitespace-nowrap">
                {dest.region}
              </span>
              <span className="text-xs text-[#FF6FAE] group-hover:scale-125 transition-transform">
                {dest.mark}
              </span>
            </div>
          ))}
        </div>

        {/* Row 2: Left -> Right (continuous marquee-right) */}
        <div className="animate-marquee-right flex items-center gap-4 sm:gap-6 pr-4 sm:pr-6">
          {[...TRIPORA_DESTINATIONS_ROW_2, ...TRIPORA_DESTINATIONS_ROW_2].map((dest, index) => (
            <div
              key={`dest2-${index}`}
              className="flex-shrink-0 flex items-center gap-3.5 px-6 py-3 rounded-full bg-[#140D17]/80 hover:bg-[#201323] border border-white/[0.08] hover:border-[#FF9FC7]/40 shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-300 group cursor-default"
            >
              <span className="font-display font-bold text-xs sm:text-sm tracking-[0.22em] uppercase text-[#FFFDFE] group-hover:text-[#FFD1E3] transition-colors whitespace-nowrap">
                {dest.name}
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#D9C7F2]/75 whitespace-nowrap">
                {dest.region}
              </span>
              <span className="text-xs text-[#FF6FAE] group-hover:scale-125 transition-transform">
                {dest.mark}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ========================================================================= */}
    {/* SECTION 2: TRIPORA BENTO TRAVEL GRID (Exact Structural Layout Reference)  */}
    {/* ========================================================================= */}
    <section className="relative z-30 w-full py-20 sm:py-28 bg-[#09080B] text-[#FFFDFE] overflow-hidden">
      {/* Subtle atmospheric glow background matching Tripora */}
      <div className="absolute top-1/4 left-1/10 w-[600px] h-[600px] bg-[#FF9FC7]/[0.04] rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/10 w-[650px] h-[650px] bg-[#D9C7F2]/[0.04] rounded-full blur-[170px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF6FAE]/[0.025] rounded-full blur-[200px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
        {/* Editorial Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-16">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono tracking-widest text-[#FF9FC7] uppercase mb-4 shadow-[0_0_20px_rgba(255,159,199,0.12)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD1E3]" />
              <span>EXPEDITION ARCHITECTURE ✦ TRIPORA DISCOVERY</span>
            </div>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#FFFDFE] tracking-tight max-w-xl">
              Cinematic Journeys. Intelligently Curated.
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#E8CBD8]/70 max-w-md font-light leading-relaxed">
            Autonomous itineraries, seasonal atmospheric timing, and authentic local sanctuaries orchestrated into unforgettable travel experiences.
          </p>
        </div>

        {/* 9-Card Asymmetric Bento Grid matching exact reference layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          
          {/* ================================================================= */}
          {/* COLUMN 1: LEFT COLUMN (Cards 1 & 2)                               */}
          {/* ================================================================= */}
          <div className="lg:col-span-3 flex flex-col gap-5 sm:gap-6">
            
            {/* Card 1: Top Left (Sakura Season / Peak Bloom Progress Gauge) */}
            <div className="bento-card bento-card-glass p-6 sm:p-7 flex flex-col justify-between h-[370px] sm:h-[390px]">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm tracking-wide text-[#FFFDFE]">
                  SAKURA SEASON
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FF6FAE]/15 border border-[#FF6FAE]/30 text-[10px] font-mono text-[#FFD1E3]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6FAE] animate-pulse" />
                  SPRING
                </span>
              </div>

              {/* Circular Gauge Center */}
              <div className="flex flex-col items-center justify-center my-auto py-2">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="rgba(255, 209, 227, 0.12)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#FF6FAE"
                      strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset="30.1"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-display font-extrabold text-2xl text-[#FFFDFE] leading-tight">
                      88%
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#FFD1E3]/80">
                      peak bloom
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Stat */}
              <div>
                <div className="font-display font-extrabold text-3xl sm:text-4xl text-[#FFFDFE] tracking-tight">
                  2.4K
                </div>
                <div className="text-xs text-[#E8CBD8]/75 font-medium mt-1">
                  Curated Expeditions in Bloom
                </div>
              </div>
            </div>

            {/* Card 2: Bottom Left (Immersive Cultural Encounters / Two Capsules) */}
            <div className="bento-card bento-card-glass p-6 sm:p-7 flex flex-col justify-between h-[370px] sm:h-[390px]">
              <div>
                <h3 className="font-display font-bold text-lg sm:text-xl text-[#FFFDFE] tracking-tight leading-snug">
                  Immersive Cultural Encounters
                </h3>
                <p className="text-[11px] text-[#E8CBD8]/70 mt-1">
                  Walking ancient lantern corridors and historic tea villas.
                </p>
              </div>

              {/* Two Vertical Rounded Capsules/Pills */}
              <div className="relative w-full h-[195px] flex items-center justify-center gap-3 mt-3">
                {/* Left Capsule Pill: Tea Villa */}
                <div className="relative flex-1 h-full rounded-[22px] overflow-hidden border border-white/15 shadow-inner group">
                  <Image
                    src="/tripora-culture.jpg"
                    alt="Traditional Kyoto tea house veranda with cherry blossoms"
                    fill
                    className="object-cover object-left group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#09080B]/90 via-transparent to-transparent" />
                  <span className="absolute bottom-2.5 left-2.5 text-[9px] font-mono tracking-wider uppercase text-[#FFD1E3]">
                    TEA VILLA
                  </span>
                </div>

                {/* Right Capsule Pill: Bamboo Twilight */}
                <div className="relative flex-1 h-full rounded-[22px] overflow-hidden border border-white/15 shadow-inner group">
                  <Image
                    src="/tripora-culture.jpg"
                    alt="Lantern-lit Arashiyama bamboo forest corridor"
                    fill
                    className="object-cover object-right group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#09080B]/90 via-transparent to-transparent" />
                  <span className="absolute bottom-2.5 left-2.5 text-[9px] font-mono tracking-wider uppercase text-[#FFD1E3]">
                    BAMBOO
                  </span>
                </div>

                {/* Floating mini compass badge */}
                <div className="absolute -bottom-2 -left-1 w-7 h-7 rounded-full border border-white/20 bg-[#FF6FAE] flex items-center justify-center text-[10px] font-bold text-[#351D32] shadow-md">
                  ✦
                </div>
              </div>
            </div>

          </div>

          {/* ================================================================= */}
          {/* COLUMN 2: CENTER COLUMN (Cards 3, 4, 5, 6, 7)                     */}
          {/* ================================================================= */}
          <div className="lg:col-span-6 flex flex-col gap-5 sm:gap-6">
            
            {/* Top Sub-Row: Cards 3 & 4 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              
              {/* Card 3: Top-Left Center (4.875M with Heart Icon) */}
              <div className="bento-card bento-card-glass p-6 sm:p-7 flex flex-col justify-between h-[155px]">
                <div className="flex items-center justify-between">
                  <span className="font-display font-extrabold text-3xl sm:text-4xl text-[#FFFDFE] tracking-tight">
                    4.875M
                  </span>
                  <span className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#FF6FAE] text-base">
                    ♥
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-semibold text-[#E8CBD8]/80">
                  Cinematic Journeys Explored
                </div>
              </div>

              {/* Card 4: Top-Right Center (Global Explorers 57K +18%) */}
              <div className="bento-card bento-card-glass p-6 sm:p-7 flex flex-col justify-between h-[155px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-mono tracking-wider uppercase text-[#E8CBD8]/70">
                    GLOBAL EXPLORERS
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FF6FAE]/20 border border-[#FF6FAE]/40 text-[#FFD1E3] text-[11px] font-bold">
                    +18% Spring
                  </span>
                </div>
                <div className="font-display font-extrabold text-3xl sm:text-4xl text-[#FFFDFE] tracking-tight">
                  57K
                </div>
              </div>

            </div>

            {/* Card 5: Centerpiece Hero Card with Kyoto Sakura & Floating Widgets */}
            <div className="bento-card bento-card-glass-glow relative h-[390px] sm:h-[430px] lg:h-[440px] overflow-hidden group">
              <Image
                src="/tripora-kyoto.jpg"
                alt="Kyoto traditional street with cherry blossoms at twilight"
                fill
                priority
                className="object-cover object-center filter brightness-[1.02] contrast-[1.03] group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#09080B]/90 via-[#09080B]/35 to-transparent pointer-events-none" />

              {/* Bottom Editorial Content */}
              <div className="absolute bottom-6 left-6 z-10 max-w-[70%]">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.12] backdrop-blur-md border border-white/20 text-[10px] font-mono tracking-wider uppercase text-[#FFD1E3] mb-2">
                  <span>FEATURED DESTINATION</span>
                  <span>✦</span>
                  <span>JAPAN</span>
                </div>
                <h3 className="font-display font-black text-3xl sm:text-4xl md:text-5xl text-[#FFFDFE] tracking-tight">
                  KYOTO
                </h3>
                <p className="text-xs sm:text-sm text-[#FFE8F1] italic font-light mt-1 text-shadow-sm">
                  &ldquo;Where tradition meets timeless beauty.&rdquo;
                </p>
              </div>

              {/* Floating Widget 1: Top Right (Bloom Forecast) */}
              <div className="absolute top-5 right-5 bg-[#140D17]/85 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/15 z-10 w-36 sm:w-44">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#FFD1E3] mb-2">
                  <span>BLOOM FORECAST</span>
                  <span className="text-[#FF9FC7]">🌸</span>
                </div>
                <div className="flex items-end justify-between h-9 sm:h-11 gap-1.5 px-1">
                  <div className="w-2.5 bg-[#FFD1E3]/50 rounded-t-sm h-[35%]" title="Early" />
                  <div className="w-2.5 bg-[#FF9FC7]/75 rounded-t-sm h-[75%]" title="Mid" />
                  <div className="w-2.5 bg-[#FF6FAE] rounded-t-sm h-[95%]" title="Peak" />
                  <div className="w-2.5 bg-[#FF9FC7]/75 rounded-t-sm h-[80%]" title="Late" />
                  <div className="w-2.5 bg-[#D9C7F2]/60 rounded-t-sm h-[45%]" title="Twilight" />
                </div>
              </div>

              {/* Floating Widget 2: Mid Left (Daily Itineraries) */}
              <div className="absolute top-1/2 -translate-y-12 left-5 bg-[#140D17]/85 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/15 z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-[#FF6FAE] flex items-center justify-center text-[#351D32] text-[10px] font-bold">
                    ✦
                  </span>
                  <div>
                    <div className="font-display font-extrabold text-xs sm:text-sm text-[#FFFDFE]">
                      26,807
                    </div>
                    <div className="text-[9px] text-[#E8CBD8]/70 font-mono">
                      Daily Itineraries
                    </div>
                  </div>
                </div>
                <svg className="w-24 h-5 stroke-[#FF6FAE] fill-none stroke-[2]" viewBox="0 0 100 20">
                  <path d="M0,15 Q25,5 50,12 T100,6" />
                </svg>
              </div>

              {/* Floating Widget 3: Bottom Right (Immersion Rate) */}
              <div className="absolute bottom-5 right-5 bg-[#140D17]/85 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/15 z-10 hidden sm:block">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[#FF6FAE] text-xs">♥</span>
                  <span className="font-display font-bold text-xs sm:text-sm text-[#FFFDFE]">
                    99.4%
                  </span>
                </div>
                <div className="text-[9px] text-[#E8CBD8]/70 font-medium">Immersion Index</div>
                <div className="text-[9px] font-bold text-[#FFD1E3] flex items-center gap-0.5 mt-0.5 font-mono">
                  <span>▲</span> Exceptional
                </div>
              </div>
            </div>

            {/* Bottom Sub-Row: Cards 6 & 7 */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-6">
              
              {/* Card 6: Bottom-Left Center (Atmosphere & Palette Swatches) */}
              <div className="sm:col-span-5 bento-card bento-card-glass p-6 sm:p-7 flex flex-col justify-between h-[170px]">
                <div>
                  <div className="font-display font-bold text-base text-[#FFFDFE]">
                    ATMOSPHERE
                  </div>
                  <div className="text-xs text-[#FFD1E3]/75 font-mono mt-0.5">
                    Bright Sakura Sunset
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-7 h-6 rounded-md bg-[#09080B] border border-white/20 shadow-sm" title="#09080B Deep Charcoal" />
                  <div className="w-7 h-6 rounded-md bg-[#351D32] border border-white/20 shadow-sm" title="#351D32 Muted Plum" />
                  <div className="w-7 h-6 rounded-md bg-[#FF6FAE] shadow-sm" title="#FF6FAE Rose" />
                  <div className="w-7 h-6 rounded-md bg-[#FFD1E3] shadow-sm" title="#FFD1E3 Light Blush" />
                </div>
              </div>

              {/* Card 7: Bottom-Right Center (Intelligent Curation & Paris Spring) */}
              <div className="sm:col-span-7 bento-card bento-card-glass p-6 sm:p-7 flex items-center justify-between h-[170px] relative overflow-hidden group">
                <div className="max-w-[62%] z-10">
                  <h4 className="font-display font-bold text-sm sm:text-base text-[#FFFDFE] leading-snug tracking-tight">
                    YOUR JOURNEY, INTELLIGENTLY CURATED
                  </h4>
                  <p className="text-xs text-[#E8CBD8]/75 font-light mt-1.5 leading-relaxed">
                    Tripora crafts cinematic, autonomous itineraries for the conscious soul.
                  </p>
                </div>
                <div className="relative w-28 sm:w-32 h-28 sm:h-32 -mr-3 sm:-mr-1 flex-shrink-0 rounded-2xl overflow-hidden border border-white/15">
                  <Image
                    src="/tripora-paris.jpg"
                    alt="Paris spring twilight with blooming sakura and Eiffel Tower"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#09080B]/60 via-transparent to-transparent" />
                </div>
              </div>

            </div>

          </div>

          {/* ================================================================= */}
          {/* COLUMN 3: RIGHT COLUMN (Cards 8 & 9)                              */}
          {/* ================================================================= */}
          <div className="lg:col-span-3 flex flex-col gap-5 sm:gap-6">
            
            {/* Card 8: Top Right (Collective of Travel Cinematographers + Swiss Alps) */}
            <div className="bento-card bento-card-glass p-6 sm:p-7 flex flex-col justify-between h-[480px] sm:h-[510px] lg:h-[520px] relative overflow-hidden group">
              <div>
                <h3 className="font-display font-bold text-base sm:text-lg text-[#FFFDFE] tracking-tight leading-snug">
                  Collective of Travel Cinematographers &amp; Guides
                </h3>
                
                {/* Overlapping Avatar Stack */}
                <div className="flex items-center -space-x-2 mt-4">
                  {["/preset-crystal.jpg", "/travel-poster.jpg", "/preset-cyberpunk.jpg"].map((src, i) => (
                    <div key={i} className="relative w-8 h-8 rounded-full border-2 border-[#150B17] overflow-hidden">
                      <Image src={src} alt="Travel guide" fill className="object-cover" />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-[#150B17] bg-[#351D32] text-[10px] font-bold text-[#FFD1E3] flex items-center justify-center">
                    +24
                  </div>
                </div>
              </div>

              {/* Daily Expeditions Metric */}
              <div className="my-2">
                <div className="text-[10px] uppercase font-mono tracking-wider text-[#FF9FC7]">
                  DAILY DEPARTURES
                </div>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <span className="font-display font-extrabold text-3xl sm:text-4xl text-[#FFFDFE] tracking-tight">
                    54
                  </span>
                  <span className="text-xs font-bold text-[#FF6FAE]">
                    +40%
                  </span>
                </div>
              </div>

              {/* Swiss Alps Alpine Sanctuary Window */}
              <div className="relative w-full h-40 sm:h-44 rounded-2xl overflow-hidden border border-white/15 shadow-inner">
                <Image
                  src="/tripora-swiss.jpg"
                  alt="Swiss Alps Alpine lake at twilight with pink Alpenglow"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09080B]/80 via-transparent to-transparent" />
                <span className="absolute bottom-2.5 left-2.5 text-[9px] font-mono tracking-wider uppercase text-[#FFD1E3]">
                  SWISS ALPS ✦ 2,450M
                </span>
              </div>
            </div>

            {/* Card 9: Bottom Right (TRIPORA Emblem & Travel Beyond the Ordinary) */}
            <div className="bento-card bento-card-glass p-6 sm:p-7 flex flex-col items-center justify-center text-center h-[230px] sm:h-[250px] lg:h-[260px]">
              <div className="relative w-16 h-16 mb-3">
                <svg className="w-full h-full text-[#FF9FC7]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5">
                  <circle cx="50" cy="35" r="22" strokeOpacity="0.85" />
                  <circle cx="35" cy="65" r="22" strokeOpacity="0.85" />
                  <circle cx="65" cy="65" r="22" strokeOpacity="0.85" />
                </svg>
              </div>
              <div className="font-display font-black text-2xl tracking-[0.25em] text-[#FFFDFE] uppercase">
                TRIPORA
              </div>
              <div className="text-[10px] font-mono tracking-widest text-[#FF9FC7] uppercase mt-1">
                TRAVEL BEYOND THE ORDINARY
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>

    {/* ========================================================================= */}
    {/* SECTION 3: TRIPORA AGRA DESTINATION EXPLORER (Scroll-Controlled 360° Taj) */}
    {/* ========================================================================= */}
    <AgraDestinationExplorer />

    {/* ========================================================================= */}
    {/* TRIPORA GLOBAL LUXURY FOOTER                                              */}
    {/* ========================================================================= */}
    <footer className="relative z-30 w-full bg-[#08070A] border-t border-white/[0.08] py-14 sm:py-20 px-6 sm:px-10 lg:px-12 text-[#E8CBD8]/80">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-display font-black text-2xl tracking-[0.2em] uppercase text-[#FFFDFE]">
              TRIPORA
            </span>
            <span className="text-[10px] font-mono text-[#FF9FC7] px-2 py-0.5 rounded-full bg-[#FF9FC7]/10 border border-[#FF9FC7]/20 uppercase">
              STUDIO EDITION
            </span>
          </div>
          <p className="text-xs text-[#E8CBD8]/70 max-w-sm font-light">
            Architecting next-generation cinematic travel experiences with AI-driven discovery, atmospheric light intelligence, and immersive spatial exploration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:gap-10 text-xs font-mono tracking-widest uppercase">
          <a href="#destinations" className="hover:text-[#FF9FC7] transition-colors">
            Destinations
          </a>
          <a href="#experiences" className="hover:text-[#FF9FC7] transition-colors">
            Experiences
          </a>
          <a href="#explore" className="hover:text-[#FF9FC7] transition-colors">
            Agra Explorer
          </a>
          <span className="text-white/20">|</span>
          <span className="text-[#FFD1E3]">© 2026 TRIPORA EXPEDITIONS</span>
        </div>
      </div>
    </footer>
  </main>
  );
}
