"use client";
import { useState } from "react";
export type TabItem = { value: string; label: string; description?: string };
export function Tabs({ items, value, defaultValue = items[0]?.value, onChange }: { items: TabItem[]; value?: string; defaultValue?: string; onChange?: (value: string) => void }) {
  const [internalValue, setInternalValue] = useState(defaultValue); const activeValue = value ?? internalValue;
  return <div className="nb-tabs" role="tablist" aria-label="Selection">{items.map(item => { const active = item.value === activeValue; return <button key={item.value} className={`nb-tab ${active ? "is-active" : ""}`.trim()} type="button" role="tab" aria-selected={active} onClick={() => { setInternalValue(item.value); onChange?.(item.value); }}><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</button>; })}</div>;
}
