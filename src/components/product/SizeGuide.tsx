"use client";

import { useState } from "react";
import { Modal } from "./Modal";

/** "Size guide" link; the guide itself is Magento HTML shown in a sandboxed frame. */
export function SizeGuide({
  productId,
  label,
  closeLabel,
}: {
  productId: string;
  label: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-sm font-semibold tracking-wider text-brand uppercase underline underline-offset-4"
      >
        {label}
      </button>
      {open && (
        <Modal title={label} closeLabel={closeLabel} onClose={() => setOpen(false)} wide>
          <iframe
            title={label}
            src={`/api/size-guide/${productId}`}
            sandbox="allow-scripts"
            className="h-[70dvh] w-full border-0"
          />
        </Modal>
      )}
    </>
  );
}
