"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { api } from "../../../lib/client/api";
import { normalizeTaxonomyName, productGroups, type ProductGroup, type TaxonomyKind } from "../../../lib/product-taxonomy";

type Option = { id: string; name: string; normalizedName: string; aliases: string[]; isDefault: boolean };

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return row[b.length];
}

export function rankTaxonomyOptions(options: Option[], rawQuery: string) {
  const query = normalizeTaxonomyName(rawQuery);
  if (!query) return options;
  const score = (option: Option) => {
    const terms = [option.normalizedName, ...option.aliases.map(normalizeTaxonomyName)];
    if (terms.some(term => term === query)) return 0;
    if (terms.some(term => term.startsWith(query))) return 1;
    if (terms.some(term => term.includes(query))) return 2;
    if (query.length < 4) return 99;
    const distance = Math.min(...terms.map(term => editDistance(term, query)));
    return distance <= Math.max(1, Math.floor(query.length * .22)) ? 3 + distance / 10 : 99;
  };
  return options.map(option => ({ option, score: score(option) })).filter(item => item.score < 99).sort((a, b) => a.score - b.score || a.option.name.localeCompare(b.option.name, "vi")).map(item => item.option);
}

function CreatableCombobox({ group, kind, value, onChange, label }: { group: ProductGroup; kind: TaxonomyKind; value: string; onChange: (value: string) => void; label: string }) {
  const id = useId(), listId = `${id}-list`;
  const [options, setOptions] = useState<Option[]>([]), [query, setQuery] = useState(value), [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle"), [active, setActive] = useState(0), [saving, setSaving] = useState(false);
  const composing = useRef(false);
  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => {
    let current = true; setState("loading"); setOptions([]);
    api<{ options: Option[] }>(`admin/taxonomy?group=${group}&kind=${kind}`).then(result => { if (current) { setOptions(result.options); setState("ready"); } }).catch(() => { if (current) setState("error"); });
    return () => { current = false; };
  }, [group, kind]);
  const normalized = normalizeTaxonomyName(query);
  const exact = options.find(option => option.normalizedName === normalized || option.aliases.some(alias => normalizeTaxonomyName(alias) === normalized));
  const matches = useMemo(() => exact ? [exact] : rankTaxonomyOptions(options, query), [options, query, exact]);
  const canCreate = normalized.length > 0 && !exact && state === "ready";
  const rows = [...matches.map(option => ({ type: "option" as const, option })), ...(canCreate ? [{ type: "create" as const }] : [])];
  useEffect(() => { setActive(0); }, [query, group]);
  const select = (option: Option) => { onChange(option.name); setQuery(option.name); setOpen(false); };
  const create = async () => {
    if (!canCreate || saving) return;
    setSaving(true);
    try {
      const result = await api<{ option: Option }>("admin/taxonomy", { method: "POST", body: JSON.stringify({ group, kind, name: query }) });
      setOptions(current => current.some(option => option.id === result.option.id) ? current : [...current, result.option]); select(result.option);
    } finally { setSaving(false); }
  };
  return <label className="taxonomy-field" htmlFor={id}>{label}
    <div className="taxonomy-combobox">
      <input id={id} value={query} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open && rows[active] ? `${id}-option-${active}` : undefined}
        onFocus={() => setOpen(true)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
        onChange={event => { setQuery(event.target.value); if (value) onChange(""); setOpen(true); }}
        onKeyDown={event => {
          if (event.key === "Escape") { setOpen(false); return; }
          if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) { setOpen(true); return; }
          if (!open || !rows.length || composing.current || event.nativeEvent.isComposing) return;
          if (event.key === "ArrowDown") { event.preventDefault(); setActive(index => (index + 1) % rows.length); }
          if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => (index - 1 + rows.length) % rows.length); }
          if (event.key === "Enter") { event.preventDefault(); const row = rows[active]; if (row.type === "option") select(row.option); else void create(); }
        }} />
      <button type="button" aria-label={`Mở danh sách ${label}`} onClick={() => setOpen(value => !value)}><ChevronDown size={16} /></button>
      {open && <div className="taxonomy-options" id={listId} role="listbox">
        {state === "loading" && <p role="status"><Loader2 size={15} className="studio-spin" /> Đang tải…</p>}
        {state === "error" && <p role="alert">Không tải được dữ liệu. Đóng và mở lại để thử lại.</p>}
        {state === "ready" && !rows.length && <p>Không có kết quả phù hợp.</p>}
        {state === "ready" && rows.map((row, index) => row.type === "option" ? <button id={`${id}-option-${index}`} type="button" role="option" aria-selected={value === row.option.name} className={active === index ? "active" : ""} key={row.option.id} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => select(row.option)}><span>{row.option.name}</span>{value === row.option.name && <Check size={15} />}</button> : <button id={`${id}-option-${index}`} type="button" role="option" aria-selected="false" className={`create ${active === index ? "active" : ""}`} key="create" onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => void create()} disabled={saving}><Plus size={15} />{saving ? "Đang thêm…" : `Thêm ${kind === "FIT" ? "dáng" : "loại"} mới: ${query.trim()}`}</button>)}
      </div>}
    </div>
  </label>;
}

export default function ProductTaxonomyFields({ initialGroup = "TOP", initialSubcategory = "", initialFit = "", onChange }: { initialGroup?: string; initialSubcategory?: string | null; initialFit?: string | null; onChange?: (value: { category: ProductGroup; subcategory: string; fit: string }) => void }) {
  const valid = productGroups.some(([code]) => code === initialGroup);
  const [category, setCategory] = useState<ProductGroup>(valid ? initialGroup as ProductGroup : "TOP");
  const [subcategory, setSubcategory] = useState(initialSubcategory || ""), [fit, setFit] = useState(initialFit || "");
  useEffect(() => { onChange?.({ category, subcategory, fit }); }, [category, subcategory, fit, onChange]);
  return <>
    <label>Nhóm chính<select name="category" value={category} onChange={event => { setCategory(event.target.value as ProductGroup); setSubcategory(""); setFit(""); }}>{productGroups.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label>
    <CreatableCombobox group={category} kind="SUBCATEGORY" label="Loại món (tùy chọn)" value={subcategory} onChange={setSubcategory} />
    <CreatableCombobox group={category} kind="FIT" label="Dáng / phom (tùy chọn)" value={fit} onChange={setFit} />
    <input type="hidden" name="subcategory" value={subcategory} /><input type="hidden" name="fit" value={fit} />
  </>;
}
