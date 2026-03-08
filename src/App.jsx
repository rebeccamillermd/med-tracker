import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "med-tracker-data-v1";

const COLORS = {
  bg: "#FDF6EE",
  card: "#FFFAF4",
  border: "#E8D9C5",
  accent: "#C8652B",
  accentLight: "#F4E4D4",
  accentMid: "#E8935A",
  text: "#2C1A0E",
  textMid: "#6B4C35",
  textLight: "#9E7B62",
  urgent: "#C8382B",
  urgentBg: "#FFF0EE",
  soon: "#B07D1A",
  soonBg: "#FFF8E6",
  ok: "#2A7A4B",
  okBg: "#EAF7F0",
  tagBg: "#EDE0D4",
};

const defaultData = {
  people: [
    { id: "me", name: "Me", color: "#C8652B" },
    { id: "dave", name: "Dave", color: "#2A6B3A" },
    { id: "guy", name: "Guy", color: "#2A7A9B" },
    { id: "lyra", name: "Lyra", color: "#7A2A9B" },
    { id: "ariel", name: "Ariel", color: "#B07D1A" },
  ],
  meds: [],
};

function formatDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysDiff(from, to) {
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

function getUpcomingDates(med) {
  // Returns next 3 request dates and pickup dates
  const base = new Date(med.lastFilled);
  const results = [];
  for (let i = 1; i <= 3; i++) {
    const cycleStart = addDays(base, med.cycleDays * (i - 1));
    const requestDate = addDays(cycleStart, med.requestOnDay - 1);
    const pickupDate = addDays(cycleStart, med.pickupOnDay - 1);
    results.push({ cycle: i, requestDate, pickupDate });
  }
  return results;
}

function urgencyLabel(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = daysDiff(today, date);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: COLORS.urgent, bg: COLORS.urgentBg };
  if (diff === 0) return { label: "Today", color: COLORS.urgent, bg: COLORS.urgentBg };
  if (diff <= 3) return { label: `In ${diff}d`, color: COLORS.urgent, bg: COLORS.urgentBg };
  if (diff <= 7) return { label: `In ${diff}d`, color: COLORS.soon, bg: COLORS.soonBg };
  return { label: `In ${diff}d`, color: COLORS.ok, bg: COLORS.okBg };
}

function Badge({ text, color, bg }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.04em",
      color,
      background: bg,
    }}>{text}</span>
  );
}

function DatePill({ date, label }) {
  const { label: urgLabel, color, bg } = urgencyLabel(date);
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 2,
      padding: "8px 12px",
      background: bg,
      borderRadius: 10,
      border: `1px solid ${color}33`,
      minWidth: 110,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: COLORS.textLight }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{formatDate(date)}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{urgLabel}</span>
    </div>
  );
}

function MedCard({ med, people, onEdit, onFilled, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const person = people.find(p => p.id === med.personId);
  const upcoming = getUpcomingDates(med);
  const nextRequest = upcoming[0].requestDate;
  const { label, color, bg } = urgencyLabel(nextRequest);

  return (
    <div style={{
      background: COLORS.card,
      border: `1.5px solid ${COLORS.border}`,
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      transition: "box-shadow 0.2s",
    }}>
      {/* Header */}
      <div
        style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: person?.color || COLORS.accent, flexShrink: 0
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{med.name}</div>
          <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 1 }}>
            {person?.name} · {med.cycleDays}d cycle · {med.dose || ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Badge text={label} color={color} bg={bg} />
          <span style={{ color: COLORS.textLight, fontSize: 16, transform: expanded ? "rotate(180deg)" : "none", transition: "0.2s" }}>▾</span>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, color: COLORS.textMid }}>
            Last filled: <strong>{formatDate(new Date(med.lastFilled))}</strong>
          </div>

          {/* Next 3 cycles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.map(({ cycle, requestDate, pickupDate }) => (
              <div key={cycle} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: COLORS.textLight }}>
                  Cycle {cycle}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <DatePill date={requestDate} label="Request by" />
                  <DatePill date={pickupDate} label="Pick up by" />
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <button
              onClick={() => onFilled(med.id)}
              style={{
                background: COLORS.accent, color: "#fff", border: "none",
                borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600,
                cursor: "pointer",
              }}
            >✓ Mark as filled today</button>
            <button
              onClick={() => onEdit(med)}
              style={{
                background: COLORS.accentLight, color: COLORS.accent, border: `1px solid ${COLORS.accentMid}`,
                borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600,
                cursor: "pointer",
              }}
            >Edit</button>
            <button
              onClick={() => onDelete(med.id)}
              style={{
                background: "transparent", color: COLORS.textLight, border: `1px solid ${COLORS.border}`,
                borderRadius: 8, padding: "7px 14px", fontSize: 13,
                cursor: "pointer",
              }}
            >Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MedModal({ med, people, onSave, onClose }) {
  const [form, setForm] = useState(med || {
    id: Date.now().toString(),
    personId: people[0]?.id || "",
    name: "",
    dose: "",
    cycleDays: 30,
    requestOnDay: 27,
    pickupOnDay: 29,
    lastFilled: new Date().toISOString().split("T")[0],
  });

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", borderRadius: 8,
    border: `1.5px solid ${COLORS.border}`,
    background: COLORS.bg,
    fontSize: 14, color: COLORS.text,
    outline: "none",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.06em",
    color: COLORS.textMid, marginBottom: 4,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(44,26,14,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: COLORS.card, borderRadius: 16, padding: 24,
        width: "100%", maxWidth: 460,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800, color: COLORS.text }}>
          {med ? "Edit Medication" : "Add Medication"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>For</label>
            <select value={form.personId} onChange={e => set("personId", e.target.value)} style={inputStyle}>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Medication Name</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} style={inputStyle} placeholder="e.g. Adderall XR" />
          </div>

          <div>
            <label style={labelStyle}>Dose / Notes</label>
            <input value={form.dose} onChange={e => set("dose", e.target.value)} style={inputStyle} placeholder="e.g. 20mg" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Cycle (days)</label>
              <input type="number" value={form.cycleDays} onChange={e => set("cycleDays", +e.target.value)} style={inputStyle} min={1} />
            </div>
            <div>
              <label style={labelStyle}>Request on day</label>
              <input type="number" value={form.requestOnDay} onChange={e => set("requestOnDay", +e.target.value)} style={inputStyle} min={1} />
            </div>
            <div>
              <label style={labelStyle}>Pickup by day</label>
              <input type="number" value={form.pickupOnDay} onChange={e => set("pickupOnDay", +e.target.value)} style={inputStyle} min={1} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Last Filled Date</label>
            <input type="date" value={form.lastFilled} onChange={e => set("lastFilled", e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            onClick={() => form.name.trim() && onSave(form)}
            style={{
              flex: 1, background: COLORS.accent, color: "#fff",
              border: "none", borderRadius: 10, padding: "11px",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}
          >Save</button>
          <button
            onClick={onClose}
            style={{
              background: COLORS.accentLight, color: COLORS.accent,
              border: `1px solid ${COLORS.accentMid}`, borderRadius: 10,
              padding: "11px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer",
            }}
          >Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PersonModal({ person, onSave, onClose }) {
  const [form, setForm] = useState(person || { id: Date.now().toString(), name: "", color: "#C8652B" });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(44,26,14,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: COLORS.card, borderRadius: 16, padding: 24,
        width: "100%", maxWidth: 340,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800, color: COLORS.text }}>
          {person ? "Edit Person" : "Add Person"}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: COLORS.textMid, marginBottom: 4 }}>Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${COLORS.border}`, background: COLORS.bg, fontSize: 14, color: COLORS.text, outline: "none", fontFamily: "inherit" }}
              placeholder="Child's name or 'Me'" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: COLORS.textMid, marginBottom: 4 }}>Color</label>
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              style={{ width: 48, height: 36, border: `1.5px solid ${COLORS.border}`, borderRadius: 8, cursor: "pointer", padding: 2 }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button onClick={() => form.name.trim() && onSave(form)}
            style={{ flex: 1, background: COLORS.accent, color: "#fff", border: "none", borderRadius: 10, padding: 11, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Save</button>
          <button onClick={onClose}
            style={{ background: COLORS.accentLight, color: COLORS.accent, border: `1px solid ${COLORS.accentMid}`, borderRadius: 10, padding: "11px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(null); // { type: "med"|"person", data?: ... }
  const [activeFilter, setActiveFilter] = useState("all");
  const [fillModal, setFillModal] = useState(null); // med id for custom date fill
  const [fillDate, setFillDate] = useState("");
  const [tab, setTab] = useState("meds"); // "meds" | "people"

  // Load from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setData(JSON.parse(saved));
      } else {
        setData(defaultData);
      }
    } catch {
      setData(defaultData);
    }
    setLoaded(true);
  }, []);

  // Save to storage whenever data changes
  useEffect(() => {
    if (!loaded || !data) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data, loaded]);

  const saveMed = useCallback((med) => {
    setData(d => {
      const exists = d.meds.find(m => m.id === med.id);
      return {
        ...d,
        meds: exists ? d.meds.map(m => m.id === med.id ? med : m) : [...d.meds, med],
      };
    });
    setModal(null);
  }, []);

  const deleteMed = useCallback((id) => {
    setData(d => ({ ...d, meds: d.meds.filter(m => m.id !== id) }));
  }, []);

  const markFilled = useCallback((id, date) => {
    const d = date || new Date().toISOString().split("T")[0];
    setData(prev => ({ ...prev, meds: prev.meds.map(m => m.id === id ? { ...m, lastFilled: d } : m) }));
  }, []);

  const savePerson = useCallback((person) => {
    setData(d => {
      const exists = d.people.find(p => p.id === person.id);
      return {
        ...d,
        people: exists ? d.people.map(p => p.id === person.id ? person : p) : [...d.people, person],
      };
    });
    setModal(null);
  }, []);

  const deletePerson = useCallback((id) => {
    setData(d => ({
      ...d,
      people: d.people.filter(p => p.id !== id),
      meds: d.meds.filter(m => m.personId !== id),
    }));
  }, []);

  if (!loaded || !data) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: COLORS.textMid, fontSize: 16 }}>Loading…</div>
      </div>
    );
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Sort meds by urgency of next request date
  const sortedMeds = [...data.meds].sort((a, b) => {
    const aNext = getUpcomingDates(a)[0].requestDate;
    const bNext = getUpcomingDates(b)[0].requestDate;
    return aNext - bNext;
  });

  const filteredMeds = activeFilter === "all"
    ? sortedMeds
    : sortedMeds.filter(m => m.personId === activeFilter);

  // Count urgent (≤3 days)
  const urgentCount = data.meds.filter(m => {
    const d = getUpcomingDates(m)[0].requestDate;
    return daysDiff(today, d) <= 3;
  }).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: COLORS.bg,
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: COLORS.text,
    }}>
      {/* Header */}
      <div style={{
        background: COLORS.accent,
        padding: "20px 20px 16px",
        color: "#fff",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.8, marginBottom: 4 }}>Family Rx</div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>Medication Tracker</h1>
            </div>
            {urgentCount > 0 && (
              <div style={{ background: COLORS.urgentBg, color: COLORS.urgent, borderRadius: 10, padding: "6px 12px", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                ⚠ {urgentCount} urgent
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
            {[["meds", "Medications"], ["people", "People"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                background: tab === key ? "rgba(255,255,255,0.25)" : "transparent",
                color: "#fff", border: "none",
                borderRadius: 8, padding: "6px 14px",
                fontSize: 13, fontWeight: tab === key ? 700 : 500,
                cursor: "pointer",
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px 16px 40px" }}>

        {tab === "meds" && (
          <>
            {/* Filter by person */}
            {data.people.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <button onClick={() => setActiveFilter("all")} style={{
                  background: activeFilter === "all" ? COLORS.accent : COLORS.tagBg,
                  color: activeFilter === "all" ? "#fff" : COLORS.textMid,
                  border: "none", borderRadius: 20, padding: "5px 14px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>All</button>
                {data.people.map(p => (
                  <button key={p.id} onClick={() => setActiveFilter(p.id)} style={{
                    background: activeFilter === p.id ? p.color : COLORS.tagBg,
                    color: activeFilter === p.id ? "#fff" : COLORS.textMid,
                    border: "none", borderRadius: 20, padding: "5px 14px",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>{p.name}</button>
                ))}
              </div>
            )}

            {/* Meds list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredMeds.length === 0 && (
                <div style={{
                  background: COLORS.card, border: `1.5px dashed ${COLORS.border}`,
                  borderRadius: 14, padding: "32px 20px", textAlign: "center",
                  color: COLORS.textLight, fontSize: 14,
                }}>
                  No medications yet. Add one below!
                </div>
              )}
              {filteredMeds.map(med => (
                <MedCard
                  key={med.id}
                  med={med}
                  people={data.people}
                  onEdit={m => setModal({ type: "med", data: m })}
                  onFilled={id => {
                    setFillModal(id);
                    setFillDate(new Date().toISOString().split("T")[0]);
                  }}
                  onDelete={deleteMed}
                />
              ))}
            </div>

            {/* Add med button */}
            <button
              onClick={() => setModal({ type: "med" })}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", marginTop: 14,
                background: COLORS.accentLight, color: COLORS.accent,
                border: `1.5px dashed ${COLORS.accentMid}`,
                borderRadius: 12, padding: "12px",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}
            >+ Add Medication</button>
          </>
        )}

        {tab === "people" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.people.map(p => {
                const count = data.meds.filter(m => m.personId === p.id).length;
                return (
                  <div key={p.id} style={{
                    background: COLORS.card, border: `1.5px solid ${COLORS.border}`,
                    borderRadius: 14, padding: "14px 16px",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 1 }}>{count} medication{count !== 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setModal({ type: "person", data: p })} style={{
                        background: COLORS.accentLight, color: COLORS.accent,
                        border: `1px solid ${COLORS.accentMid}`, borderRadius: 8,
                        padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>Edit</button>
                      <button onClick={() => deletePerson(p.id)} style={{
                        background: "transparent", color: COLORS.textLight,
                        border: `1px solid ${COLORS.border}`, borderRadius: 8,
                        padding: "5px 12px", fontSize: 12, cursor: "pointer",
                      }}>Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setModal({ type: "person" })}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", marginTop: 14,
                background: COLORS.accentLight, color: COLORS.accent,
                border: `1.5px dashed ${COLORS.accentMid}`,
                borderRadius: 12, padding: "12px",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}
            >+ Add Person</button>
          </>
        )}
      </div>

      {/* Fill date modal */}
      {fillModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(44,26,14,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 16,
        }} onClick={e => e.target === e.currentTarget && setFillModal(null)}>
          <div style={{
            background: COLORS.card, borderRadius: 16, padding: 24,
            width: "100%", maxWidth: 360,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 800, color: COLORS.text }}>
              When was it filled?
            </h2>
            <input type="date" value={fillDate} onChange={e => setFillDate(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${COLORS.border}`, background: COLORS.bg, fontSize: 14, color: COLORS.text, outline: "none", fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => { markFilled(fillModal, fillDate); setFillModal(null); }}
                style={{ flex: 1, background: COLORS.accent, color: "#fff", border: "none", borderRadius: 10, padding: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Confirm
              </button>
              <button onClick={() => setFillModal(null)}
                style={{ background: COLORS.accentLight, color: COLORS.accent, border: `1px solid ${COLORS.accentMid}`, borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal?.type === "med" && (
        <MedModal
          med={modal.data}
          people={data.people}
          onSave={saveMed}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "person" && (
        <PersonModal
          person={modal.data}
          onSave={savePerson}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
