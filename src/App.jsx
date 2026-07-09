import React, { useState, useMemo, useEffect, useRef } from "react";
const L = window.L;
import { supabase, mapUser } from "./supabase";
import PaystackPop from "@paystack/inline-js";
import {
  Search, MapPin, CalendarDays, Shield, Scale, Receipt, Plus, X, Check,
  ChevronDown, Package, Smartphone, CreditCard, KeyRound, Dog, Gem, Shirt,
  Wallet, Banknote, FileText, ArrowRight, CheckCircle2, AlertTriangle,
  Lock, SlidersHorizontal, Stamp, HandHeart, ImagePlus,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Reference data                                                      */
/* ------------------------------------------------------------------ */
const CATEGORIES = [
  { id: "electronics", label: "Electronics", Icon: Smartphone },
  { id: "documents", label: "Documents & ID", Icon: FileText },
  { id: "wallets", label: "Wallets & Bags", Icon: Wallet },
  { id: "cards", label: "Cards", Icon: CreditCard },
  { id: "keys", label: "Keys", Icon: KeyRound },
  { id: "jewelry", label: "Jewelry", Icon: Gem },
  { id: "clothing", label: "Clothing", Icon: Shirt },
  { id: "money", label: "Cash", Icon: Banknote },
  { id: "pets", label: "Pets", Icon: Dog },
  { id: "other", label: "Other", Icon: Package },
];
const catMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const SEED = [
  { type: "found", title: "iPhone 13, teal case", category: "electronics", location: "Ikeja City Mall, Lagos", pickup: "Ikeja City Mall, Info Desk (ground floor)", date: "2026-07-03", by: "Mall Security", note: "Handed in at the info desk. Locked; owner must confirm lock-screen photo.", value: 320000 },
  { type: "lost", title: "Brown leather wallet", category: "wallets", location: "Yaba Bus Stop, Lagos", pickup: "Yaba Bus Stop, opposite UBA branch", date: "2026-07-05", by: "Chidi A.", note: "Contains a national ID and two bank cards. Small ink stain inside.", reward: 15000, value: 20000 },
  { type: "found", title: "Bunch of keys, blue tag", category: "keys", location: "Lekki Phase 1 Gym", pickup: "Lekki Phase 1 Gym, Front Desk", date: "2026-07-04", by: "Front Desk", note: "Five keys on a ring with a small blue plastic tag.", value: 5000 },
  { type: "lost", title: "National ID card", category: "documents", location: "Surulere, Lagos", pickup: "Surulere, Ojuelegba area", date: "2026-07-02", by: "Amaka O.", note: "Dropped somewhere between the market and the bank.", value: 0 },
  { type: "found", title: "Silver wristwatch", category: "jewelry", location: "Wuse Market, Abuja", pickup: "Wuse Market, Gate 3 entrance", date: "2026-07-01", by: "Trader stall 14", note: "Left on a counter. Engraving on the back for verification.", value: 45000 },
  { type: "lost", title: "Black backpack, laptop inside", category: "wallets", location: "University of Lagos", pickup: "University of Lagos, Main Gate security post", date: "2026-06-30", by: "Tunde B.", note: "Contains a 14-inch laptop and lecture notes. Front zip is broken.", reward: 30000, value: 400000 },
  { type: "found", title: "Set of car documents", category: "documents", location: "Ojota, Lagos", pickup: "Ojota Motor Park, park manager's office", date: "2026-07-06", by: "Danladi M.", note: "Vehicle papers in a plastic folder. Name partly visible.", value: 0 },
  { type: "returned", title: "Grey tabby cat", category: "pets", location: "Gwarinpa, Abuja", date: "2026-06-28", by: "Blessing E.", note: "Reunited with owner after collar tag was verified.", value: 0 },
  { type: "found", title: "Prescription glasses", category: "other", location: "National Theatre, Lagos", pickup: "National Theatre, main entrance", date: "2026-07-05", by: "Usher team", note: "Thin gold frames in a hard black case.", value: 12000 },
];

const SEED_ITEMS = SEED.map((it, i) => ({
  ...it,
  id: `seed-${i}`,
  ref: `LF-${2381 + i}`,
  status: it.type === "returned" ? "returned" : "open",
}));

const NAIRA = (n) => "\u20A6" + (n || 0).toLocaleString("en-NG");

/* Service charge: free to list; a verification & handling fee on successful return, tiered by declared value. */
const feeFor = (value) => {
  if (!value || value <= 0) return { fee: 1000, band: "No declared value" };
  if (value <= 20000) return { fee: 1500, band: "Up to \u20A620,000" };
  if (value <= 100000) return { fee: 3500, band: "\u20A620,001 – \u20A6100,000" };
  if (value <= 500000) return { fee: 7500, band: "\u20A6100,001 – \u20A6500,000" };
  return { fee: 15000, band: "Above \u20A6500,000" };
};


/* Approximate coordinates for common Nigerian locations used by the live map. */
const CITY_COORDS = {
  "ikeja": [6.6018, 3.3515],
  "yaba": [6.5095, 3.3711],
  "lekki": [6.4355, 3.4654],
  "surulere": [6.5027, 3.3581],
  "wuse": [9.0765, 7.4898],
  "university of lagos": [6.5158, 3.3895],
  "unilag": [6.5158, 3.3895],
  "ojota": [6.5997, 3.3831],
  "gwarinpa": [9.1027, 7.4164],
  "national theatre": [6.4534, 3.3879],
  "victoria island": [6.4281, 3.4219],
  "ikoyi": [6.4474, 3.4348],
  "ajah": [6.4730, 3.5607],
  "festac": [6.4685, 3.2836],
  "maryland": [6.5705, 3.3631],
  "mushin": [6.5355, 3.3503],
  "oshodi": [6.5553, 3.3429],
  "abuja": [9.0579, 7.4951],
  "maitama": [9.0897, 7.4857],
  "garki": [9.0486, 7.4813],
  "kano": [12.0022, 8.5920],
  "port harcourt": [4.8156, 7.0498],
  "ibadan": [7.3776, 3.9470],
  "lagos": [6.5244, 3.3792],
};

const approxCoords = (location) => {
  if (!location) return null;
  const lower = location.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(key)) return coords;
  }
  return null;
};

function LiveMap({ items }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      }).setView([6.5244, 3.3792], 11);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(mapRef.current);

      L.control.attribution({ prefix: false })
        .addAttribution('© <a href="https://openstreetmap.org/copyright">OSM</a>')
        .addTo(mapRef.current);
    }

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    items.forEach((item) => {
      const jitter = () => (Math.random() - 0.5) * 0.004;

      const locCoords = approxCoords(item.location);
      if (locCoords) {
        const color =
          item.type === "lost" ? "#f59e0b" :
          item.type === "found" ? "#0f766e" : "#64748b";
        const m = L.circleMarker([locCoords[0] + jitter(), locCoords[1] + jitter()], {
          radius: 8, fillColor: color, color: "#fff", weight: 2, fillOpacity: 0.88,
        })
          .addTo(mapRef.current)
          .bindPopup(
            `<strong style="font-size:13px">${item.title}</strong><br>` +
            `<span style="font-size:11px;color:#64748b">📍 ${item.location}</span>`
          );
        markersRef.current.push(m);
      }

      if (item.pickup) {
        const pickupCoords = approxCoords(item.pickup);
        if (pickupCoords) {
          const p = L.circleMarker([pickupCoords[0] + jitter(), pickupCoords[1] + jitter()], {
            radius: 7, fillColor: "#2563eb", color: "#fff", weight: 2, fillOpacity: 0.9,
          })
            .addTo(mapRef.current)
            .bindPopup(
              `<strong style="font-size:13px">Pickup point</strong><br>` +
              `<span style="font-size:11px;color:#1e40af">🤝 ${item.pickup}</span><br>` +
              `<span style="font-size:11px;color:#64748b">${item.title}</span>`
            );
          markersRef.current.push(p);
        }
      }
    });

    return () => {};
  }, [items]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/20">
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap items-center gap-2 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs shadow backdrop-blur">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> Lost</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-700" /> Found</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" /> Returned</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" /> Pickup</span>
      </div>
    </div>
  );
}

/* Deterministic demo contact number, revealed only after the access fee is paid. */
const demoPhone = (seed) => {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const n = ((h % 9000000) + 1000000).toString();
  return "0803 " + n.slice(0, 3) + " " + n.slice(3);
};

/* ------------------------------------------------------------------ */
/* Small UI pieces                                                     */
/* ------------------------------------------------------------------ */
function StatusStamp({ type, status }) {
  if (status === "returned")
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-xs uppercase tracking-widest text-slate-500">
        <Stamp className="h-3 w-3" /> Returned
      </span>
    );
  if (type === "lost")
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-xs uppercase tracking-widest text-amber-700">
        Lost
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono text-xs uppercase tracking-widest text-emerald-700">
      Found
    </span>
  );
}

function Eyebrow({ children }) {
  return <p className="font-mono text-xs uppercase tracking-widest text-teal-600">{children}</p>;
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200";

function Check1({ checked, onChange, children }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-200"
    >
      <span
        className={
          "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded border transition " +
          (checked ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 bg-white text-transparent")
        }
      >
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm text-slate-600">{children}</span>
    </button>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className={"relative w-full rounded-2xl bg-white shadow-xl " + (wide ? "max-w-3xl" : "max-w-lg")}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Item photo (uploaded image, or a category placeholder tile)         */
/* ------------------------------------------------------------------ */
const CAT_EMOJI = {
  electronics: "\uD83D\uDCF1", documents: "\uD83E\uDEAA", wallets: "\uD83D\uDC5C",
  cards: "\uD83D\uDCB3", keys: "\uD83D\uDD11", jewelry: "\uD83D\uDC8D",
  clothing: "\uD83D\uDC55", money: "\uD83D\uDCB5", pets: "\uD83D\uDC3E", other: "\uD83D\uDCE6",
};
const CAT_GRAD = {
  electronics: "from-sky-100 to-teal-100", documents: "from-amber-100 to-orange-100",
  wallets: "from-rose-100 to-amber-100", cards: "from-indigo-100 to-sky-100",
  keys: "from-teal-100 to-emerald-100", jewelry: "from-fuchsia-100 to-rose-100",
  clothing: "from-violet-100 to-indigo-100", money: "from-emerald-100 to-teal-100",
  pets: "from-orange-100 to-amber-100", other: "from-slate-100 to-slate-200",
};

function ItemThumb({ item }) {
  if (item.image) return <img src={item.image} alt={item.title} className="h-full w-full object-cover" />;
  const grad = CAT_GRAD[item.category] || CAT_GRAD.other;
  const emoji = CAT_EMOJI[item.category] || CAT_EMOJI.other;
  return (
    <div className={"flex h-full w-full items-center justify-center bg-gradient-to-br " + grad}>
      <span className="text-5xl" role="img" aria-label={(catMap[item.category] || catMap.other).label}>{emoji}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ticket card                                                         */
/* ------------------------------------------------------------------ */
function TicketCard({ item, onOpen }) {
  const cat = catMap[item.category] || catMap.other;
  const { Icon } = cat;
  const dim = item.status === "returned";
  return (
    <button
      onClick={() => onOpen(item)}
      className={
        "group relative flex flex-col rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-300 " +
        (dim ? "border-slate-200 opacity-80" : "border-slate-200")
      }
    >
      {/* photo */}
      <div className="relative h-36 w-full overflow-hidden rounded-t-2xl">
        <ItemThumb item={item} />
        <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-0.5 font-mono text-xs tracking-wider text-teal-700 shadow-sm">{item.ref}</span>
        <span className="absolute right-3 top-3">
          <StatusStamp type={item.type} status={item.status} />
        </span>
      </div>

      {/* seam notches */}
      <span className="absolute -left-2 top-36 h-4 w-4 -translate-y-1/2 rounded-full bg-stone-100" />
      <span className="absolute -right-2 top-36 h-4 w-4 -translate-y-1/2 rounded-full bg-stone-100" />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-serif text-base font-semibold leading-tight text-slate-800">{item.title}</h3>
            <p className="text-xs text-slate-400">{cat.label}</p>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-slate-500">{item.note}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400" /> {item.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> {item.date}
          </span>
        </div>

        {item.reward ? (
          <div className="mt-3 inline-flex w-fit items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
            <HandHeart className="h-3.5 w-3.5" /> Reward {NAIRA(item.reward)}
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-1 text-sm font-medium text-teal-700 opacity-0 transition group-hover:opacity-100">
          {item.type === "lost" ? "I found this" : "This is mine"} <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Report form                                                         */
/* ------------------------------------------------------------------ */
const emptyForm = {
  type: "lost",
  title: "",
  category: "electronics",
  location: "",
  pickup: "",
  date: "",
  by: "",
  contact: "",
  note: "",
  value: "",
  reward: "",
  securityQ: "",
  image: "",
};

function ReportForm({ initialType, onCancel, onSubmit }) {
  const [f, setF] = useState({ ...emptyForm, type: initialType });
  const [checks, setChecks] = useState({ accurate: false, security: false, fee: false, terms: false });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target ? e.target.value : e }));
  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setF((s) => ({ ...s, image: reader.result }));
    reader.readAsDataURL(file);
  };
  const allChecked = Object.values(checks).every(Boolean);
  const required = f.title && f.category && f.location && f.date && f.securityQ;
  const est = feeFor(Number(f.value));

  return (
    <div className="p-6 sm:p-8">
      <Eyebrow>File a report</Eyebrow>
      <h2 className="mt-1 font-serif text-2xl font-semibold text-slate-800">
        {f.type === "lost" ? "Report a lost item" : "Report a found item"}
      </h2>

      <div className="mt-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        {["lost", "found"].map((t) => (
          <button
            key={t}
            onClick={() => setF((s) => ({ ...s, type: t }))}
            className={
              "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition " +
              (f.type === t ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-slate-700")
            }
          >
            {t === "lost" ? "I lost something" : "I found something"}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="What is it?">
            <input className={inputCls} value={f.title} onChange={set("title")} placeholder="e.g. Black backpack with laptop" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Photo (optional)" hint="A clear photo helps the owner recognise the item.">
            {f.image ? (
              <div className="relative inline-block">
                <img src={f.image} alt="Item preview" className="h-28 w-28 rounded-lg border border-slate-200 object-cover" />
                <button
                  type="button"
                  onClick={() => setF((s) => ({ ...s, image: "" }))}
                  aria-label="Remove photo"
                  className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-1 text-white transition hover:bg-slate-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 transition hover:border-teal-400 hover:text-teal-700">
                <ImagePlus className="h-5 w-5" /> Add a photo
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </label>
            )}
          </Field>
        </div>
        <Field label="Category">
          <div className="relative">
            <select className={inputCls + " appearance-none pr-9"} value={f.category} onChange={set("category")}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </Field>
        <Field label={f.type === "lost" ? "Where did you lose it?" : "Where did you find it?"}>
          <input className={inputCls} value={f.location} onChange={set("location")} placeholder="Area, landmark, city" />
        </Field>
        <Field label="Pickup / handover spot" hint="Where can the owner collect the item, or where would you like to meet?">
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className={inputCls + " pl-9"} value={f.pickup} onChange={set("pickup")} placeholder="e.g. Ikeja Mall info desk, Yaba bus stop, UBA branch entrance" />
          </div>
        </Field>
        <Field label="Date">
          <input type="date" className={inputCls} value={f.date} onChange={set("date")} />
        </Field>
        <Field label="Declared value (optional)" hint="Used only to estimate the return handling fee.">
          <input type="number" min="0" className={inputCls} value={f.value} onChange={set("value")} placeholder="\u20A6" />
        </Field>
        {f.type === "lost" && (
          <Field label="Reward (optional)">
            <input type="number" min="0" className={inputCls} value={f.reward} onChange={set("reward")} placeholder="\u20A6" />
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field label="Description" hint="Add helpful detail, but keep unique identifiers for the verification question below.">
            <textarea rows={3} className={inputCls} value={f.note} onChange={set("note")} placeholder="Colour, brand, contents, distinguishing marks…" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Verification question"
            hint="Only the true owner should know this answer. It is never shown publicly."
          >
            <input className={inputCls} value={f.securityQ} onChange={set("securityQ")} placeholder="e.g. What is engraved on the back? What is the lock-screen photo?" />
          </Field>
        </div>
        <Field label="Your name">
          <input className={inputCls} value={f.by} onChange={set("by")} placeholder="Shown on the listing" />
        </Field>
        <Field label="Contact" hint="Hidden until a claim passes verification.">
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className={inputCls + " pl-9"} value={f.contact} onChange={set("contact")} placeholder="Phone or email" />
          </div>
        </Field>
      </div>

      {/* Conditions */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Shield className="h-4 w-4 text-teal-700" /> Conditions you agree to
        </p>
        <div className="grid gap-2">
          <Check1 checked={checks.accurate} onChange={(v) => setChecks((s) => ({ ...s, accurate: v }))}>
            The details are accurate and this item is lawful to report. I understand false reports may be treated as fraud.
          </Check1>
          <Check1 checked={checks.security} onChange={(v) => setChecks((s) => ({ ...s, security: v }))}>
            I agree to the security protocol — claims are released only after identity and ownership verification, at a safe handover.
          </Check1>
          <Check1 checked={checks.fee} onChange={(v) => setChecks((s) => ({ ...s, fee: v }))}>
            I understand listing is free. A verification &amp; handling fee (est. <strong>{NAIRA(est.fee)}</strong> for {est.band.toLowerCase()}) applies only on a successful, confirmed return.
          </Check1>
          <Check1 checked={checks.terms} onChange={(v) => setChecks((s) => ({ ...s, terms: v }))}>
            I consent to the terms and privacy policy, including that my contact stays hidden until a claim is verified.
          </Check1>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-200"
        >
          Cancel
        </button>
        <button
          disabled={!required || !allChecked}
          onClick={() =>
            onSubmit({
              ...f,
              value: Number(f.value) || 0,
              reward: Number(f.reward) || 0,
            })
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Post to the board <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {!required && (
        <p className="mt-2 text-right text-xs text-slate-400">Fill the item, category, location, date and verification question to continue.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Item detail + claim                                                 */
/* ------------------------------------------------------------------ */
function ItemDetail({ item, onClose, user, onRequireAuth, onHandover }) {
  const cat = catMap[item.category] || catMap.other;
  const { Icon } = cat;
  const [step, setStep] = useState("view"); // view | claim | unlocked | handover
  const [answer, setAnswer] = useState("");
  const [ack, setAck] = useState({ id: false });
  const [payRef, setPayRef] = useState(null);
  const [pickupType, setPickupType] = useState("person"); // person | proxy
  const [ownerIdFile, setOwnerIdFile] = useState("");
  const [proxyIdFile, setProxyIdFile] = useState("");

  const handleIdFile = (e, setter) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result);
    reader.readAsDataURL(file);
  };

  const est = feeFor(item.value);
  const canSubmit = answer.trim().length > 3 && ack.id;

  return (
    <Modal onClose={onClose} wide>
      <div className="p-6 sm:p-8">
        <div className="mb-5 h-52 w-full overflow-hidden rounded-xl bg-teal-50">
          <ItemThumb item={item} />
        </div>
        <div className="flex items-center justify-between pr-8">
          <span className="font-mono text-xs tracking-wider text-teal-600">{item.ref}</span>
          <StatusStamp type={item.type} status={item.status} />
        </div>
        <div className="mt-4 flex items-start gap-4">
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-serif text-2xl font-semibold leading-tight text-slate-800">{item.title}</h2>
            <p className="text-sm text-slate-400">{cat.label}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-400">{item.type === "lost" ? "Last seen" : "Found at"}</p>
            <p className="mt-1 flex items-center gap-1 text-slate-700"><MapPin className="h-4 w-4 text-slate-400" /> {item.location}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-400">Date</p>
            <p className="mt-1 flex items-center gap-1 text-slate-700"><CalendarDays className="h-4 w-4 text-slate-400" /> {item.date}</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">{item.note}</p>
        <p className="mt-3 text-sm text-slate-500">Reported by <span className="font-medium text-slate-700">{item.by || "Anonymous"}</span>. Contact is protected until a claim is verified.</p>
        {item.reward ? (
          <div className="mt-3 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-sm font-medium text-amber-700">
            <HandHeart className="h-4 w-4" /> Reward offered: {NAIRA(item.reward)}
          </div>
        ) : null}

        {item.status === "returned" ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="flex items-center gap-2 font-medium text-slate-700"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> This case is closed — the item has been returned to its owner.</p>
          </div>
        ) : step === "view" ? (
          <>
            {user ? (
              <button
                onClick={() => setStep("claim")}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
              >
                {item.type === "lost" ? "I found this item" : "This is mine — start a claim"} <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={onRequireAuth}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
              >
                <Lock className="h-4 w-4" /> Sign in to claim
              </button>
            )}
          </>
        ) : step === "claim" ? (
          <div className="mt-6">
            <p className="flex items-center gap-2 font-serif text-lg font-semibold text-slate-800"><Shield className="h-5 w-5 text-teal-700" /> Verification</p>
            <p className="mt-1 text-sm text-slate-500">Answer the reporter's verification question. Your answer goes only to the reporter for matching — never posted publicly.</p>
            <div className="mt-4">
              <Field label="Prove ownership" hint="Describe a unique identifier only the owner would know.">
                <textarea rows={3} className={inputCls} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="e.g. The lock-screen is a photo of a red car; there's an ink stain inside the flap." />
              </Field>
            </div>
            <div className="mt-4 grid gap-2">
              <Check1 checked={ack.id} onChange={(v) => setAck((s) => ({ ...s, id: v }))}>
                I will present a valid ID at a safe, verified handover point before the item is released.
              </Check1>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              High-value items and official documents may require reporting to the police before release, in line with local law.
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setStep("view")} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Back</button>
              <button
                disabled={!canSubmit}
                onClick={() => setStep("unlocked")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Verify &amp; unlock <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : step === "handover" ? (
          <div className="mt-6">
            <p className="flex items-center gap-2 font-serif text-lg font-semibold text-slate-800">
              <CheckCircle2 className="h-5 w-5 text-teal-700" /> Confirm handover
            </p>
            <p className="mt-1 text-sm text-slate-500">Upload the ID(s) presented at pickup. This completes the return and closes the ticket.</p>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Pickup type</p>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                {[["person", "In person"], ["proxy", "By proxy"]].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => { setPickupType(id); setProxyIdFile(""); }}
                    className={
                      "rounded-md px-4 py-1.5 text-sm font-medium transition " +
                      (pickupType === id ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-slate-700")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {pickupType === "person"
                ? "Upload the owner's NIN slip or passport photo page as presented at collection."
                : "Upload both the original owner's NIN/passport AND the proxy's NIN/passport."}
            </div>

            <div className="mt-4 grid gap-4">
              <div>
                <p className="mb-1.5 text-sm font-medium text-slate-700">
                  {pickupType === "person" ? "Owner's NIN / Passport" : "Original owner's NIN / Passport"}
                </p>
                {ownerIdFile ? (
                  <div className="relative inline-block">
                    <img src={ownerIdFile} alt="Owner ID" className="h-28 w-48 rounded-lg border border-slate-200 object-cover" />
                    <button type="button" onClick={() => setOwnerIdFile("")} aria-label="Remove" className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-1 text-white hover:bg-slate-700">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500 transition hover:border-teal-400 hover:text-teal-700">
                    <ImagePlus className="h-5 w-5" /> Upload ID photo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleIdFile(e, setOwnerIdFile)} />
                  </label>
                )}
              </div>

              {pickupType === "proxy" && (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-700">Proxy's NIN / Passport</p>
                  {proxyIdFile ? (
                    <div className="relative inline-block">
                      <img src={proxyIdFile} alt="Proxy ID" className="h-28 w-48 rounded-lg border border-slate-200 object-cover" />
                      <button type="button" onClick={() => setProxyIdFile("")} aria-label="Remove" className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-1 text-white hover:bg-slate-700">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500 transition hover:border-teal-400 hover:text-teal-700">
                      <ImagePlus className="h-5 w-5" /> Upload ID photo
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleIdFile(e, setProxyIdFile)} />
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setStep("unlocked")} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Back</button>
              <button
                disabled={false}
                onClick={() => onHandover(item.id)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" /> Confirm handover &amp; close ticket
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="mt-2 font-serif text-lg font-semibold text-slate-800">Finder unlocked</p>
              <p className="mt-1 text-sm text-slate-600">Ownership verified. Contact the finder below and arrange a safe handover.</p>
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Finder / Reporter</p>
              <p className="mt-0.5 font-medium text-slate-800">{item.by || "FoundIt member"}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Contact</p>
              <p className="mt-0.5 font-mono text-slate-800">{item.contact || demoPhone(item.id)}</p>
              {item.pickup && (
                <>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Pickup / Handover spot</p>
                  <p className="mt-0.5 flex items-start gap-1.5 font-medium text-teal-800">
                    <MapPin className="mt-0.5 h-4 w-4 flex-none text-teal-600" />{item.pickup}
                  </p>
                </>
              )}
            </div>

            {/* Handover protocol notice */}
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold text-amber-900">
                <Shield className="h-4 w-4 flex-none" /> Handover protocol
              </p>
              <div className="mt-2 space-y-1 text-amber-800">
                <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-amber-600" /> <span><strong>In person:</strong> the owner presents a valid NIN or passport to the finder at pickup.</span></p>
                <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-amber-600" /> <span><strong>By proxy:</strong> the proxy presents their own NIN/passport <em>and</em> the original owner's NIN/passport.</span></p>
                <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-amber-600" /> The finder uploads the ID(s) on the platform to confirm the handover.</p>
              </div>
              <button
                onClick={() => setStep("handover")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                Proceed to handover confirmation <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Conditions reference                                                */
/* ------------------------------------------------------------------ */
function Conditions({ onClose }) {
  const Section = ({ Icon, title, children }) => (
    <div className="rounded-xl border border-slate-200 p-5">
      <p className="flex items-center gap-2 font-serif text-lg font-semibold text-slate-800"><Icon className="h-5 w-5 text-teal-700" /> {title}</p>
      <div className="mt-2 space-y-1.5 text-sm text-slate-600">{children}</div>
    </div>
  );
  const Li = ({ children }) => (
    <p className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-teal-600" /> {children}</p>
  );
  return (
    <Modal onClose={onClose} wide>
      <div className="p-6 sm:p-8">
        <Eyebrow>The house rules</Eyebrow>
        <h2 className="mt-1 font-serif text-2xl font-semibold text-slate-800">How reclaiming works</h2>
        <p className="mt-1 text-sm text-slate-500">Three things keep the board safe, lawful, and fair. Every report and claim agrees to them.</p>
        <div className="mt-5 grid gap-4">
          <Section Icon={Shield} title="Security protocol">
            <Li>Every reporter sets a private verification question; only the true owner should know the answer.</Li>
            <Li>Contact details stay hidden until a claim passes verification.</Li>
            <Li>Items are released only at a safe, verified handover with valid ID.</Li>
            <Li>Nothing is released on the strength of a description alone.</Li>
          </Section>
          <Section Icon={Scale} title="Legal compliance">
            <Li>Reports must be truthful; misrepresentation may be treated as fraud.</Li>
            <Li>Prohibited items — weapons, controlled substances, hazardous or illegal goods — may not be listed.</Li>
            <Li>High-value items and official documents may require a police report before release, per local law.</Li>
            <Li>Personal data is collected and shared only as needed to reunite an item with its owner.</Li>
          </Section>
          <Section Icon={Receipt} title="Service charge">
            <Li>Listing an item and browsing the board are always free.</Li>
            <Li>Unlocking a finder's contact is free — no access fee is charged.</Li>
            <Li>A verification &amp; handling fee applies only on a successful, verified return:</Li>
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
              {[0, 20000, 100000, 500000, 500001].map((v, i) => {
                const info = feeFor(v);
                return (
                  <div key={i} className={"flex items-center justify-between px-3 py-2 text-sm " + (i % 2 ? "bg-slate-50" : "bg-white")}>
                    <span className="text-slate-600">{info.band}</span>
                    <span className="font-mono text-teal-700">{NAIRA(info.fee)}</span>
                  </div>
                );
              })}
            </div>
            <Li>Any reward offered by an owner is separate and voluntary.</Li>
          </Section>
        </div>
        <button onClick={onClose} className="mt-6 w-full rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">Got it</button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Sign up / log in                                                    */
/* ------------------------------------------------------------------ */
function AuthModal({ mode, intent, onClose, onAuth, onSwitch }) {
  const [subStep, setSubStep] = useState("form"); // "form" | "otp" | "forgot" | "forgot-sent"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSignup = mode === "signup";
  const canSubmit = email.includes("@") && pw.length >= 6 && (!isSignup || name.trim());
  const intentLine =
    intent === "report"
      ? "You need an account to post a lost or found item."
      : intent === "claim"
      ? "Sign in to start a claim and reach the finder."
      : "Sign in to post items and make claims.";

  const handleSubmitForm = async () => {
    setError(null);
    setLoading(true);
    try {
      if (isSignup) {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password: pw,
          options: { data: { full_name: name.trim() || email.split("@")[0] } },
        });
        if (err) {
          console.error("Supabase signUp error:", err, JSON.stringify(err));
          const msg = err.message && err.message !== "{}" ? err.message : "Sign-up failed — the service may be temporarily unavailable. Please try again in a moment.";
          setError(msg);
        } else if (!data.user || data.user.identities?.length === 0) {
          // Confirmed duplicate — offer to resend OTP in case account is unconfirmed
          const { error: resendErr } = await supabase.auth.resend({ type: "signup", email });
          if (resendErr) {
            setError("An account with this email already exists. Please sign in instead.");
          } else {
            setSubStep("otp");
          }
        } else {
          setSubStep("otp");
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (err) {
          setError("Incorrect email or password.");
        } else {
          onAuth(mapUser(data.user));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resend({ type: "signup", email });
      if (err) {
        setError("Could not resend the code. " + err.message);
      } else {
        setOtp("");
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (err) {
        setError(err.message || "Could not send reset email. Please try again.");
      } else {
        setSubStep("forgot-sent");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: "signup",
      });
      if (err) {
        setError("Invalid or expired code. Try requesting a new one below.");
      } else if (data.user) {
        onAuth(mapUser(data.user));
      }
      // If data.user is null the onAuthStateChange listener handles the session
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-6 sm:p-8">
        <Eyebrow>{intent ? "One step first" : "Your account"}</Eyebrow>

        {subStep === "form" ? (
          <>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-slate-800">
              {isSignup ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{intentLine}</p>
            <div className="mt-5 grid gap-3">
              {isSignup && (
                <Field label="Full name">
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </Field>
              )}
              <Field label="Email">
                <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </Field>
              <Field label="Password">
                <input type="password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" />
              </Field>
            </div>
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button
              disabled={!canSubmit || loading}
              onClick={handleSubmitForm}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Please wait…" : isSignup ? "Create account" : "Log in"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
            {!isSignup && (
              <p className="mt-3 text-center text-xs text-slate-400">
                Forgot your password?{" "}
                <button
                  onClick={() => { setSubStep("forgot"); setError(null); }}
                  className="font-medium text-teal-700 hover:underline"
                >
                  Reset it
                </button>
              </p>
            )}
            <p className="mt-3 text-center text-sm text-slate-500">
              {isSignup ? "Already have an account?" : "New here?"}{" "}
              <button onClick={onSwitch} className="font-medium text-teal-700 hover:underline">
                {isSignup ? "Log in" : "Create one"}
              </button>
            </p>
          </>
        ) : subStep === "forgot" ? (
          <>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-slate-800">Reset your password</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your email and we'll send you a link to set a new password.
            </p>
            <div className="mt-5">
              <Field label="Email">
                <input
                  type="email"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                />
              </Field>
            </div>
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button
              disabled={!email.includes("@") || loading}
              onClick={handleForgotPassword}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Sending…" : "Send reset link"} {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
            <p className="mt-4 text-center text-xs text-slate-400">
              <button onClick={() => { setSubStep("form"); setError(null); }} className="text-teal-700 hover:underline">
                Back to sign in
              </button>
            </p>
          </>
        ) : subStep === "forgot-sent" ? (
          <>
            <div className="mt-2 flex flex-col items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <h2 className="mt-3 font-serif text-2xl font-semibold text-slate-800">Check your email</h2>
              <p className="mt-2 text-sm text-slate-500">
                We sent a password reset link to{" "}
                <span className="font-semibold text-slate-700">{email}</span>.
                Click the link in the email to set a new password.
              </p>
              <p className="mt-2 text-xs text-slate-400">Don't see it? Check your spam folder.</p>
            </div>
            <button
              onClick={() => { setSubStep("form"); setError(null); }}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-slate-800">Enter verification code</h2>
            <p className="mt-1 text-sm text-slate-500">
              We sent a verification code to <span className="font-semibold text-slate-700">{email}</span>. Enter it below to verify your account.
            </p>
            <div className="mt-5">
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                autoFocus
                placeholder="00000000"
                className="w-full rounded-xl border border-slate-200 py-4 text-center font-mono text-3xl tracking-[0.5em] text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
              />
            </div>
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button
              disabled={otp.length < 6 || otp.length > 8 || loading}
              onClick={handleVerifyOtp}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Verifying…" : "Verify & continue"} {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-center text-xs text-slate-400">
                Didn't receive a code? Check your spam folder, or:
              </p>
              <div className="flex items-center gap-3">
                <button
                  disabled={loading}
                  onClick={handleResendOtp}
                  className="text-xs font-medium text-teal-700 hover:underline disabled:opacity-40"
                >
                  {loading ? "Sending…" : "Resend code"}
                </button>
                <span className="text-slate-300">·</span>
                <button
                  onClick={() => { setSubStep("form"); setOtp(""); setError(null); }}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Change email
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Reset password modal (shown after clicking email reset link)        */
/* ------------------------------------------------------------------ */
function ResetPasswordModal({ onClose }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const canSubmit = pw.length >= 6 && pw === pw2;

  const handleReset = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: pw });
      if (err) {
        setError(err.message || "Could not update password. Please try again.");
      } else {
        setDone(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-6 sm:p-8">
        <Eyebrow>Password reset</Eyebrow>
        {done ? (
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="mt-2 h-12 w-12 text-emerald-500" />
            <h2 className="mt-3 font-serif text-2xl font-semibold text-slate-800">Password updated</h2>
            <p className="mt-2 text-sm text-slate-500">You're all set. You can now sign in with your new password.</p>
            <button
              onClick={onClose}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-slate-800">Set a new password</h2>
            <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>
            <div className="mt-5 grid gap-3">
              <Field label="New password" hint="At least 6 characters">
                <input
                  type="password"
                  className={inputCls}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="New password"
                  autoFocus
                />
              </Field>
              <Field label="Confirm new password">
                <input
                  type="password"
                  className={inputCls}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="Repeat password"
                />
              </Field>
            </div>
            {pw2 && pw !== pw2 && (
              <p className="mt-2 text-xs text-red-600">Passwords do not match.</p>
            )}
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button
              disabled={!canSubmit || loading}
              onClick={handleReset}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Saving…" : "Save new password"} {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Main app                                                            */
/* ------------------------------------------------------------------ */
export default function App() {
  const [items, setItems] = useState(SEED_ITEMS);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all"); // all | lost | found
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState("newest");
  const [location, setLocation] = useState("");
  const [when, setWhen] = useState("any");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null); // null | 'lost' | 'found'
  const [showConditions, setShowConditions] = useState(false);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  const [auth, setAuth] = useState(null); // null | 'signin' | 'signup'
  const [authIntent, setAuthIntent] = useState(null); // 'report' | 'claim'
  const [pendingReport, setPendingReport] = useState(null);
  const [resetPw, setResetPw] = useState(false);

  // Restore session on load and listen for auth state changes
  useEffect(() => {
    // Detect password-recovery redirect from email link (hash or query param)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    if (hashParams.get("type") === "recovery" || queryParams.get("type") === "recovery") {
      setResetPw(true);
      // Clean the token out of the URL bar
      window.history.replaceState(null, "", window.location.pathname);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(mapUser(session.user));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setResetPw(true);
        setAuth(null);
      } else if (session?.user) {
        setUser(mapUser(session.user));
        setAuth(null);
        setAuthIntent(null);
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 30-minute sliding inactivity session
  useEffect(() => {
    if (!user) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => supabase.auth.signOut(), 30 * 60 * 1000);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user]);

  const openReport = (t) => {
    if (user) setReport(t);
    else {
      setPendingReport(t);
      setAuthIntent("report");
      setAuth("signup");
    }
  };
  const handleAuth = (u) => {
    setUser(u);
    setAuth(null);
    setAuthIntent(null);
    if (pendingReport) {
      setReport(pendingReport);
      setPendingReport(null);
    }
  };

  const counts = useMemo(() => {
    const open = items.filter((i) => i.status !== "returned");
    return {
      all: open.length,
      lost: open.filter((i) => i.type === "lost").length,
      found: open.filter((i) => i.type === "found").length,
      returned: items.filter((i) => i.status === "returned").length,
    };
  }, [items]);

  const locations = useMemo(
    () => Array.from(new Set(items.map((i) => i.location))).sort(),
    [items]
  );

  // Relative time presets are anchored to the most recent ticket so the board
  // always surfaces its data regardless of the real calendar date.
  const refDate = useMemo(() => {
    const max = items.reduce((m, i) => (i.date > m ? i.date : m), "0000-00-00");
    const today = new Date().toISOString().slice(0, 10);
    return max > today ? max : today;
  }, [items]);

  const shiftDays = (iso, n) => {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const activeFilters = [cat !== "all", !!location, when !== "any", !!query].filter(Boolean).length;

  const clearFilters = () => {
    setCat("all");
    setLocation("");
    setWhen("any");
    setDateFrom("");
    setDateTo("");
    setQuery("");
  };

  const visible = useMemo(() => {
    let from = "", to = "";
    if (when === "today") { from = refDate; to = refDate; }
    else if (when === "7") { from = shiftDays(refDate, 6); to = refDate; }
    else if (when === "30") { from = shiftDays(refDate, 29); to = refDate; }
    else if (when === "custom") { from = dateFrom; to = dateTo; }

    let list = items.filter((i) => {
      if (type === "returned") {
        if (i.status !== "returned") return false;
      } else {
        if (i.status === "returned") return false;
        if (type !== "all" && i.type !== type) return false;
      }
      if (cat !== "all" && i.category !== cat) return false;
      if (location && !i.location.toLowerCase().includes(location.toLowerCase())) return false;
      if (from && i.date < from) return false;
      if (to && i.date > to) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!(i.title + i.note + i.location + i.ref).toLowerCase().includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      const cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      return sort === "newest" ? -cmp : cmp;
    });
    return list;
  }, [items, type, cat, query, sort, location, when, dateFrom, dateTo, refDate]);

  const handleHandover = (id) => {
    const ref = items.find((i) => i.id === id)?.ref;
    setItems((s) => s.map((it) => it.id === id ? { ...it, status: "returned" } : it));
    setSelected(null);
    setToast({ ref, type: "returned" });
    setTimeout(() => setToast(null), 5000);
  };

  const addItem = (f) => {
    const ref = `LF-${2381 + items.length + Math.floor(Math.random() * 40)}`;
    const item = {
      ...f,
      id: "u-" + Date.now(),
      ref,
      status: "open",
      by: f.by || (user ? user.name : "Anonymous"),
      contact: f.contact || (user ? user.email : ""),
    };
    setItems((s) => [item, ...s]);
    setReport(null);
    setType(f.type);
    setCat("all");
    setLocation("");
    setWhen("any");
    setDateFrom("");
    setDateTo("");
    setQuery("");
    setToast({ ref, type: f.type });
    setTimeout(() => setToast(null), 5000);
  };

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-slate-800">
      {/* Desk header */}
      <header className="bg-teal-900 text-white">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <HandHeart className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="font-serif font-bold tracking-tight" style={{ fontSize: "84px" }}>FoundIt</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConditions(true)}
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-teal-100 transition hover:bg-white/10 sm:block"
            >
              How it works
            </button>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-teal-100 sm:inline">Hi, {user.name.split(" ")[0]}</span>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAuthIntent(null); setAuth("signin"); }}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Sign in
              </button>
            )}
            <button
              onClick={() => openReport("lost")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-teal-950 transition hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Report an item</span><span className="sm:hidden">Report</span>
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="mx-auto max-w-screen-2xl px-4 pb-10 pt-2 sm:px-6">
          <div className="grid items-center gap-6 lg:grid-cols-[70%_30%] lg:gap-8">
            {/* Left: text + search */}
            <div>
              <h1 className="font-serif font-semibold leading-tight" style={{ fontSize: "40px" }}>
                Lost something? Found something? <span className="text-amber-300">Let's reunite them.</span>
              </h1>
              <p className="mt-2 text-sm text-teal-100">
                Nigeria's foremost community board for missing, lost &amp; found items since 2024.<br />
                Post a report | search | connect | recover your items.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by item, place, or ticket code (e.g. LF-2381)"
                    className="w-full rounded-xl border border-transparent bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                <button
                  onClick={() => openReport("found")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  I found something
                </button>
              </div>

              {/* App download badges */}
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 opacity-75">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white flex-none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.39-1.32 2.76-2.54 3.99zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <div className="leading-tight">
                    <p className="text-[10px] text-white/60">Coming Soon</p>
                    <p className="text-sm font-semibold text-white">App Store</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 opacity-75">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white flex-none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.18 23.76c.3.17.64.2.96.07l12.45-7.2-2.69-2.7-10.72 9.83zM.44 1.05C.17 1.37 0 1.83 0 2.4v19.2c0 .57.17 1.03.44 1.35l.07.07 10.76-10.76v-.25L.51.98l-.07.07zM20.12 9.53l-2.69-1.55-3.01 3.02 3.01 3.01 2.72-1.57c.78-.45.78-1.47-.03-1.91zM3.18.24L15.63 7.44l-2.69 2.69L2.22.3c.28-.16.65-.13.96-.06z"/>
                  </svg>
                  <div className="leading-tight">
                    <p className="text-[10px] text-white/60">Coming Soon</p>
                    <p className="text-sm font-semibold text-white">Google Play</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: live map */}
            <div className="h-48 pr-2 pb-4 sm:pr-6 lg:h-60">
              <LiveMap items={items} />
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-stone-100/90 backdrop-blur">
        <div className="mx-auto max-w-screen-2xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {[
              { id: "all", label: "All open", n: counts.all },
              { id: "lost", label: "Lost", n: counts.lost },
              { id: "found", label: "Found", n: counts.found },
              { id: "returned", label: "Returned", n: counts.returned },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition " +
                  (type === t.id
                    ? "border-teal-700 bg-teal-800 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-teal-300")
                }
              >
                {t.label}
                <span className={"font-mono text-xs " + (type === t.id ? "text-teal-200" : "text-slate-400")}>{t.n}</span>
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-200 " +
                  (showFilters || activeFilters
                    ? "border-teal-700 bg-teal-50 text-teal-800"
                    : "border-slate-300 bg-white text-slate-600 hover:border-teal-300")
                }
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
                {activeFilters > 0 && (
                  <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-700 px-1 font-mono text-xs text-white">
                    {activeFilters}
                  </span>
                )}
              </button>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-teal-200"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="az">A–Z</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Category</span>
                <div className="relative">
                  <select
                    value={cat}
                    onChange={(e) => setCat(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-200"
                  >
                    <option value="all">All categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Location</span>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    list="loc-list"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Area or landmark"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-200"
                  />
                  <datalist id="loc-list">
                    {locations.map((l) => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  When {type === "found" ? "found" : "lost"}
                </span>
                <div className="relative">
                  <select
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-200"
                  >
                    <option value="any">Any time</option>
                    <option value="today">Latest day</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="custom">Custom range…</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </label>

              {when === "custom" ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">From</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-200"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">To</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-200"
                    />
                  </label>
                </div>
              ) : (
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    disabled={!activeFilters}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="h-4 w-4" /> Clear filters
                  </button>
                </div>
              )}

              {when === "custom" && (
                <div className="flex justify-end sm:col-span-2 lg:col-span-4">
                  <button
                    onClick={clearFilters}
                    disabled={!activeFilters}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="h-4 w-4" /> Clear filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Board */}
      <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{visible.length}</span> {visible.length === 1 ? "ticket" : "tickets"} on the board
          </p>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-serif text-lg font-semibold text-slate-700">Nothing matches yet</p>
            <p className="mt-1 text-sm text-slate-500">Try clearing the filters, or file a report to start a new ticket.</p>
            <button
              onClick={() => openReport("lost")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" /> Report an item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((it) => (
              <TicketCard key={it.id} item={it} onOpen={setSelected} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-screen-2xl flex-col items-start justify-between gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:px-6">
          <p>FoundIt — Nigeria's verified community lost &amp; found board.</p>
          <button onClick={() => setShowConditions(true)} className="font-medium text-teal-700 hover:underline">
            Security, legal &amp; service-charge conditions
          </button>
        </div>
      </footer>

      {/* Overlays */}
      {selected && (
        <ItemDetail
          item={selected}
          onClose={() => setSelected(null)}
          user={user}
          onRequireAuth={() => { setAuthIntent("claim"); setAuth("signin"); }}
          onHandover={handleHandover}
        />
      )}
      {showConditions && <Conditions onClose={() => setShowConditions(false)} />}
      {report && (
        <Modal onClose={() => setReport(null)} wide>
          <ReportForm initialType={report} onCancel={() => setReport(null)} onSubmit={addItem} />
        </Modal>
      )}
      {auth && (
        <AuthModal
          mode={auth}
          intent={authIntent}
          onClose={() => { setAuth(null); setPendingReport(null); setAuthIntent(null); }}
          onAuth={handleAuth}
          onSwitch={() => setAuth(auth === "signup" ? "signin" : "signup")}
        />
      )}
      {resetPw && <ResetPasswordModal onClose={() => setResetPw(false)} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-[2000] flex -translate-x-1/2 items-center gap-3 rounded-xl bg-teal-900 px-4 py-3 text-sm text-white shadow-lg">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>
            {toast.type === "returned"
              ? <>Ticket <span className="font-mono text-amber-300">{toast.ref}</span> confirmed returned &amp; closed.</>
              : <>Ticket <span className="font-mono text-amber-300">{toast.ref}</span> posted to the board.</>}
          </span>
        </div>
      )}
    </div>
  );
}
