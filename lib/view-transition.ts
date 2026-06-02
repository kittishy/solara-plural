"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Shared-element & cross-screen transitions via the View Transitions API —
 * the web translation of React Navigation's shared element transitions.
 *
 * The browser snapshots the old DOM, runs our navigation, snapshots the new
 * DOM, and tweens between any nodes that share a `view-transition-name`.
 * So a persona avatar tagged `solara-hero` in a list will visually *grow*
 * into the avatar tagged `solara-hero` on the profile screen.
 *
 * Unsupported browsers (Firefox, older Safari) just navigate instantly —
 * the callback still runs, nothing breaks.
 */

type StartViewTransition = (cb: () => void | Promise<void>) => {
  finished: Promise<void>;
};

function supportsViewTransitions(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof (document as unknown as { startViewTransition?: unknown })
      .startViewTransition === "function"
  );
}

/** Run a DOM-mutating callback inside a view transition when available. */
export function withViewTransition(callback: () => void | Promise<void>) {
  if (!supportsViewTransitions()) {
    void callback();
    return;
  }
  const start = (document as unknown as { startViewTransition: StartViewTransition })
    .startViewTransition;
  start(() => callback());
}

/** The shared view-transition-name used for hero avatar morphs. */
export const HERO_AVATAR = "solara-hero";

/**
 * Tag an element as the hero for the *next* navigation, then clear it once the
 * transition settles so the name is free for the next interaction (two live
 * nodes sharing a name is an error).
 */
export function tagHero(el: HTMLElement | null, name: string = HERO_AVATAR) {
  if (!el || !supportsViewTransitions()) return;
  el.style.setProperty("view-transition-name", name);
  const clear = () => {
    el.style.removeProperty("view-transition-name");
  };
  // Clear after the transition would have run; generous to cover the morph.
  window.setTimeout(clear, 500);
}

/**
 * Router whose `push` wraps Next's client navigation in a view transition.
 * Pass the originating element to also tag it as the shared hero.
 */
export function useViewTransitionRouter() {
  const router = useRouter();

  const push = useCallback(
    (href: string, opts?: { hero?: HTMLElement | null; heroName?: string }) => {
      if (opts?.hero) tagHero(opts.hero, opts.heroName);
      withViewTransition(() => {
        router.push(href);
      });
    },
    [router]
  );

  return { push };
}
