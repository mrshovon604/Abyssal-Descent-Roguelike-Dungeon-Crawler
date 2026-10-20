/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';
import { soundEngine } from '../audio/soundEngine';

interface PWAInstallButtonProps {
  compact?: boolean;
  onLaunchAppPlay?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  onLaunchAppPlay,
}) => {
  const { isInstallable, isInstalled, isAppMode, isIOS, install, activateAppMode } =
    usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Short, clean standalone URL (< 100 chars) so mobile browsers never fail with URI Too Long.
  // Same-origin localStorage automatically preserves the saved run and controller settings.
  const getCleanStandaloneUrl = () => {
    if (typeof window === 'undefined') return '/';
    try {
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('app', '1');
      return url.toString();
    } catch {
      return window.location.href.split('?')[0];
    }
  };

  const handleInstallClick = async () => {
    soundEngine.haptic(25);
    setStatusBanner(null);

    // 1. If browser native PWA install prompt is ready, trigger it immediately
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        if (onLaunchAppPlay) onLaunchAppPlay();
        return;
      }
    }

    // 2. Otherwise open the clean App Mode & Home Screen Installer sheet
    setShowGuideModal(true);
  };

  const handleInstantAppPlay = async () => {
    soundEngine.haptic(35);
    await activateAppMode();
    setStatusBanner('✅ App Mode Activated! Launching game...');
    setShowGuideModal(false);
    if (onLaunchAppPlay) {
      onLaunchAppPlay();
    }
  };

  const handleCopyDirectUrl = async () => {
    soundEngine.haptic(15);
    const cleanUrl = getCleanStandaloneUrl();
    try {
      await navigator.clipboard.writeText(cleanUrl);
      setCopiedLink(true);
      setStatusBanner('✅ App Link copied! Paste it in Chrome to add to Home Screen.');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      setStatusBanner(`App URL: ${cleanUrl}`);
    }
  };

  const handleNativeShare = async () => {
    soundEngine.haptic(20);
    const cleanUrl = getCleanStandaloneUrl();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Abyssal Descent — Roguelike App',
          text: 'Play Abyssal Descent in standalone mobile app mode:',
          url: cleanUrl,
        });
        return;
      } catch {}
    }
    await handleCopyDirectUrl();
  };

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-[11px] font-mono-stat normal-case shrink-0">
        <span>📲</span> Installed App
      </span>
    );
  }

  const modalContent = showGuideModal ? (
    <div
      onClick={() => setShowGuideModal(false)}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4 select-none normal-case text-stone-100 touch-pan-y"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-stone-950 border-2 border-amber-500/80 p-4 sm:p-5 shadow-[0_0_60px_rgba(0,0,0,0.95)] text-left flex flex-col gap-3.5 max-h-[88dvh] overflow-y-auto touch-pan-y"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2.5 border-b border-stone-800 pb-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-lg shrink-0">
              📲
            </div>
            <div className="min-w-0">
              <h3 className="font-cinzel text-sm sm:text-base font-bold text-amber-400 leading-tight truncate">
                Play as Mobile App
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Instant Console App Mode · Auto-Saved Offline
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowGuideModal(false)}
            className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-100 flex items-center justify-center text-sm cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* PRIMARY ACTION 1: Instant Play in App Mode (Always works immediately!) */}
        <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/50 p-3 space-y-2 shrink-0">
          <div className="text-xs font-bold text-emerald-300 flex items-center justify-between">
            <span>⚡ Option 1: Instant App Mode (Recommended)</span>
            {isAppMode && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono-stat">
                Active
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-300 leading-snug">
            Launch directly into full-viewport mobile console mode right now with your current joystick &amp; auto-saved progress.
          </p>
          <button
            onClick={handleInstantAppPlay}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-stone-950 font-cinzel font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🎮</span> Launch App Mode &amp; Play Now
          </button>
        </div>

        {/* PRIMARY ACTION 2: Native Home Screen Installation */}
        <div className="rounded-xl bg-stone-900/90 border border-stone-800 p-3 space-y-2.5 shrink-0">
          <div className="text-xs font-bold text-amber-400">
            📲 Option 2: Add Icon to Phone Home Screen
          </div>

          {isInstallable ? (
            <button
              onClick={async () => {
                soundEngine.haptic(30);
                const ok = await install();
                if (ok) {
                  setShowGuideModal(false);
                  if (onLaunchAppPlay) onLaunchAppPlay();
                }
              }}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-cinzel font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>📥</span> Install to Home Screen Now
            </button>
          ) : (
            <>
              <p className="text-[11px] text-stone-300 leading-snug">
                {isInIframe
                  ? 'Because you are inside the preview frame, open the direct app link in Chrome/Safari first, then tap "Add to Home screen" in your browser menu (⋮).'
                  : isIOS
                  ? 'Tap Share in Safari below, then select "Add to Home Screen".'
                  : 'Tap Chrome’s top-right menu (⋮) and select "Add to Home screen / Install app".'}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={getCleanStandaloneUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => soundEngine.haptic(20)}
                  className="min-h-[42px] py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-cinzel font-black text-[11px] uppercase tracking-wide active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 no-underline text-center shadow-md"
                >
                  <span>🌐</span> Open in Browser
                </a>

                <button
                  onClick={handleCopyDirectUrl}
                  className="min-h-[42px] py-2 px-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-amber-300 font-cinzel font-bold text-[11px] uppercase tracking-wide active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>📋</span> {copiedLink ? 'Copied!' : 'Copy App Link'}
                </button>
              </div>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="w-full min-h-[38px] py-1.5 px-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 font-mono-stat text-[11px] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>📤</span> Share / Send App to Phone
                </button>
              )}
            </>
          )}
        </div>

        {statusBanner && (
          <div className="rounded-lg bg-emerald-950/90 border border-emerald-500/60 px-3 py-2 text-[11px] font-mono-stat text-emerald-300 text-center shrink-0">
            {statusBanner}
          </div>
        )}

        <button
          onClick={() => setShowGuideModal(false)}
          className="w-full min-h-[40px] rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 font-mono-stat text-xs transition-all cursor-pointer shrink-0"
        >
          Close
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={
          compact
            ? `min-h-[34px] px-2.5 py-1 rounded-xl active:scale-95 text-[11px] font-cinzel font-black flex items-center gap-1 transition-all cursor-pointer normal-case shrink-0 ${
                isAppMode
                  ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
              }`
            : `min-h-[42px] px-4 py-2 rounded-xl active:scale-95 text-xs sm:text-sm font-cinzel font-black flex items-center gap-1.5 transition-all cursor-pointer normal-case shrink-0 ${
                isAppMode
                  ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-[0_0_18px_rgba(245,158,11,0.35)]'
              }`
        }
        title="Launch App Mode or Install to Home Screen"
      >
        <span>{isAppMode ? '📱' : '📲'}</span>
        <span>{isAppMode ? 'App Mode Ready' : 'Install App'}</span>
      </button>

      {typeof document !== 'undefined' && modalContent
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9990] pointer-events-none flex items-center gap-2 rounded-full bg-stone-950/95 border border-emerald-500/70 px-3 py-1 text-[11px] font-mono-stat text-emerald-300 shadow-xl">
      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      Offline Mode — Local Auto-Save Active
    </div>
  );
};
