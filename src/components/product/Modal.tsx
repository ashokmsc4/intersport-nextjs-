"use client";

import { useEffect, useRef } from "react";

/** Centered dialog with a backdrop; Escape and the × close it, and focus moves inside. */
export function Modal({
  title,
  closeLabel,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label={closeLabel} tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div
        className={`relative flex max-h-[92vh] w-full flex-col bg-white shadow-xl ${wide ? "max-w-5xl" : "max-w-3xl"}`}
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 sm:px-10 sm:pt-10">
          <h2 className="text-2xl font-bold tracking-wide sm:text-3xl">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-me-2 p-2 text-3xl leading-none font-light text-neutral-500 hover:text-black"
          >
            ×
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-10">{children}</div>
        {footer && <footer className="flex justify-end px-6 pb-6 sm:px-10 sm:pb-10">{footer}</footer>}
      </div>
    </div>
  );
}
