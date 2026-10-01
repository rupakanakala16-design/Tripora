"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

interface MustSeeDestination {
  id: string;
  name: string;
  category: string;
  location: string;
  image: string;
  tag: string;
  summary: string;
  timing: string;
  entryFee: string;
  bestAngle: string;
  distance: string;
}

const MUST_SEE_DESTINATIONS: MustSeeDestination[] = [
  {
    id: "agra-fort",
    name: "Agra Fort",
    category: "UNESCO World Heritage Site",
    location: "Rajakbazar, Agra",
    image: "/destinations/agra-fort.jpg",
    tag: "Red Sandstone Citadel",
    distance: "2.5 km from Taj Mahal",
    summary:
      "A colossal 16th-century fortress of red sandstone commanding the Yamuna River. Once the imperial seat of the Mughal emperors before the capital shifted to Delhi.",
    timing: "06:00 AM – 06:00 PM",
    entryFee: "₹650 (Foreign) / ₹50 (Indian)",
    bestAngle: "Amar Singh Gate & Musamman Burj balcony overlooking Taj Mahal",
  },
  {
    id: "itmad-ud-daulah",
    name: "Itmad-ud-Daulah",
    category: "Baby Taj",
    location: "Moti Bagh",
    image: "/destinations/itmad-ud-daulah.jpg",
    tag: "Jewel Box Inlay",
    distance: "4.1 km from Taj Mahal",
    summary:
      "Often hailed as the exquisite architectural draft for the Taj Mahal. Built by Queen Nur Jahan, featuring pure Rajasthan white marble adorned with delicate pietra dura inlays.",
    timing: "06:00 AM – 06:00 PM",
    entryFee: "₹310 (Foreign) / ₹30 (Indian)",
    bestAngle: "Central river garden reflection walkway under golden hour light",
  },
  {
    id: "mehtab-bagh",
    name: "Mehtab Bagh",
    category: "Taj Mahal Viewpoint",
    location: "Yamuna River",
    image: "/destinations/mehtab-bagh.jpg",
    tag: "Moonlight River Vista",
    distance: "1.8 km from Taj Mahal",
    summary:
      "The fabled Charbagh botanical sanctuary positioned directly opposite the Taj Mahal across the calm Yamuna River. The premier viewpoint for watching sunset colors transform the ivory marble.",
    timing: "06:00 AM – 06:30 PM",
    entryFee: "₹300 (Foreign) / ₹25 (Indian)",
    bestAngle: "Riverside sandstone terrace at twilight as the monument glows",
  },
  {
    id: "fatehpur-sikri",
    name: "Fatehpur Sikri",
    category: "Historic City",
    location: "Fatehpur Sikri",
    image: "/destinations/fatehpur-sikri.jpg",
    tag: "Imperial Mughal Capital",
    distance: "36 km from Agra",
    summary:
      "An exceptionally preserved 16th-century Mughal red sandstone imperial capital founded by Emperor Akbar. Home to the towering Buland Darwaza ('Gate of Magnificence') and serene white marble courtyards.",
    timing: "06:00 AM – 06:00 PM",
    entryFee: "₹610 (Foreign) / ₹50 (Indian)",
    bestAngle: "Buland Darwaza flight of stairs and Diwan-i-Khas central column",
  },
  {
    id: "sadar-bazaar",
    name: "Sadar Bazaar",
    category: "Local Market",
    location: "Agra",
    image: "/destinations/sadar-bazaar.jpg",
    tag: "Artisan Crafts & Spices",
    distance: "3.2 km from Taj Mahal",
    summary:
      "The pulsating cultural heart of Agra. Lined with artisan leather workshops, authentic Agra Petha sweet confectioners, hand-carved marble inlay ateliers, and glowing brass lantern bazaars.",
    timing: "11:30 AM – 09:30 PM (Closed Tuesdays)",
    entryFee: "Free Public Access",
    bestAngle: "Central lantern-lit street corridor during dusk twilight",
  },
];

const TOTAL_TAJ_FRAMES = 120;

export default function AgraDestinationExplorer() {
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [selectedDestination, setSelectedDestination] = useState<MustSeeDestination | null>(null);

  // Canvas & Frame Engine Refs
  const outerContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>(new Array(TOTAL_TAJ_FRAMES).fill(null));
  const loadingSetRef = useRef<Set<number>>(new Set());
  const currentFrameRef = useRef<number>(0);
  const currentSpeedRef = useRef<number>(0.12);
  const scrollVelocityRef = useRef<number>(0);
  const lastScrollYRef = useRef<number>(0);
  const lastScrollTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const lastDrawnIndexRef = useRef<number>(-1);
  const isVisibleRef = useRef<boolean>(true);
  const dimsRef = useRef<{ w: number; h: number; dpr: number }>({ w: 0, h: 0, dpr: 1 });

  // Helper: Build frame url for Taj Mahal WebP frames
  const getFrameUrl = useCallback((index: number) => {
    const padded = String(index + 1).padStart(3, "0");
    return `/taj-frames/taj-frame-${padded}.webp`;
  }, []);

  // Update cached canvas dimensions on resize only (avoids layout thrashing)
  const updateDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;

    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    dimsRef.current = { w, h, dpr };
  }, []);

    // Draw Taj Mahal frame with high DPI and reference-accurate framing:
    // Fits dome with sky above, all minarets within card bounds, and pool leading to bottom
    const drawTajFrame = useCallback((img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      const { w, h, dpr } = dimsRef.current;
      if (w === 0 || h === 0) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.clearRect(0, 0, w, h);

      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;

      if (imgW > 0 && imgH > 0) {
        // Monument occupies ~81% of frame width (minaret to minaret = ~1560px).
        // By scaling drawW to w * 1.16, the entire monument spans ~94% of card width,
        // fitting minarets cleanly with generous margins and no vertical hard edges.
        const scale = (w * 1.16) / imgW;
        const drawW = imgW * scale;
        const drawH = imgH * scale;

        // Center horizontally
        const x = (w - drawW) / 2;
        // Align bottom pool with bottom edge of card
        const y = h - drawH;

        ctx.drawImage(img, x, y, drawW, drawH);
      }

      ctx.restore();
    }, []);

    // Render target frame or nearest loaded fallback (no black screens)
    const renderFrameIndex = useCallback(
      (index: number) => {
        const clamped = Math.max(0, Math.min(TOTAL_TAJ_FRAMES - 1, Math.round(index)));
        const direct = framesRef.current[clamped];

        if (direct && direct.complete && direct.naturalWidth > 0) {
          drawTajFrame(direct);
          lastDrawnIndexRef.current = clamped;
          return;
        }

        // Outward search for closest available frame
        for (let offset = 1; offset < TOTAL_TAJ_FRAMES; offset++) {
          const lower = clamped - offset;
          if (lower >= 0) {
            const lImg = framesRef.current[lower];
            if (lImg && lImg.complete && lImg.naturalWidth > 0) {
              drawTajFrame(lImg);
              lastDrawnIndexRef.current = lower;
              return;
            }
          }
          const upper = clamped + offset;
          if (upper < TOTAL_TAJ_FRAMES) {
            const uImg = framesRef.current[upper];
            if (uImg && uImg.complete && uImg.naturalWidth > 0) {
              drawTajFrame(uImg);
              lastDrawnIndexRef.current = upper;
              return;
            }
          }
        }
      },
      [drawTajFrame]
    );

    // Progressive frame loader with off-thread asynchronous decode
    const loadSingleFrame = useCallback(
      (idx: number, onLoaded?: () => void) => {
        if (idx < 0 || idx >= TOTAL_TAJ_FRAMES) return;
        if (framesRef.current[idx] || loadingSetRef.current.has(idx)) return;

        loadingSetRef.current.add(idx);
        const img = new window.Image();
        img.src = getFrameUrl(idx);

        const handleReady = () => {
          framesRef.current[idx] = img;
          loadingSetRef.current.delete(idx);
          if (onLoaded) onLoaded();

          const currentTarget = Math.round(currentFrameRef.current);
          if (currentTarget === idx && lastDrawnIndexRef.current !== idx) {
            renderFrameIndex(idx);
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
          loadingSetRef.current.delete(idx);
        };

        if (typeof img.decode === "function") {
          img.decode().then(onDone).catch(onDone);
        }
      },
      [getFrameUrl, renderFrameIndex]
    );

    // Priority preloader around current scroll angle (+/- 10 frames)
    const prioritizeFramesAround = useCallback(
      (centerIndex: number) => {
        const radius = 10;
        loadSingleFrame(centerIndex);
        for (let r = 1; r <= radius; r++) {
          loadSingleFrame(centerIndex + r);
          loadSingleFrame(centerIndex - r);
        }
      },
      [loadSingleFrame]
    );

    // Wake loop helper - continuous auto-rotation with velocity-based scroll influence
    const wakeLoop = useCallback(() => {
      if (!rafIdRef.current && isVisibleRef.current) {
        const loop = () => {
          if (!isVisibleRef.current) {
            rafIdRef.current = null;
            return;
          }

          // 1. Smoothly decay scroll velocity to 0 when user is not actively scrolling
          scrollVelocityRef.current *= 0.91;
          if (Math.abs(scrollVelocityRef.current) < 0.003) {
            scrollVelocityRef.current = 0;
          }

          // 2. Target rotation speed combines base slow automatic rotation + scroll velocity
          const targetSpeed = 0.12 + scrollVelocityRef.current;

          // 3. Smoothly lerp actual speed toward target speed (damping & acceleration)
          currentSpeedRef.current += (targetSpeed - currentSpeedRef.current) * 0.14;

          // 4. Advance frame with continuous modulo wraparound (NEVER resets to 0)
          let nextFrame = currentFrameRef.current + currentSpeedRef.current;
          while (nextFrame >= TOTAL_TAJ_FRAMES) {
            nextFrame -= TOTAL_TAJ_FRAMES;
          }
          while (nextFrame < 0) {
            nextFrame += TOTAL_TAJ_FRAMES;
          }
          currentFrameRef.current = nextFrame;

          // 5. Draw frame
          const frameToDraw = Math.round(currentFrameRef.current) % TOTAL_TAJ_FRAMES;
          if (frameToDraw !== lastDrawnIndexRef.current) {
            renderFrameIndex(frameToDraw);
          }

          rafIdRef.current = requestAnimationFrame(loop);
        };

        rafIdRef.current = requestAnimationFrame(loop);
      }
    }, [renderFrameIndex]);

    // Preload and Scroll Setup
    useEffect(() => {
      updateDimensions();

      // 1. Immediately load key milestone frames
      [0, 15, 30, 45, 60, 75, 90, 105, 119].forEach((f) => loadSingleFrame(f));
      loadSingleFrame(0, () => {
        renderFrameIndex(0);
      });

      // 2. Rapidly preload all frames in fast batches so all 120 frames are ready in memory
      let batchStart = 1;
      const preloadAll = () => {
        const batchEnd = Math.min(batchStart + 12, TOTAL_TAJ_FRAMES);
        for (let i = batchStart; i < batchEnd; i++) {
          loadSingleFrame(i);
        }
        batchStart = batchEnd;
        if (batchStart < TOTAL_TAJ_FRAMES) {
          setTimeout(preloadAll, 16);
        }
      };
      preloadAll();

      // 3. Scroll Listener: Influences rotation speed & direction based on scroll velocity
      const handleScroll = () => {
        const currentY = window.scrollY;
        const now = performance.now();
        const dt = Math.max(8, now - (lastScrollTimeRef.current || now));
        const dy = currentY - (lastScrollYRef.current || currentY);

        lastScrollYRef.current = currentY;
        lastScrollTimeRef.current = now;

        // Calculate scroll velocity (px / ms)
        const pxPerMs = dy / dt;

        // Influence factor:
        // scrolling down (dy > 0) -> rotates forward
        // scrolling up (dy < 0) -> rotates backward
        // faster scrolling -> faster rotation
        const influence = pxPerMs * 0.95;
        // Clamp influence between -2.6 and +2.6 frames/tick to keep animation crystal clear
        scrollVelocityRef.current = Math.max(-2.6, Math.min(2.6, influence));

        // Prioritize loading nearby frames in rotation direction
        const dir = influence >= 0 ? 1 : -1;
        const currentIdx = Math.round(currentFrameRef.current);
        for (let r = 1; r <= 8; r++) {
          loadSingleFrame((currentIdx + r * dir + TOTAL_TAJ_FRAMES) % TOTAL_TAJ_FRAMES);
        }

        wakeLoop();
      };

      window.addEventListener("scroll", handleScroll, { passive: true });

      // 4. Window Resize Handler with dimension caching
      let resizeTimer: NodeJS.Timeout | null = null;
      const handleResize = () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          updateDimensions();
          renderFrameIndex(Math.round(currentFrameRef.current) % TOTAL_TAJ_FRAMES);
        }, 50);
      };
      window.addEventListener("resize", handleResize, { passive: true });

      // 5. IntersectionObserver: Pause loop when off-screen, resume when in-view
      let observer: IntersectionObserver | null = null;
      if (typeof IntersectionObserver !== "undefined" && outerContainerRef.current) {
        observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            isVisibleRef.current = entry.isIntersecting;
            if (entry.isIntersecting) {
              lastScrollYRef.current = window.scrollY;
              lastScrollTimeRef.current = performance.now();
              wakeLoop();
            } else {
              if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
              }
            }
          },
          { threshold: 0.05 }
        );
        observer.observe(outerContainerRef.current);
      }

      return () => {
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleResize);
        if (resizeTimer) clearTimeout(resizeTimer);
        if (observer) observer.disconnect();
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      };
    }, [loadSingleFrame, renderFrameIndex, updateDimensions, wakeLoop]);

    // Pointer drag to rotate support (interactive 360° drag)
    const isDraggingRef = useRef<boolean>(false);
    const dragStartXRef = useRef<number>(0);

    const handlePointerDown = (e: React.PointerEvent) => {
      isDraggingRef.current = true;
      dragStartXRef.current = e.clientX;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartXRef.current;
      dragStartXRef.current = e.clientX;
      // Inject drag velocity into scrollVelocityRef
      scrollVelocityRef.current = -(dx / 4.5);
      wakeLoop();
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      isDraggingRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore pointer release errors
      }
    };

    return (
      <section
        id="explore"
        ref={outerContainerRef}
        className="relative w-full min-h-[92vh] lg:h-[100vh] overflow-hidden bg-[#0A070D] flex items-center justify-center py-4 sm:py-6 lg:py-4 px-3 sm:px-5 lg:px-7 text-[#FFF8FC]"
      >
        {/* ========================================================================= */}
        {/* ATMOSPHERIC SUNSET BEACH BACKDROP (SUBTLE MOOD, NOT DOMINANT)             */}
        {/* ========================================================================= */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <Image
            src="/destinations/agra-beach-sunset.jpg"
            alt="Agra tropical ocean sunset beach"
            fill
            priority
            quality={95}
            sizes="100vw"
            className="object-cover object-center filter brightness-[0.70] saturate-[1.12]"
          />
          {/* Deep atmospheric veil ensuring the beach stays a subtle background */}
          <div className="absolute inset-0 bg-[#0c0813]/55 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A070D] via-transparent to-[#0A070D] opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A070D]/40 via-transparent to-[#0A070D]/40" />
        </div>

        {/* ========================================================================= */}
        {/* MAIN TWO-PANEL COMPOSITION (PANELS OCCUPY ~92-96% OF VIEWPORT HEIGHT)     */}
        {/* ========================================================================= */}
        <div className="relative z-20 w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch h-full max-h-[820px] lg:h-[calc(100vh-3.5rem)]">
          
          {/* ============================================================= */}
          {/* LEFT PANEL: 60% Width (col-span-7) - Taj Mahal 3D Showcase    */}
          {/* ============================================================= */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="lg:col-span-7 rounded-[30px] sm:rounded-[36px] bg-[rgba(18,12,24,0.72)] backdrop-blur-2xl border border-[#F49AC3]/30 shadow-[0_30px_90px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.14),0_0_35px_rgba(244,154,195,0.06)] p-6 sm:p-7 lg:p-8 flex flex-col justify-between relative overflow-hidden group select-none cursor-grab active:cursor-grabbing min-h-[540px] lg:min-h-0"
          >
            {/* 360° Taj Mahal Canvas Animation Engine - Seamlessly blended into sunset clouds */}
            <canvas
              ref={canvasRef}
              style={{
                maskImage: "linear-gradient(to bottom, transparent 0%, transparent 16%, black 36%, black 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, transparent 16%, black 36%, black 100%)",
              }}
              className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
            />

            {/* Subtle Atmospheric Vignette over Canvas for Text Contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(18,12,24,0.65)] via-[rgba(18,12,24,0.15)] to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[rgba(18,12,24,0.60)] via-transparent to-transparent pointer-events-none z-10" />

            {/* Top Left: Editorial Identity */}
            <div className="relative z-20 pointer-events-none">
              {/* Eyebrow with pink accent bar */}
              <div className="flex items-center gap-2 mb-2 sm:mb-2.5">
                <span className="w-0.5 h-3.5 bg-[#FF78B4] rounded-full" />
                <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#F49AC3] font-semibold">
                  TRIPORA DESTINATION GUIDE
                </span>
              </div>

              {/* Big Bold Headline: AGRA */}
              <h2 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-[-0.035em] leading-[0.92] text-white mb-2 drop-shadow-sm">
                AGRA
              </h2>

              {/* Country line: India with Indian Flag */}
              <div className="flex items-center gap-2.5 text-lg sm:text-xl font-semibold text-white mb-2.5">
                <span>India</span>
                <span className="w-5 h-3.5 rounded-[3px] overflow-hidden inline-flex border border-white/20 shadow-sm">
                  <svg className="w-full h-full" viewBox="0 0 30 20">
                    <rect width="30" height="6.67" fill="#FF9933" />
                    <rect y="6.67" width="30" height="6.67" fill="#FFFFFF" />
                    <rect y="13.33" width="30" height="6.67" fill="#138808" />
                    <circle cx="15" cy="10" r="2.2" fill="none" stroke="#000080" strokeWidth="0.7" />
                  </svg>
                </span>
              </div>

              {/* Short Editorial Summary */}
              <p className="text-xs sm:text-sm text-white/90 font-light leading-relaxed max-w-sm mb-3.5 drop-shadow-sm">
                Home to the magnificent Taj Mahal, a timeless symbol of love, architecture and unforgettable beauty.
              </p>

              {/* Frosted Weather Pill */}
              <div className="pointer-events-auto inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.12] backdrop-blur-md border border-white/20 text-xs text-white shadow-sm">
                <span className="text-base leading-none">⛅</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold text-white">28°C</span>
                  <span className="text-[11px] text-white/80">Partly Sunny</span>
                </div>
              </div>
            </div>

            {/* Bottom: Floating Taj Mahal Information Card (Exact Reference Pill) */}
            <div className="relative z-20 w-full mt-auto pt-4 pointer-events-none">
              <div className="pointer-events-auto w-full p-2.5 sm:p-3 rounded-full bg-[rgba(26,14,32,0.82)] backdrop-blur-2xl border border-[#F49AC3]/40 shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex items-center justify-between gap-3">
                {/* Left: Glowing Sakura Pin Icon + Details */}
                <div className="flex items-center gap-3 min-w-0 pl-1">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-[#9C326A] to-[#E2669C] flex items-center justify-center text-white flex-shrink-0 shadow-[0_0_15px_rgba(226,102,156,0.4)]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-bold text-sm sm:text-base text-white tracking-tight truncate">
                        Taj Mahal
                      </h4>
                      <span className="text-[9px] font-mono text-[#FFAFD2] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#6B224F]/70 border border-[#FF78B4]/30 font-semibold whitespace-nowrap">
                        7 WONDERS
                      </span>
                    </div>
                    <p className="text-[11px] text-white/75 truncate mt-0.5">
                      Dharmapuri, Forest Colony, Agra
                    </p>
                  </div>
                </div>

                {/* Right: Favorite Heart & Navigation Icons */}
                <div className="flex items-center gap-2 flex-shrink-0 pr-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLiked(!isLiked);
                    }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border transition-all duration-300 ${
                      isLiked
                        ? "bg-[#FF78B4]/30 border-[#FF78B4] text-[#FF78B4] shadow-[0_0_12px_rgba(255,120,180,0.5)]"
                        : "bg-white/[0.08] hover:bg-white/[0.18] border-white/20 text-white"
                    }`}
                    title={isLiked ? "Saved to favorites" : "Save destination"}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${isLiked ? "scale-110 fill-[#FF78B4]" : "fill-none"}`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>

                  <a
                    href="https://maps.google.com/?q=Taj+Mahal+Agra"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/20 text-white flex items-center justify-center transition-all duration-200 group"
                    title="Open navigation in Google Maps"
                  >
                    <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* RIGHT PANEL: 40% Width (col-span-5) - Must-See In Agra Glass Panel */}
          {/* ============================================================= */}
          <div className="lg:col-span-5 rounded-[30px] sm:rounded-[36px] bg-[rgba(18,12,24,0.72)] backdrop-blur-2xl border border-[#F49AC3]/30 shadow-[0_30px_90px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.14),0_0_35px_rgba(244,154,195,0.06)] p-6 sm:p-7 flex flex-col justify-between overflow-hidden">
            
            {/* Header */}
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF78B4] animate-pulse" />
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#FF78B4] font-semibold">
                  REGIONAL EXPEDITIONS
                </span>
              </div>
              <h3 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight mb-1.5 drop-shadow-sm">
                MUST-SEE IN AGRA
              </h3>
              <p className="text-xs sm:text-[13px] text-white/80 font-light leading-relaxed">
                Beyond the crown jewel, explore monumental red sandstone fortresses, sacred riverside gardens, and authentic artisan quarters.
              </p>
            </div>

            {/* 5 Vertical Destination Cards (Exact Reference List) */}
            <div className="flex flex-col gap-2 sm:gap-2.5 flex-1 justify-between">
              {MUST_SEE_DESTINATIONS.map((dest) => (
                <div
                  key={dest.id}
                  onClick={() => setSelectedDestination(dest)}
                  className="group flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[rgba(26,16,33,0.55)] hover:bg-[rgba(38,22,48,0.85)] border border-[#F49AC3]/20 hover:border-[#FF78B4]/50 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(244,154,195,0.15)] cursor-pointer"
                >
                  {/* Small thumbnail image */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-white/15 shadow-inner">
                    <Image
                      src={dest.image}
                      alt={dest.name}
                      fill
                      sizes="70px"
                      className="object-cover group-hover:scale-108 transition-transform duration-500"
                    />
                  </div>

                  {/* Middle: Details */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h4 className="font-display font-bold text-sm text-white group-hover:text-[#F49AC3] transition-colors truncate leading-snug">
                      {dest.name}
                    </h4>
                    <p className="text-[11px] font-mono text-[#F49AC3] font-medium truncate mt-0.5">
                      {dest.category}
                    </p>
                    <p className="text-[11px] text-white/70 flex items-center gap-1 truncate mt-0.5">
                      <svg className="w-3 h-3 text-[#FF78B4]/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{dest.location}</span>
                    </p>
                  </div>

                  {/* Right: Clean Outline Bookmark Icon matching reference */}
                  <div className="text-white/60 group-hover:text-white flex items-center justify-center flex-shrink-0 transition-colors pr-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE DESTINATION SPOTLIGHT MODAL                                 */}
      {/* ========================================================================= */}
      {selectedDestination && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-200"
          onClick={() => setSelectedDestination(null)}
        >
          <div
            className="relative w-full max-w-xl bg-[#1c0f1e]/95 border border-[#FFD1E3]/30 rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.95)] text-left animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Corner Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9FC7]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Image Header */}
            <div className="relative w-full h-52 sm:h-60 rounded-2xl overflow-hidden border border-white/15 mb-5 shadow-lg">
              <Image
                src={selectedDestination.image}
                alt={selectedDestination.name}
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1c0f1e] via-[#1c0f1e]/20 to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#FFD1E3] bg-[#09080B]/70 px-2.5 py-1 rounded-md border border-white/10 backdrop-blur-md">
                    {selectedDestination.category}
                  </span>
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-[#FFFDFE] tracking-tight mt-1.5 drop-shadow-md">
                    {selectedDestination.name}
                  </h3>
                </div>
                
                <span className="text-xs font-mono text-[#FF9FC7] bg-[#140D17]/80 px-2.5 py-1 rounded-full border border-[#FF9FC7]/30 backdrop-blur-md">
                  {selectedDestination.distance}
                </span>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedDestination(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-xs backdrop-blur-md transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-[#FFFDFE]/90 leading-relaxed font-light mb-5">
              {selectedDestination.summary}
            </p>

            {/* Practical Travel Telemetry */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono mb-5">
              <div>
                <span className="text-[#E8CBD8]/70 block text-[10px] uppercase">Visiting Hours</span>
                <span className="text-[#FFFDFE] font-semibold">{selectedDestination.timing}</span>
              </div>
              <div>
                <span className="text-[#E8CBD8]/70 block text-[10px] uppercase">Entry Ticket</span>
                <span className="text-[#FF9FC7] font-semibold">{selectedDestination.entryFee}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-white/5">
                <span className="text-[#E8CBD8]/70 block text-[10px] uppercase">Optimal Photo Angle</span>
                <span className="text-[#FFD1E3] text-[11px]">{selectedDestination.bestAngle}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  selectedDestination.name + " " + selectedDestination.location
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tripora-cta !py-2.5 !px-5 !text-xs"
              >
                <span>Navigate on Google Maps →</span>
              </a>

              <button
                onClick={() => setSelectedDestination(null)}
                className="text-xs font-semibold uppercase tracking-wider text-[#E8CBD8] hover:text-white"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}
