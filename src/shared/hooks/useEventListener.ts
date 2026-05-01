// src/shared/hooks/useEventListener.ts
import { useEffect, useRef, useLayoutEffect } from 'react';

type Target = Window | Document | HTMLElement;

/**
 * @ai_context: F14 - Event Listener Cleanup & Consistency
 * Custom hook to manage event listeners with proper cleanup and stable handler references.
 */
export function useEventListener<
  T extends Target,
  K extends T extends Window ? keyof WindowEventMap
              : T extends Document ? keyof DocumentEventMap
              : keyof HTMLElementEventMap
>(
  target: T | null,
  eventName: K | string,
  handler: (event: Event) => void,
  enabled: boolean = true,
  options?: AddEventListenerOptions
): void {
  // Stable ref for handler to avoid unnecessary re-subscriptions when handler re-renders
  const handlerRef = useRef(handler);
  
  useLayoutEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled || !target) return;
    
    // Stable wrapper that calls the current version of the handler stored in the ref
    const stableListener = (e: Event) => handlerRef.current(e);
    
    target.addEventListener(eventName as string, stableListener, options);
    
    // Cleanup ensures listener is removed when dependency changes or component unmounts
    return () => {
      target.removeEventListener(eventName as string, stableListener, options);
    };
  }, [target, eventName, enabled, options]);
}
