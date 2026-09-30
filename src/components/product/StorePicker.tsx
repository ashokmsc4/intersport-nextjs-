"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { PickupStore } from "@/lib/magento/pickup";
import { ProductImage } from "@/components/ProductImage";
import { BagIcon } from "@/components/icons";
import { Modal } from "./Modal";

/** "Please select a store": stores holding the chosen size, filterable by area. */
export function StorePicker({
  stores,
  current,
  summary,
  dict,
  onClose,
  onChoose,
}: {
  stores: PickupStore[];
  current: string;
  summary: {
    name: string;
    image: string | null;
    imageOptimized: boolean;
    color?: string;
    size?: string;
    qty: number;
  };
  dict: Dictionary["delivery"] & { size: string; color: string };
  onClose: () => void;
  onChoose: (storeId: string) => void;
}) {
  const [chosen, setChosen] = useState(current);
  const [area, setArea] = useState("");
  const areas = [...new Set(stores.map((s) => s.city).filter(Boolean))].sort();
  const shown = area ? stores.filter((s) => s.city === area) : stores;
  const d = dict;

  return (
    <Modal
      title={d.selectStore}
      closeLabel={d.close}
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={!chosen}
          onClick={() => onChoose(chosen)}
          className="min-w-48 border border-brand px-8 py-3 text-lg font-medium text-brand uppercase hover:bg-brand hover:text-white disabled:opacity-50"
        >
          {d.continue}
        </button>
      }
    >
      <div className="mb-8 flex items-center gap-6">
        <ProductImage
          src={summary.image}
          alt=""
          sizes="140px"
          optimized={summary.imageOptimized}
          className="size-28 shrink-0 bg-white sm:size-36"
        />
        <dl className="flex flex-col gap-2 text-sm tracking-wide">
          <dt className="sr-only">{summary.name}</dt>
          <dd className="text-base">{summary.name}</dd>
          {summary.color && (
            <div className="flex gap-3">
              <dt className="text-neutral-500">{d.color} :</dt>
              <dd>{summary.color}</dd>
            </div>
          )}
          <div className="flex gap-3">
            {summary.size && (
              <>
                <dt className="text-neutral-500">{d.size} :</dt>
                <dd className="border-e border-neutral-400 pe-3">{summary.size}</dd>
              </>
            )}
            <dt className="text-neutral-500">{d.qty} :</dt>
            <dd>{summary.qty}</dd>
          </div>
        </dl>
      </div>

      {areas.length > 1 && (
        <select
          aria-label={d.selectLocation}
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="mb-6 w-full border border-neutral-400 bg-white px-4 py-4 tracking-wide"
        >
          <option value="">{d.selectLocation}</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      )}

      <ul role="radiogroup" aria-label={d.storeChoices} className="flex flex-col gap-4">
        {shown.map((store) => (
          <li key={store.id}>
            <label
              className={`relative flex cursor-pointer flex-col gap-3 border px-6 py-6 text-sm tracking-wide ${chosen === store.id ? "border-sky-300 bg-sky-50" : "border-neutral-200 hover:border-neutral-400"}`}
            >
              <input
                type="radio"
                name="pickup-store"
                value={store.id}
                checked={chosen === store.id}
                onChange={() => setChosen(store.id)}
                className="sr-only"
              />
              <span className="flex items-start justify-between gap-4">
                <span className="text-base font-semibold">{store.name}</span>
                {chosen === store.id && <BagIcon />}
              </span>
              {store.hoursToday && <span className="text-base">{store.hoursToday}</span>}
              <span className="flex flex-col gap-1">
                {store.city && (
                  <span>
                    {d.area}: {store.city}
                  </span>
                )}
                {store.state && (
                  <span>
                    {d.governorate}: {store.state}
                  </span>
                )}
                {store.address && (
                  <span>
                    {d.address}: {store.address}
                  </span>
                )}
                {store.phone && (
                  <span>
                    {d.telephone}: <span dir="ltr">{store.phone}</span>
                  </span>
                )}
                {store.email && (
                  <span>
                    {d.email}: {store.email}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
