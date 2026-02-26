import { useState, useEffect, useCallback, useRef } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────
const C = {
  bg: "#F4F1EB",
  card: "#FFF",
  border: "#D4CFC5",
  borderLight: "#EFECE4",
  navy: "#0F1F2E",
  teal: "#1B3A4A",
  forest: "#2A4F3A",
  green: "#3D6B2D",
  lime: "#5A7D2D",
  amber: "#7D5A2D",
  rust: "#C4855C",
  gold: "#8B7D3C",
  muted: "#8A8478",
  text: "#1A1A1A",
  sub: "#666",
  light: "#AAA",
  cream: "#FAFAF7",
  highlight: "#EEF3E8",
  highlightBorder: "#B8D4A0",
  signal: "#FDF6E3",
  signalText: "#8B7D3C",
};
const F = "'DM Sans', sans-serif";
const FH = "'Newsreader', Georgia, serif";
const FM = "'JetBrains Mono', monospace";

// ─── STORAGE LAYER ───────────────────────────────────────────
async function loadData(key, fallback) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}
async function saveData(key, data) {
  try {
    await window.storage.set(key, JSON.stringify(data));
  } catch (e) {
    console.warn("Storage save failed:", e);
  }
}

// ─── FILTER / ENUM DATA ─────────────────────────────────────
const SENIORITIES = [
  "C-Suite",
  "VP",
  "Director",
  "Founder/Owner",
  "Partner",
  "Manager",
  "Other",
];
const INDUSTRIES = [
  "Healthcare",
  "Legal",
  "Technology",
  "Real Estate",
  "Professional Services",
  "Finance",
  "Manufacturing",
  "Construction",
  "Other",
];
const SIGNALS_LIST = [
  "Changed jobs recently",
  "Posted this week",
  "In the news",
  "Mutual connections",
  "Active on LinkedIn",
];
const PIPELINE_STAGES = [
  "Identified",
  "Client Agreed",
  "Intro Sent",
  "Meeting Booked",
  "Outcome",
];
const STAGE_COLORS = {
  Identified: C.teal,
  "Client Agreed": C.forest,
  "Intro Sent": C.green,
  "Meeting Booked": C.lime,
  Outcome: C.amber,
};


// ─── EXECUTION LAYER (TASKS, SLAs, TEMPLATES) ─────────────────
const DEFAULT_STAGE_SLA_DAYS = {
  "Identified": 7,
  "Client Agreed": 3,
  "Intro Sent": 7,
  "Meeting Booked": 14,
  "Outcome": 0,
};

const DEFAULT_TEMPLATES = [
  {
    id: "tpl-ask-coordinates",
    name: "Ask client for email/phone",
    type: "ask_coordinates",
    body:
      "Hi {clientName} — quick question: what’s the best email (and/or phone) for {prospectName}?\n\nI’d like to reach out with a brief note and a simple next step.\n\nThank you,\n{advisorName}",
  },
  {
    id: "tpl-ask-intro",
    name: "Ask client to make intro",
    type: "ask_intro",
    body:
      "Hi {clientName} — would you be open to introducing me to {prospectName}?\n\nReason: {reason}\n\nIf yes, here’s a draft you can forward/edit:\n\n---\nSubject: Introduction — {advisorName} <> {prospectName}\n\nHi {prospectName},\n\nHope you’re doing well. I’d like to introduce you to {advisorName}. {advisorName} helps {valueProp}.\n\n{context}\n\nIf you’re open to it, would you be willing to do a quick 15-minute call? Here’s a link: {calendarLink}\n\nBest,\n{clientName}\n---\n\nThank you,\n{advisorName}",
  },
  {
    id: "tpl-followup-after-intro",
    name: "Advisor follow-up after intro",
    type: "advisor_followup",
    body:
      "Hi {prospectName} — thank you again for the introduction, and for taking the time.\n\nBased on what {clientName} shared, I thought it could be helpful to connect because {reason}.\n\nIf it’s useful, here is my calendar link: {calendarLink}\n\nBest,\n{advisorName}",
  },
];

function isoDate(d = new Date()) {
  return d.toISOString().split("T")[0];
}

function addDaysISO(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function makeReferralId(clientId, personId) {
  return `${clientId}__${personId}`;
}

function renderTemplate(body, vars) {
  return body.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}

const FILTER_PRESETS = [
  {
    name: "Business Owners in Metro",
    seniority: ["C-Suite", "Founder/Owner"],
    industries: [],
    locations: [],
  },
  {
    name: "Healthcare Professionals",
    seniority: ["Founder/Owner", "Partner", "Director"],
    industries: ["Healthcare"],
    locations: [],
  },
  {
    name: "Director+ All Industries",
    seniority: ["C-Suite", "VP", "Director", "Founder/Owner", "Partner"],
    industries: [],
    locations: [],
  },
  {
    name: "Legal & Prof. Services",
    seniority: [],
    industries: ["Legal", "Professional Services"],
    locations: [],
  },
  {
    name: "Tech Executives",
    seniority: ["C-Suite", "VP", "Director"],
    industries: ["Technology"],
    locations: [],
  },
];

// ─── DEMO DATA GENERATOR ─────────────────────────────────────
const demoFirstNames = [
  "Sarah",
  "Michael",
  "David",
  "Jennifer",
  "Andrew",
  "Lisa",
  "Daniel",
  "Rachel",
  "Kevin",
  "Emily",
  "Brian",
  "Amanda",
  "Steven",
  "Christine",
  "Mark",
  "Diana",
  "Richard",
  "Nicole",
  "Jason",
  "Laura",
  "Greg",
  "Samantha",
  "Peter",
  "Megan",
  "Thomas",
  "Karen",
  "Alex",
  "Heather",
  "Ryan",
  "Natalie",
];
const demoLastNames = [
  "Martinez",
  "Anderson",
  "Patel",
  "Kim",
  "O'Brien",
  "Nakamura",
  "Foster",
  "Reeves",
  "Goldman",
  "Thompson",
  "Vasquez",
  "Wheeler",
  "Chang",
  "Morrison",
  "Cooper",
  "Singh",
  "Brooks",
  "Yamamoto",
  "Fitzgerald",
  "Delgado",
];
const demoTitles = [
  { t: "CEO", s: "C-Suite" },
  { t: "CFO", s: "C-Suite" },
  { t: "COO", s: "C-Suite" },
  { t: "CMO", s: "C-Suite" },
  { t: "VP of Operations", s: "VP" },
  { t: "VP of Sales", s: "VP" },
  { t: "VP of Marketing", s: "VP" },
  { t: "Director of Finance", s: "Director" },
  { t: "Director of BD", s: "Director" },
  { t: "Practice Owner", s: "Founder/Owner" },
  { t: "Founder", s: "Founder/Owner" },
  { t: "Owner", s: "Founder/Owner" },
  { t: "Managing Partner", s: "Partner" },
  { t: "Senior Partner", s: "Partner" },
  { t: "Partner", s: "Partner" },
  { t: "Senior Manager", s: "Manager" },
  { t: "Dentist", s: "Founder/Owner" },
  { t: "Physician", s: "Founder/Owner" },
  { t: "Attorney", s: "Partner" },
  { t: "Principal", s: "Director" },
];
const demoCompanies = [
  { n: "Bay Area Orthopedics", i: "Healthcare" },
  { n: "Coastal Family Dentistry", i: "Healthcare" },
  { n: "Pacific Dermatology", i: "Healthcare" },
  { n: "Whitaker & Lane LLP", i: "Legal" },
  { n: "Morrison Legal Group", i: "Legal" },
  { n: "Nexus Systems", i: "Technology" },
  { n: "Cloudbridge Analytics", i: "Technology" },
  { n: "Vertex AI", i: "Technology" },
  { n: "Pinnacle Development", i: "Real Estate" },
  { n: "Bayshore Properties", i: "Real Estate" },
  { n: "Ascend Consulting", i: "Professional Services" },
  { n: "Bridgepoint Advisors", i: "Professional Services" },
  { n: "Pacific Capital Partners", i: "Finance" },
  { n: "Harbor Wealth Group", i: "Finance" },
  { n: "Ironworks Manufacturing", i: "Manufacturing" },
  { n: "Granite Construction Co.", i: "Construction" },
];
const demoLocations = [
  "San Francisco, CA",
  "Oakland, CA",
  "San Jose, CA",
  "Palo Alto, CA",
  "Sacramento, CA",
  "Los Angeles, CA",
  "Seattle, WA",
  "Portland, OR",
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateDemoConnections(clientId, count = 120) {
  const rand = seededRandom(clientId * 1000 + 42);
  const conns = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    const fn = demoFirstNames[Math.floor(rand() * demoFirstNames.length)];
    const ln = demoLastNames[Math.floor(rand() * demoLastNames.length)];
    const name = `${fn} ${ln}`;
    if (used.has(name)) continue;
    used.add(name);
    const ti = demoTitles[Math.floor(rand() * demoTitles.length)];
    const co = demoCompanies[Math.floor(rand() * demoCompanies.length)];
    const loc = demoLocations[Math.floor(rand() * demoLocations.length)];
    const sigs = [];
    if (rand() > 0.6) {
      const sh = [...SIGNALS_LIST].sort(() => rand() - 0.5);
      sigs.push(sh[0]);
      if (rand() > 0.7) sigs.push(sh[1]);
    }
    conns.push({
      id: `${clientId}-${i}`,
      name,
      initials: fn[0] + ln[0],
      title: ti.t,
      seniority: ti.s,
      company: co.n,
      industry: co.i,
      location: loc,
      connectedYears: Math.floor(rand() * 8) + 1,
      mutualConnections: Math.floor(rand() * 6),
      signals: sigs,
      activeOnLinkedIn: rand() > 0.4,
      avatarHue: Math.floor(rand() * 360),
      source: "demo",
    });
  }
  return conns;
}

// ─── REUSABLE UI COMPONENTS ──────────────────────────────────
function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15,31,46,0.45)",
          backdropFilter: "blur(2px)",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: C.card,
          borderRadius: 10,
          width,
          maxWidth: "90vw",
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 24px",
            borderBottom: `1px solid ${C.borderLight}`,
          }}
        >
          <h3
            style={{ fontFamily: FH, fontSize: 20, fontWeight: 400, margin: 0 }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              color: C.muted,
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea = false,
}) {
  const props = {
    value,
    onChange: (e) => onChange(e.target.value),
    placeholder,
    style: {
      width: "100%",
      padding: "10px 12px",
      border: `1px solid ${C.border}`,
      borderRadius: 6,
      fontFamily: F,
      fontSize: 13,
      background: C.card,
      outline: "none",
      boxSizing: "border-box",
      resize: textarea ? "vertical" : undefined,
      minHeight: textarea ? 80 : undefined,
    },
  };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.muted,
            marginBottom: 5,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      )}
      {textarea ? <textarea {...props} /> : <input type={type} {...props} />}
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant = "primary",
  style: s = {},
  disabled = false,
}) {
  const base = {
    fontFamily: F,
    fontSize: 12,
    fontWeight: 600,
    padding: "10px 18px",
    border: "none",
    borderRadius: 6,
    cursor: disabled ? "default" : "pointer",
    transition: "all 0.15s",
    opacity: disabled ? 0.4 : 1,
    ...s,
  };
  const variants = {
    primary: { background: C.forest, color: "#FFF" },
    secondary: {
      background: C.bg,
      color: C.teal,
      border: `1px solid ${C.border}`,
    },
    danger: { background: "#FFF", color: "#C44", border: "1px solid #E8C8C8" },
    ghost: { background: "transparent", color: C.muted, padding: "10px 12px" },
    amber: { background: C.amber, color: "#FFF" },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant] }}
    >
      {children}
    </button>
  );
}

function Pill({ label, active, onClick, color = C.teal }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: F,
        fontSize: 11,
        padding: "5px 12px",
        borderRadius: 20,
        cursor: "pointer",
        transition: "all 0.15s",
        fontWeight: active ? 600 : 400,
        background: active ? color : C.bg,
        color: active ? "#FFF" : C.teal,
        border: `1px solid ${active ? color : C.border}`,
      }}
    >
      {label}
    </button>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────
export default function Warmpath() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("clients");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [connections, setConnections] = useState([]);
  const [filters, setFilters] = useState({
    seniority: [],
    industries: [],
    locations: [],
    activeOnly: false,
    hasSignals: false,
  });
  const [shortlist, setShortlist] = useState([]);
  const [shortlistNotes, setShortlistNotes] = useState({});
  const [pipeline, setPipeline] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [advisorProfile, setAdvisorProfile] = useState({ advisorName: "Advisor", valueProp: "people like you with planning and decision-making", calendarLink: "" });
  const [packetOpen, setPacketOpen] = useState(false);
  const [activeReferralId, setActiveReferralId] = useState(null);
  const [activeTemplateId, setActiveTemplateId] = useState(DEFAULT_TEMPLATES[0].id);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [meetingResponses, setMeetingResponses] = useState({});
  const [meetingNotes, setMeetingNotes] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [meetingIndex, setMeetingIndex] = useState(0);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [newClient, setNewClient] = useState({
    name: "",
    title: "",
    linkedinUrl: "",
    notes: "",
  });
  const [importData, setImportData] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // ─── PERSISTENCE ───
  useEffect(() => {
    (async () => {
      const [c, p, t, tpl, prof] = await Promise.all([
        loadData("warmpath-clients", []),
        loadData("warmpath-pipeline", []),
        loadData("warmpath-tasks", []),
        loadData("warmpath-templates", DEFAULT_TEMPLATES),
        loadData("warmpath-advisor-profile", { advisorName: "Advisor", valueProp: "people like you with planning and decision-making", calendarLink: "" }),
      ]);
      setClients(c.length > 0 ? c : getStarterClients());
      setPipeline(p);
      setTasks(t);
      setTemplates(tpl && tpl.length ? tpl : DEFAULT_TEMPLATES);
      setAdvisorProfile(prof || { advisorName: "Advisor", valueProp: "people like you with planning and decision-making", calendarLink: "" });
      setReady(true);
    })();
  }, []);


  useEffect(() => {
    if (packetOpen && activeReferralId) {
      rebuildGeneratedMessage(pipeline.find((p) => p.id === activeReferralId) || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packetOpen, activeReferralId, activeTemplateId]);


  useEffect(() => {
    if (ready) saveData("warmpath-clients", clients);
  }, [clients, ready]);
  useEffect(() => {
    if (ready) saveData("warmpath-pipeline", pipeline);
  }, [pipeline, ready]);
  useEffect(() => {
    if (ready) saveData("warmpath-tasks", tasks);
  }, [tasks, ready]);
  useEffect(() => {
    if (ready) saveData("warmpath-templates", templates);
  }, [templates, ready]);
  useEffect(() => {
    if (ready) saveData("warmpath-advisor-profile", advisorProfile);
  }, [advisorProfile, ready]);


  function getStarterClients() {
    return [
      {
        id: "c1",
        name: "Robert Chen",
        title: "CEO, Pacific Dental Group",
        linkedinUrl: "",
        notes: "",
        connections: 847,
        lastReview: "2025-12-10",
        referrals: 6,
        created: "2025-09-01",
      },
      {
        id: "c2",
        name: "Maria Santos",
        title: "Managing Partner, Santos Law",
        linkedinUrl: "",
        notes: "",
        connections: 1203,
        lastReview: "2026-01-03",
        referrals: 9,
        created: "2025-08-15",
      },
      {
        id: "c3",
        name: "James Whitfield",
        title: "VP Engineering, Helios Tech",
        linkedinUrl: "",
        notes: "",
        connections: 634,
        lastReview: null,
        referrals: 0,
        created: "2025-11-20",
      },
      {
        id: "c4",
        name: "Dr. Priya Sharma",
        title: "Cardiologist, Bay Area Medical",
        linkedinUrl: "",
        notes: "",
        connections: 412,
        lastReview: "2025-11-18",
        referrals: 3,
        created: "2025-07-01",
      },
      {
        id: "c5",
        name: "Tom Richardson",
        title: "Founder, Ridge Construction",
        linkedinUrl: "",
        notes: "",
        connections: 289,
        lastReview: "2026-01-28",
        referrals: 4,
        created: "2025-10-10",
      },
      {
        id: "c6",
        name: "Angela Park",
        title: "CFO, Meridian Consulting",
        linkedinUrl: "",
        notes: "",
        connections: 956,
        lastReview: "2025-10-05",
        referrals: 2,
        created: "2025-06-01",
      },
    ];
  }

  function showToast(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  // ─── CLIENT CRUD ───
  function addClient() {
    if (!newClient.name.trim()) return;
    const client = {
      id: `c${Date.now()}`,
      name: newClient.name.trim(),
      title: newClient.title.trim(),
      linkedinUrl: newClient.linkedinUrl.trim(),
      notes: newClient.notes.trim(),
      connections: 0,
      lastReview: null,
      referrals: 0,
      created: new Date().toISOString().split("T")[0],
    };
    setClients((prev) => [client, ...prev]);
    setNewClient({ name: "", title: "", linkedinUrl: "", notes: "" });
    setShowAddClient(false);
    showToast(`${client.name} added to your roster`);
  }

  function updateClient(id, updates) {
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }

  function deleteClient(id) {
    setClients((prev) => prev.filter((c) => c.id !== id));
    setPipeline((prev) => prev.filter((p) => p.clientId !== id));
    if (selectedClient?.id === id) {
      setSelectedClient(null);
      setView("clients");
    }
    setEditingClient(null);
    showToast("Client removed");
  }

  // ─── CONNECTION DATA ───
  function loadConnections(client) {
    // Check for imported connections first, fall back to demo
    const imported = client._importedConnections;
    if (imported && imported.length > 0) {
      setConnections(imported);
    } else {
      const hash = client.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      setConnections(
        generateDemoConnections(hash, Math.min(client.connections || 120, 200))
      );
    }
  }

  function importConnections() {
    try {
      const parsed = JSON.parse(importData);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const formatted = arr.map((p, i) => ({
        id: `imp-${Date.now()}-${i}`,
        name: p.name || "Unknown",
        initials: (p.name || "UN")
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        title: p.title || p.position || "",
        seniority: p.seniority || inferSeniority(p.title || ""),
        company: p.company || p.organization || "",
        industry: p.industry || "Other",
        location: p.location || "",
        connectedYears: p.connectedYears || 0,
        mutualConnections: p.mutualConnections || p.mutuals || 0,
        signals: p.signals || [],
        activeOnLinkedIn: p.active !== false,
        avatarHue: Math.floor(Math.random() * 360),
        source: "imported",
      }));
      if (selectedClient) {
        const updated = {
          ...selectedClient,
          _importedConnections: formatted,
          connections: formatted.length,
        };
        updateClient(selectedClient.id, updated);
        setSelectedClient(updated);
        setConnections(formatted);
        showToast(
          `${formatted.length} connections imported for ${selectedClient.name}`
        );
      }
      setImportData("");
      setShowImport(false);
    } catch (e) {
      showToast("Invalid JSON — check format and try again");
    }
  }

  function inferSeniority(title) {
    const t = title.toLowerCase();
    if (/\b(ceo|cfo|coo|cmo|cto|chief)\b/.test(t)) return "C-Suite";
    if (/\bvp\b|vice president/.test(t)) return "VP";
    if (/\bdirector\b|principal/.test(t)) return "Director";
    if (/\bfounder\b|owner|dentist|physician|surgeon/.test(t))
      return "Founder/Owner";
    if (/\bpartner\b|attorney/.test(t)) return "Partner";
    if (/\bmanager\b/.test(t)) return "Manager";
    return "Other";
  }

  // ─── FILTERING ───
  const allLocations = [
    ...new Set(connections.map((c) => c.location).filter(Boolean)),
  ].sort();
  const filtered = connections.filter((c) => {
    if (filters.seniority.length && !filters.seniority.includes(c.seniority))
      return false;
    if (filters.industries.length && !filters.industries.includes(c.industry))
      return false;
    if (filters.locations.length && !filters.locations.includes(c.location))
      return false;
    if (filters.activeOnly && !c.activeOnLinkedIn) return false;
    if (filters.hasSignals && c.signals.length === 0) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !c.name.toLowerCase().includes(q) &&
        !c.title.toLowerCase().includes(q) &&
        !c.company.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const isOnShortlist = (id) => shortlist.some((s) => s.id === id);
  const addToShortlist = (person) => {
    if (!isOnShortlist(person.id)) setShortlist((prev) => [...prev, person]);
  };
  const removeFromShortlist = (id) =>
    setShortlist((prev) => prev.filter((s) => s.id !== id));
  const toggleFilter = (key, val) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(val)
        ? prev[key].filter((v) => v !== val)
        : [...prev[key], val],
    }));
  const clearFilters = () => {
    setFilters({
      seniority: [],
      industries: [],
      locations: [],
      activeOnly: false,
      hasSignals: false,
    });
    setSearchQuery("");
  };
  const applyPreset = (p) => {
    setFilters({
      seniority: p.seniority || [],
      industries: p.industries || [],
      locations: p.locations || [],
      activeOnly: false,
      hasSignals: false,
    });
    setShowFilterPanel(false);
  };
  const activeFilterCount =
    filters.seniority.length +
    filters.industries.length +
    filters.locations.length +
    (filters.activeOnly ? 1 : 0) +
    (filters.hasSignals ? 1 : 0);

  // ─── MEETING ───
  function startMeeting() {
    if (shortlist.length === 0) return;
    setMeetingIndex(0);
    setMeetingResponses({});
    setMeetingNotes({});
    setView("meeting");
  }
  function finishMeeting() {
    const nowHuman = new Date().toLocaleDateString();
    const createdAt = new Date().toISOString();
    const today = isoDate();

    const newItems = shortlist
      .map((person) => {
        const resp = meetingResponses[person.id] || "skip";
        const note = meetingNotes[person.id] || shortlistNotes[person.id] || "";
        const stage =
          resp === "strong"
            ? "Client Agreed"
            : resp === "casual"
            ? "Identified"
            : null;
        if (!stage) return null;

        const id = makeReferralId(selectedClient.id, person.id);
        const nextDueDate =
          DEFAULT_STAGE_SLA_DAYS[stage] > 0
            ? addDaysISO(today, DEFAULT_STAGE_SLA_DAYS[stage])
            : null;

        return {
          id,
          personId: person.id,
          person: {
            ...person,
            linkedinUrl: person.linkedinUrl || "",
            email: person.email || "",
            phone: person.phone || "",
          },
          contact: {
            email: person.email || "",
            phone: person.phone || "",
            linkedinUrl: person.linkedinUrl || "",
          },
          stage,
          note,
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          date: nowHuman,
          createdAt,
          updatedAt: createdAt,
          nextDueDate,
          response: resp,
        };
      })
      .filter(Boolean);

    // Add items, avoiding duplicates by referral id (client+person)
    setPipeline((prev) => [
      ...prev,
      ...newItems.filter((ni) => !prev.some((p) => p.id === ni.id)),
    ]);

    // Auto-create "collect coordinates" tasks for strong intros missing email/phone
    const coordTasks = newItems
      .filter((i) => i.stage === "Client Agreed")
      .filter((i) => !(i.contact.email || i.contact.phone))
      .map((i) => ({
        id: `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        referralId: i.id,
        type: "ask_coordinates",
        title: `Ask ${i.clientName} for best email/phone for ${i.person.name}`,
        dueDate: addDaysISO(today, 2),
        status: "open",
        createdAt,
        completedAt: null,
      }));

    if (coordTasks.length) setTasks((prev) => [...coordTasks, ...prev]);

    updateClient(selectedClient.id, {
      lastReview: new Date().toISOString().split("T")[0],
      referrals:
        (selectedClient.referrals || 0) +
        newItems.filter((i) => i.stage === "Client Agreed").length,
    });

    setView("tracker");
    showToast(
      `${newItems.filter((i) => i.stage === "Client Agreed").length} intros added to pipeline`
    );
  }
  }
  const updateStage = (id, s) =>
    setPipeline((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const today = isoDate();
        const nextDueDate =
          DEFAULT_STAGE_SLA_DAYS[s] > 0 ? addDaysISO(today, DEFAULT_STAGE_SLA_DAYS[s]) : null;
        return { ...p, stage: s, updatedAt: new Date().toISOString(), nextDueDate };
      })
    );
  const removePipelineItem = (id) =>
    setPipeline((prev) => prev.filter((p) => p.id !== id));


  function openPacket(referralId) {
    setActiveReferralId(referralId);
    setPacketOpen(true);
  }

  const activeReferral = pipeline.find((p) => p.id === activeReferralId) || null;

  function upsertReferral(referralId, patch) {
    setPipeline((prev) =>
      prev.map((p) =>
        p.id === referralId
          ? { ...p, ...patch, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }

  function addTask(referralId, title, type = "generic", dueDays = 2) {
    const createdAt = new Date().toISOString();
    const today = isoDate();
    const task = {
      id: `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      referralId,
      type,
      title,
      dueDate: addDaysISO(today, dueDays),
      status: "open",
      createdAt,
      completedAt: null,
    };
    setTasks((prev) => [task, ...prev]);
    return task.id;
  }

  function completeTask(taskId) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: "done", completedAt: new Date().toISOString() }
          : t
      )
    );
  }

  function rebuildGeneratedMessage(referral = activeReferral) {
    if (!referral) return;
    const tpl = templates.find((t) => t.id === activeTemplateId) || templates[0];
    const vars = {
      clientName: referral.clientName,
      prospectName: referral.person?.name || "",
      advisorName: advisorProfile.advisorName || "Advisor",
      valueProp: advisorProfile.valueProp || "",
      calendarLink: advisorProfile.calendarLink || "",
      context: referral.note || "",
      reason: referral.note ? referral.note : "it seems like a good fit",
    };
    setGeneratedMessage(renderTemplate(tpl.body, vars));
  }

  // ─── CLIENT SELECT ───
  function selectClient(client) {
    setSelectedClient(client);
    setShortlist([]);
    setShortlistNotes({});
    clearFilters();
    loadConnections(client);
    setView("browse");
  }

  const filteredClients = clients.filter((c) => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.title || "").toLowerCase().includes(q)
    );
  });

  if (!ready)
    return (
      <div
        style={{
          fontFamily: F,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: C.bg,
          color: C.muted,
        }}
      >
        Loading Warmpath...
      </div>
    );

  return (
    <div
      style={{
        fontFamily: F,
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 300,
            background: C.navy,
            color: "#FFF",
            fontFamily: F,
            fontSize: 13,
            fontWeight: 500,
            padding: "12px 24px",
            borderRadius: 8,
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}
        >
          {toast}
        </div>
      )}

      {/* ─── NAV ─── */}
      <div
        style={{
          background: C.navy,
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          height: 52,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          onClick={() => {
            setView("clients");
            setSelectedClient(null);
            setShortlist([]);
            clearFilters();
          }}
          style={{
            fontFamily: FH,
            fontSize: 20,
            fontWeight: 400,
            color: C.bg,
            cursor: "pointer",
            marginRight: 32,
            letterSpacing: -0.3,
          }}
        >
          Warmpath
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {[
            { key: "clients", label: "Clients" },
            { key: "browse", label: "Browse", disabled: !selectedClient },
            {
              key: "meeting",
              label: "Meeting",
              disabled: shortlist.length === 0,
            },
            { key: "today", label: "Today" },
             { key: "tracker", label: "Pipeline" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => !tab.disabled && setView(tab.key)}
              style={{
                fontFamily: F,
                fontSize: 12,
                fontWeight: view === tab.key ? 600 : 400,
                padding: "8px 16px",
                border: "none",
                borderRadius: 4,
                background:
                  view === tab.key ? "rgba(255,255,255,0.12)" : "transparent",
                color: tab.disabled
                  ? "rgba(255,255,255,0.2)"
                  : view === tab.key
                  ? C.bg
                  : "rgba(255,255,255,0.5)",
                cursor: tab.disabled ? "default" : "pointer",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
              {tab.key === "tracker" && pipeline.length > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    background: C.lime,
                    borderRadius: 8,
                    padding: "1px 6px",
                    fontSize: 10,
                    color: "#FFF",
                  }}
                >
                  {pipeline.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {selectedClient && view !== "clients" && (
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background: C.forest,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "#FFF",
              }}
            >
              {selectedClient.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)}
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              {selectedClient.name}
            </span>
          </div>
        )}
      </div>

      {/* ════════════════════════ CLIENTS VIEW ════════════════════════ */}
      {view === "clients" && (
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: FH,
                  fontSize: 28,
                  fontWeight: 300,
                  margin: "0 0 4px",
                }}
              >
                Your Clients
              </h1>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                Select a client to browse their connections and build a referral
                shortlist.
              </p>
            </div>
            <Btn
              onClick={() => {
                setNewClient({
                  name: "",
                  title: "",
                  linkedinUrl: "",
                  notes: "",
                });
                setShowAddClient(true);
              }}
            >
              + Add Client
            </Btn>
          </div>

          {/* Client search */}
          <input
            type="text"
            placeholder="Search clients..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              fontFamily: F,
              fontSize: 13,
              background: C.card,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 16,
            }}
          />

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            {filteredClients.map((client) => (
              <div
                key={client.id}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "16px 18px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                }}
                onClick={() => selectClient(client)}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = C.forest;
                  e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(0,0,0,0.06)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    background: `linear-gradient(135deg, ${C.teal}, ${C.forest})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#FFF",
                    flexShrink: 0,
                  }}
                >
                  {client.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}
                  >
                    {client.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.muted,
                      marginBottom: 5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {client.title}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <span
                      style={{ fontFamily: FM, fontSize: 10, color: C.forest }}
                    >
                      {client.connections} conn.
                    </span>
                    {client.referrals > 0 && (
                      <span
                        style={{ fontFamily: FM, fontSize: 10, color: C.amber }}
                      >
                        {client.referrals} referrals
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {client.lastReview ? (
                    <div style={{ fontSize: 10, color: C.muted }}>
                      Reviewed
                      <br />
                      <span style={{ fontFamily: FM }}>
                        {client.lastReview}
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{ fontSize: 10, color: C.rust, fontWeight: 500 }}
                    >
                      New
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingClient(client);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 10,
                      color: C.muted,
                      cursor: "pointer",
                      marginTop: 4,
                      textDecoration: "underline",
                    }}
                  >
                    edit
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredClients.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                color: C.muted,
              }}
            >
              <div style={{ fontSize: 14, marginBottom: 8 }}>
                {clientSearch
                  ? "No clients match your search"
                  : "No clients yet"}
              </div>
              <Btn onClick={() => setShowAddClient(true)}>
                Add Your First Client
              </Btn>
            </div>
          )}

          {/* Pipeline summary */}
          {pipeline.length > 0 && (
            <div
              style={{
                marginTop: 24,
                background: C.teal,
                borderRadius: 8,
                padding: "16px 20px",
                color: "#FFF",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  opacity: 0.4,
                  marginBottom: 10,
                }}
              >
                Referral Pipeline
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {PIPELINE_STAGES.map((stage) => (
                  <div
                    key={stage}
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.07)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{ fontFamily: FM, fontSize: 18, fontWeight: 500 }}
                    >
                      {pipeline.filter((p) => p.stage === stage).length}
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>
                      {stage}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setView("tracker")}
                style={{
                  marginTop: 10,
                  fontFamily: F,
                  fontSize: 11,
                  fontWeight: 500,
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: 4,
                  padding: "7px 14px",
                  color: "#FFF",
                  cursor: "pointer",
                }}
              >
                View Pipeline →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════ BROWSE VIEW ════════════════════════ */}
      {view === "browse" && selectedClient && (
        <div style={{ display: "flex", height: "calc(100vh - 52px)" }}>
          <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
            {/* Search + filters */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  fontFamily: F,
                  fontSize: 13,
                  background: C.card,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <Btn
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                variant={activeFilterCount > 0 ? "primary" : "secondary"}
              >
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Btn>
              <Btn
                onClick={() => setShowImport(true)}
                variant="secondary"
                style={{ fontSize: 11, padding: "10px 12px" }}
              >
                Import
              </Btn>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  style={{
                    fontFamily: F,
                    fontSize: 11,
                    color: C.muted,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter panel */}
            {showFilterPanel && (
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "14px 18px",
                  marginBottom: 14,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: 1.2,
                      textTransform: "uppercase",
                      color: C.muted,
                      marginBottom: 6,
                    }}
                  >
                    Presets
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {FILTER_PRESETS.map((p) => (
                      <Pill
                        key={p.name}
                        label={p.name}
                        active={false}
                        onClick={() => applyPreset(p)}
                      />
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 14,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        color: C.muted,
                        marginBottom: 6,
                      }}
                    >
                      Seniority
                    </div>
                    {SENIORITIES.map((s) => (
                      <label
                        key={s}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          marginBottom: 3,
                          cursor: "pointer",
                          color: "#444",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={filters.seniority.includes(s)}
                          onChange={() => toggleFilter("seniority", s)}
                          style={{ accentColor: C.forest }}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        color: C.muted,
                        marginBottom: 6,
                      }}
                    >
                      Industry
                    </div>
                    {INDUSTRIES.map((ind) => (
                      <label
                        key={ind}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          marginBottom: 3,
                          cursor: "pointer",
                          color: "#444",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={filters.industries.includes(ind)}
                          onChange={() => toggleFilter("industries", ind)}
                          style={{ accentColor: C.forest }}
                        />
                        {ind}
                      </label>
                    ))}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        color: C.muted,
                        marginBottom: 6,
                      }}
                    >
                      Location
                    </div>
                    {allLocations.slice(0, 8).map((loc) => (
                      <label
                        key={loc}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          marginBottom: 3,
                          cursor: "pointer",
                          color: "#444",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={filters.locations.includes(loc)}
                          onChange={() => toggleFilter("locations", loc)}
                          style={{ accentColor: C.forest }}
                        />
                        {loc}
                      </label>
                    ))}
                    <div
                      style={{
                        borderTop: `1px solid ${C.borderLight}`,
                        marginTop: 6,
                        paddingTop: 6,
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          marginBottom: 3,
                          cursor: "pointer",
                          color: "#444",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={filters.activeOnly}
                          onChange={() =>
                            setFilters((p) => ({
                              ...p,
                              activeOnly: !p.activeOnly,
                            }))
                          }
                          style={{ accentColor: C.forest }}
                        />
                        Active on LinkedIn
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          cursor: "pointer",
                          color: "#444",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={filters.hasSignals}
                          onChange={() =>
                            setFilters((p) => ({
                              ...p,
                              hasSignals: !p.hasSignals,
                            }))
                          }
                          style={{ accentColor: C.forest }}
                        />
                        Has signals
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Count */}
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
              <span style={{ fontFamily: FM, fontWeight: 500, color: C.teal }}>
                {filtered.length}
              </span>{" "}
              connections
              {activeFilterCount > 0 && (
                <span> (from {connections.length})</span>
              )}
              {" · "}
              <strong>{selectedClient.name}</strong>'s network
              {connections.length > 0 &&
                connections[0].source === "imported" && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 3,
                      background: C.highlight,
                      color: C.forest,
                      fontWeight: 500,
                    }}
                  >
                    Imported data
                  </span>
                )}
              {connections.length > 0 && connections[0].source === "demo" && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 3,
                    background: C.signal,
                    color: C.signalText,
                    fontWeight: 500,
                  }}
                >
                  Demo data
                </span>
              )}
            </div>

            {/* Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {filtered.map((person) => {
                const onList = isOnShortlist(person.id);
                return (
                  <div
                    key={person.id}
                    style={{
                      background: onList ? C.highlight : C.card,
                      border: `1px solid ${
                        onList ? C.highlightBorder : C.border
                      }`,
                      borderRadius: 6,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      transition: "all 0.15s",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        background: `hsl(${person.avatarHue}, 25%, 42%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#FFF",
                        flexShrink: 0,
                      }}
                    >
                      {person.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {person.name}
                        </span>
                        {person.activeOnLinkedIn && (
                          <span style={{ fontSize: 7, color: C.forest }}>
                            ●
                          </span>
                        )}
                      </div>
                      <div
                        style={{ fontSize: 11, color: C.sub, marginBottom: 3 }}
                      >
                        {person.title} · {person.company}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 10, color: C.muted }}>
                          {person.location}
                        </span>
                        {person.connectedYears > 0 && (
                          <>
                            <span style={{ fontSize: 10, color: C.light }}>
                              ·
                            </span>
                            <span style={{ fontSize: 10, color: C.muted }}>
                              {person.connectedYears}y connected
                            </span>
                          </>
                        )}
                        {person.mutualConnections > 0 && (
                          <>
                            <span style={{ fontSize: 10, color: C.light }}>
                              ·
                            </span>
                            <span style={{ fontSize: 10, color: C.forest }}>
                              {person.mutualConnections} mutual
                            </span>
                          </>
                        )}
                      </div>
                      {person.signals.length > 0 && (
                        <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                          {person.signals.map((sig) => (
                            <span
                              key={sig}
                              style={{
                                fontSize: 9,
                                padding: "2px 6px",
                                borderRadius: 3,
                                background: C.signal,
                                color: C.signalText,
                                fontWeight: 500,
                              }}
                            >
                              {sig}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onList
                          ? removeFromShortlist(person.id)
                          : addToShortlist(person);
                      }}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        border: "none",
                        cursor: "pointer",
                        flexShrink: 0,
                        background: onList ? C.forest : C.borderLight,
                        color: onList ? "#FFF" : C.muted,
                        fontSize: 16,
                        fontWeight: 300,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      {onList ? "✓" : "+"}
                    </button>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 24px",
                    color: C.muted,
                  }}
                >
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    No connections match
                  </div>
                  <button
                    onClick={clearFilters}
                    style={{
                      fontFamily: F,
                      fontSize: 12,
                      color: C.forest,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SHORTLIST SIDEBAR */}
          <div
            style={{
              width: 280,
              background: C.card,
              borderLeft: `1px solid ${C.border}`,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: `1px solid ${C.borderLight}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>Shortlist</div>
                <span
                  style={{
                    fontFamily: FM,
                    fontSize: 12,
                    color: shortlist.length >= 8 ? C.forest : C.muted,
                  }}
                >
                  {shortlist.length}
                </span>
              </div>
              {shortlist.length > 0 && shortlist.length < 8 && (
                <div style={{ fontSize: 10, color: C.rust, marginTop: 3 }}>
                  Aim for 8–15
                </div>
              )}
              {shortlist.length >= 8 && shortlist.length <= 15 && (
                <div style={{ fontSize: 10, color: C.forest, marginTop: 3 }}>
                  Ready for review
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "6px 0" }}>
              {shortlist.map((person) => (
                <div
                  key={person.id}
                  style={{
                    padding: "8px 16px",
                    borderBottom: `1px solid #F5F3EE`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        background: `hsl(${person.avatarHue}, 25%, 42%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 7,
                        fontWeight: 600,
                        color: "#FFF",
                        flexShrink: 0,
                      }}
                    >
                      {person.initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {person.name}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: C.muted,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {person.title}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromShortlist(person.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: C.rust,
                        fontSize: 13,
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Note..."
                    value={shortlistNotes[person.id] || ""}
                    onChange={(e) =>
                      setShortlistNotes((prev) => ({
                        ...prev,
                        [person.id]: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "4px 7px",
                      border: `1px solid ${C.borderLight}`,
                      borderRadius: 4,
                      fontFamily: F,
                      fontSize: 10,
                      color: "#555",
                      background: C.cream,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
              {shortlist.length === 0 && (
                <div
                  style={{
                    padding: "28px 16px",
                    textAlign: "center",
                    color: C.light,
                    fontSize: 11,
                  }}
                >
                  Tap + to build your shortlist
                </div>
              )}
            </div>
            {shortlist.length > 0 && (
              <div
                style={{
                  padding: "12px 16px",
                  borderTop: `1px solid ${C.borderLight}`,
                }}
              >
                <Btn
                  onClick={startMeeting}
                  style={{ width: "100%", padding: "10px 0" }}
                >
                  Start Client Review →
                </Btn>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════ MEETING VIEW ════════════════════════ */}
      {view === "meeting" && shortlist.length > 0 && (
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: C.muted,
                  marginBottom: 4,
                }}
              >
                Client Review
              </div>
              <h2
                style={{
                  fontFamily: FH,
                  fontSize: 22,
                  fontWeight: 300,
                  margin: 0,
                }}
              >
                With{" "}
                <span style={{ fontStyle: "italic" }}>
                  {selectedClient.name}
                </span>
              </h2>
            </div>
            <div style={{ fontFamily: FM, fontSize: 12, color: C.muted }}>
              {Object.keys(meetingResponses).length}/{shortlist.length}
            </div>
          </div>

          {/* Progress */}
          <div style={{ display: "flex", gap: 3, marginBottom: 20 }}>
            {shortlist.map((p, i) => {
              const r = meetingResponses[p.id];
              return (
                <div
                  key={p.id}
                  onClick={() => setMeetingIndex(i)}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background:
                      r === "strong"
                        ? C.forest
                        : r === "casual"
                        ? "#D4A843"
                        : r === "skip"
                        ? C.border
                        : i === meetingIndex
                        ? C.teal
                        : "#E5E0D5",
                  }}
                />
              );
            })}
          </div>

          {/* Card */}
          {(() => {
            const person = shortlist[meetingIndex];
            if (!person) return null;
            const response = meetingResponses[person.id];
            return (
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  overflow: "hidden",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    padding: "24px 24px 18px",
                    display: "flex",
                    gap: 16,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      background: `hsl(${person.avatarHue}, 25%, 42%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#FFF",
                      flexShrink: 0,
                    }}
                  >
                    {person.initials}
                  </div>
                  <div>
                    <div
                      style={{ fontSize: 18, fontWeight: 600, marginBottom: 3 }}
                    >
                      {person.name}
                    </div>
                    <div
                      style={{ fontSize: 13, color: C.sub, marginBottom: 2 }}
                    >
                      {person.title}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      {person.company}
                    </div>
                    <div style={{ fontSize: 11, color: C.light, marginTop: 5 }}>
                      {person.location}
                      {person.connectedYears > 0
                        ? ` · ${person.connectedYears}y connected`
                        : ""}
                    </div>
                    {person.mutualConnections > 0 && (
                      <div
                        style={{ fontSize: 11, color: C.forest, marginTop: 2 }}
                      >
                        {person.mutualConnections} mutual connections
                      </div>
                    )}
                  </div>
                </div>
                {person.signals.length > 0 && (
                  <div
                    style={{ padding: "0 24px 14px", display: "flex", gap: 5 }}
                  >
                    {person.signals.map((sig) => (
                      <span
                        key={sig}
                        style={{
                          fontSize: 10,
                          padding: "3px 9px",
                          borderRadius: 4,
                          background: C.signal,
                          color: C.signalText,
                          fontWeight: 500,
                        }}
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                )}
                {shortlistNotes[person.id] && (
                  <div style={{ padding: "0 24px 14px" }}>
                    <div
                      style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}
                    >
                      Your prep note
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.sub,
                        fontStyle: "italic",
                      }}
                    >
                      {shortlistNotes[person.id]}
                    </div>
                  </div>
                )}
                <div
                  style={{
                    padding: "14px 24px",
                    background: C.cream,
                    borderTop: `1px solid ${C.borderLight}`,
                  }}
                >
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    {[
                      {
                        key: "strong",
                        label: "Know Well — Intro",
                        color: C.forest,
                        bg: "#E8F0E8",
                      },
                      {
                        key: "casual",
                        label: "Know Casually",
                        color: C.gold,
                        bg: C.signal,
                      },
                      {
                        key: "skip",
                        label: "Don't Know",
                        color: C.muted,
                        bg: C.borderLight,
                      },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() =>
                          setMeetingResponses((prev) => ({
                            ...prev,
                            [person.id]: opt.key,
                          }))
                        }
                        style={{
                          flex: 1,
                          fontFamily: F,
                          fontSize: 11,
                          fontWeight: response === opt.key ? 600 : 400,
                          padding: "9px 6px",
                          borderRadius: 6,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          lineHeight: 1.3,
                          background: response === opt.key ? opt.color : opt.bg,
                          color: response === opt.key ? "#FFF" : opt.color,
                          border: `1px solid ${
                            response === opt.key ? opt.color : "transparent"
                          }`,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Client context: 'Just sold her practice'..."
                    value={meetingNotes[person.id] || ""}
                    onChange={(e) =>
                      setMeetingNotes((prev) => ({
                        ...prev,
                        [person.id]: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      fontFamily: F,
                      fontSize: 12,
                      background: C.card,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Nav */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Btn
              onClick={() => setMeetingIndex(Math.max(0, meetingIndex - 1))}
              variant="secondary"
              disabled={meetingIndex === 0}
            >
              ← Prev
            </Btn>
            <span style={{ fontFamily: FM, fontSize: 12, color: C.muted }}>
              {meetingIndex + 1} / {shortlist.length}
            </span>
            {meetingIndex < shortlist.length - 1 ? (
              <Btn onClick={() => setMeetingIndex(meetingIndex + 1)}>
                Next →
              </Btn>
            ) : (
              <Btn onClick={finishMeeting} variant="amber">
                Finish Review →
              </Btn>
            )}
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            {[
              {
                label: "Intros",
                count: Object.values(meetingResponses).filter(
                  (r) => r === "strong"
                ).length,
                color: C.forest,
              },
              {
                label: "Casual",
                count: Object.values(meetingResponses).filter(
                  (r) => r === "casual"
                ).length,
                color: C.gold,
              },
              {
                label: "Skip",
                count: Object.values(meetingResponses).filter(
                  (r) => r === "skip"
                ).length,
                color: C.muted,
              },
              {
                label: "Left",
                count: shortlist.length - Object.keys(meetingResponses).length,
                color: C.border,
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "7px 0",
                  borderRadius: 6,
                  background: C.card,
                  border: `1px solid ${C.borderLight}`,
                }}
              >
                <div
                  style={{
                    fontFamily: FM,
                    fontSize: 16,
                    fontWeight: 500,
                    color: s.color,
                  }}
                >
                  {s.count}
                </div>
                <div style={{ fontSize: 9, color: C.muted }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      
      {/* ════════════════════════ TODAY VIEW ════════════════════════ */}
      {view === "today" && (
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
            <div>
              <h2 style={{ fontFamily: FH, fontSize: 26, fontWeight: 300, margin: "0 0 3px" }}>Today</h2>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                Prioritized follow-ups across your referrals
              </p>
            </div>
            <Btn
              variant="secondary"
              onClick={() => setView("tracker")}
            >
              View Pipeline
            </Btn>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>
                Open Tasks
              </div>
              {tasks.filter((t) => t.status === "open").length === 0 ? (
                <div style={{ fontSize: 12, color: C.light }}>No open tasks.</div>
              ) : (
                tasks
                  .filter((t) => t.status === "open")
                  .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
                  .slice(0, 20)
                  .map((t) => {
                    const r = pipeline.find((p) => p.id === t.referralId);
                    return (
                      <div key={t.id} style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 10, marginTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{t.title}</div>
                            {r && (
                              <div style={{ fontSize: 11, color: C.muted }}>
                                {r.person?.name} · via {r.clientName} · {r.stage}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: C.light, marginTop: 2 }}>Due {t.dueDate}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <Btn
                              variant="secondary"
                              style={{ padding: "6px 10px", fontSize: 11 }}
                              onClick={() => {
                                if (r) {
                                  setView("tracker");
                                  openPacket(r.id);
                                }
                              }}
                              disabled={!r}
                            >
                              Open
                            </Btn>
                            <Btn
                              variant="primary"
                              style={{ padding: "6px 10px", fontSize: 11 }}
                              onClick={() => completeTask(t.id)}
                            >
                              Done
                            </Btn>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>
                Stale Referrals
              </div>
              {pipeline.filter((p) => p.nextDueDate && p.stage !== "Outcome" && p.nextDueDate < isoDate()).length === 0 ? (
                <div style={{ fontSize: 12, color: C.light }}>Nothing overdue.</div>
              ) : (
                pipeline
                  .filter((p) => p.nextDueDate && p.stage !== "Outcome" && p.nextDueDate < isoDate())
                  .sort((a, b) => (a.nextDueDate || "").localeCompare(b.nextDueDate || ""))
                  .slice(0, 20)
                  .map((p) => (
                    <div key={p.id} style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 10, marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{p.person?.name}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{p.person?.title}</div>
                          <div style={{ fontSize: 11, color: C.light, marginTop: 2 }}>
                            {p.stage} · due {p.nextDueDate} · via {p.clientName}
                          </div>
                        </div>
                        <Btn
                          variant="secondary"
                          style={{ padding: "6px 10px", fontSize: 11, flexShrink: 0 }}
                          onClick={() => {
                            setView("tracker");
                            openPacket(p.id);
                          }}
                        >
                          Open
                        </Btn>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div style={{ marginTop: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>
              Advisor Settings
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Advisor name" value={advisorProfile.advisorName} onChange={(v) => setAdvisorProfile((p) => ({ ...p, advisorName: v }))} />
              <Input label="Calendar link" value={advisorProfile.calendarLink} onChange={(v) => setAdvisorProfile((p) => ({ ...p, calendarLink: v }))} placeholder="https://calendly.com/..." />
            </div>
            <Input label="Value prop (used in templates)" value={advisorProfile.valueProp} onChange={(v) => setAdvisorProfile((p) => ({ ...p, valueProp: v }))} />
          </div>
        </div>
      )}

{/* ════════════════════════ PIPELINE VIEW ════════════════════════ */}
      {view === "tracker" && (
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 20,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: FH,
                  fontSize: 26,
                  fontWeight: 300,
                  margin: "0 0 3px",
                }}
              >
                Referral Pipeline
              </h2>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                {pipeline.length} referral{pipeline.length !== 1 ? "s" : ""} in
                progress
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {selectedClient && (
                <Btn onClick={() => setView("browse")} variant="secondary">
                  Browse Connections
                </Btn>
              )}
              {pipeline.length > 0 && (
                <Btn
                  onClick={() => {
                    if (confirm("Clear all pipeline items?")) setPipeline([]);
                  }}
                  variant="danger"
                >
                  Clear All
                </Btn>
              )}
            </div>
          </div>

          {pipeline.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "56px 24px",
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>
                No referrals in the pipeline yet
              </div>
              <div style={{ fontSize: 12, color: C.light }}>
                Select a client → browse connections → build shortlist → run
                review
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              {PIPELINE_STAGES.map((stage) => {
                const items = pipeline.filter((p) => p.stage === stage);
                return (
                  <div key={stage} style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        background: STAGE_COLORS[stage],
                        borderRadius: "6px 6px 0 0",
                        padding: "9px 12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{ fontSize: 11, fontWeight: 600, color: "#FFF" }}
                      >
                        {stage}
                      </span>
                      <span
                        style={{
                          fontFamily: FM,
                          fontSize: 10,
                          color: "rgba(255,255,255,0.5)",
                        }}
                      >
                        {items.length}
                      </span>
                    </div>
                    <div
                      style={{
                        background: C.cream,
                        border: `1px solid ${C.border}`,
                        borderTop: "none",
                        borderRadius: "0 0 6px 6px",
                        minHeight: 100,
                        padding: "5px",
                      }}
                    >
                      {items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            background: C.card,
                            border: `1px solid ${C.borderLight}`,
                            borderRadius: 6,
                            padding: "9px 10px",
                            marginBottom: 5,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              marginBottom: 2,
                            }}
                          >
                            {item.person.name}
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              color: C.muted,
                              marginBottom: 2,
                            }}
                          >
                            {item.person.title}
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              color: C.light,
                              marginBottom: 4,
                            }}
                          >
                            via {item.clientName} · {item.date}
                          </div>
                          {item.note && (
                            <div
                              style={{
                                fontSize: 9,
                                color: C.amber,
                                fontStyle: "italic",
                                marginBottom: 5,
                                lineHeight: 1.4,
                              }}
                            >
                              "{item.note}"
                            </div>
                          )}
                          {stage !== "Outcome" && (
                            <div style={{ display: "flex", gap: 4 }}>
                               <button
                                 onClick={() => openPacket(item.id)}
                                 style={{
                                   fontFamily: F,
                                   fontSize: 9,
                                   padding: "3px 6px",
                                   border: `1px solid ${C.border}`,
                                   borderRadius: 3,
                                   background: C.bg,
                                   color: C.teal,
                                   cursor: "pointer",
                                 }}
                               >
                                 Open
                               </button>
                              <select
                                value={item.stage}
                                onChange={(e) =>
                                  updateStage(item.id, e.target.value)
                                }
                                style={{
                                  fontFamily: F,
                                  fontSize: 9,
                                  padding: "3px 5px",
                                  border: `1px solid ${C.border}`,
                                  borderRadius: 3,
                                  background: C.cream,
                                  color: "#555",
                                  flex: 1,
                                  cursor: "pointer",
                                }}
                              >
                                {PIPELINE_STAGES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => removePipelineItem(item.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: C.light,
                                  fontSize: 11,
                                  padding: "0 2px",
                                }}
                              >
                                ×
                              </button>
                            </div>
                          )}
                          {stage === "Outcome" && (
                            <button
                              onClick={() => removePipelineItem(item.id)}
                              style={{
                                fontFamily: F,
                                fontSize: 9,
                                color: C.muted,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                textDecoration: "underline",
                                padding: 0,
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      {items.length === 0 && (
                        <div
                          style={{
                            padding: "14px 8px",
                            textAlign: "center",
                            fontSize: 10,
                            color: "#CCC",
                          }}
                        >
                          —
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════ MODALS ════════════════════════ */}

      
      {/* Intro Packet */}
      <Modal
        open={packetOpen}
        onClose={() => {
          setPacketOpen(false);
          setActiveReferralId(null);
        }}
        title={activeReferral ? `Intro Packet — ${activeReferral.person?.name}` : "Intro Packet"}
        width={760}
      >
        {!activeReferral ? (
          <div style={{ fontSize: 12, color: C.muted }}>No referral selected.</div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                  via <b>{activeReferral.clientName}</b> · stage <b>{activeReferral.stage}</b>
                  {activeReferral.nextDueDate ? ` · next due ${activeReferral.nextDueDate}` : ""}
                </div>
                <div style={{ fontSize: 18, fontFamily: FH, fontWeight: 400, marginBottom: 2 }}>
                  {activeReferral.person?.name}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  {(activeReferral.person?.title || "").trim()}
                  {activeReferral.person?.company ? ` · ${activeReferral.person.company}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexShrink: 0 }}>
                <Btn
                  variant="secondary"
                  onClick={() => {
                    updateStage(activeReferral.id, "Intro Sent");
                    showToast("Moved to Intro Sent");
                  }}
                >
                  Mark Intro Sent
                </Btn>
                <Btn
                  variant="danger"
                  onClick={() => {
                    removePipelineItem(activeReferral.id);
                    setPacketOpen(false);
                    showToast("Referral removed");
                  }}
                >
                  Remove
                </Btn>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>
                  Contact Coordinates
                </div>
                <Input
                  label="Email"
                  value={activeReferral.contact?.email || ""}
                  onChange={(v) => upsertReferral(activeReferral.id, { contact: { ...(activeReferral.contact || {}), email: v } })}
                  placeholder="name@domain.com"
                />
                <Input
                  label="Phone"
                  value={activeReferral.contact?.phone || ""}
                  onChange={(v) => upsertReferral(activeReferral.id, { contact: { ...(activeReferral.contact || {}), phone: v } })}
                  placeholder="+1 ..."
                />
                <Input
                  label="LinkedIn URL"
                  value={activeReferral.contact?.linkedinUrl || activeReferral.person?.linkedinUrl || ""}
                  onChange={(v) => upsertReferral(activeReferral.id, { contact: { ...(activeReferral.contact || {}), linkedinUrl: v } })}
                  placeholder="https://linkedin.com/in/..."
                />

                <div style={{ display: "flex", gap: 8 }}>
                  <Btn
                    variant="secondary"
                    onClick={() =>
                      addTask(
                        activeReferral.id,
                        `Ask ${activeReferral.clientName} for best email/phone for ${activeReferral.person?.name}`,
                        "ask_coordinates",
                        2
                      )
                    }
                  >
                    Create “Collect Email” Task
                  </Btn>
                </div>
              </div>

              <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>
                  Context & Next Step
                </div>
                <Input
                  label="Context / notes"
                  value={activeReferral.note || ""}
                  onChange={(v) => upsertReferral(activeReferral.id, { note: v })}
                  textarea
                  placeholder="Why is this a fit? How do they know each other? Any nuance?"
                />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Stage
                  </div>
                  <select
                    value={activeReferral.stage}
                    onChange={(e) => updateStage(activeReferral.id, e.target.value)}
                    style={{
                      fontFamily: F,
                      fontSize: 12,
                      padding: "8px 10px",
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      background: C.card,
                      color: "#555",
                      cursor: "pointer",
                      flex: 1,
                    }}
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Message Templates
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={activeTemplateId}
                    onChange={(e) => setActiveTemplateId(e.target.value)}
                    style={{
                      fontFamily: F,
                      fontSize: 12,
                      padding: "8px 10px",
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      background: C.card,
                      color: "#555",
                      cursor: "pointer",
                      minWidth: 260,
                    }}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <Btn
                    variant="secondary"
                    onClick={() => rebuildGeneratedMessage(activeReferral)}
                  >
                    Generate
                  </Btn>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <textarea
                  value={generatedMessage}
                  onChange={(e) => setGeneratedMessage(e.target.value)}
                  placeholder="Click Generate to create a message you can copy and send."
                  style={{
                    width: "100%",
                    minHeight: 160,
                    padding: "10px 12px",
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    fontFamily: F,
                    fontSize: 12,
                    background: C.cream,
                    outline: "none",
                    boxSizing: "border-box",
                    resize: "vertical",
                    lineHeight: 1.4,
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <Btn
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(generatedMessage || "");
                        showToast("Copied to clipboard");
                      } catch {
                        showToast("Copy failed — select and copy manually");
                      }
                    }}
                  >
                    Copy
                  </Btn>
                  <Btn
                    onClick={() => {
                      addTask(activeReferral.id, `Follow up on ${activeReferral.person?.name}`, "followup", 3);
                      showToast("Follow-up task created");
                    }}
                    variant="primary"
                  >
                    Create Follow-up Task
                  </Btn>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>
                Tasks for this Referral
              </div>
              {tasks.filter((t) => t.referralId === activeReferral.id && t.status === "open").length === 0 ? (
                <div style={{ fontSize: 12, color: C.light }}>No open tasks for this referral.</div>
              ) : (
                tasks
                  .filter((t) => t.referralId === activeReferral.id && t.status === "open")
                  .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
                  .map((t) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: `1px solid ${C.borderLight}` }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: C.light }}>Due {t.dueDate}</div>
                      </div>
                      <Btn variant="primary" style={{ padding: "6px 10px", fontSize: 11 }} onClick={() => completeTask(t.id)}>
                        Done
                      </Btn>
                    </div>
                  ))
              )}
            </div>
          </>
        )}
      </Modal>

{/* Add Client */}
      <Modal
        open={showAddClient}
        onClose={() => setShowAddClient(false)}
        title="Add Client"
      >
        <Input
          label="Full Name"
          value={newClient.name}
          onChange={(v) => setNewClient((p) => ({ ...p, name: v }))}
          placeholder="e.g. Sarah Martinez"
        />
        <Input
          label="Title / Company"
          value={newClient.title}
          onChange={(v) => setNewClient((p) => ({ ...p, title: v }))}
          placeholder="e.g. CEO, Pacific Dental Group"
        />
        <Input
          label="LinkedIn Profile URL"
          value={newClient.linkedinUrl}
          onChange={(v) => setNewClient((p) => ({ ...p, linkedinUrl: v }))}
          placeholder="https://linkedin.com/in/..."
        />
        <Input
          label="Notes"
          value={newClient.notes}
          onChange={(v) => setNewClient((p) => ({ ...p, notes: v }))}
          placeholder="Any context..."
          textarea
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 8,
          }}
        >
          <Btn variant="secondary" onClick={() => setShowAddClient(false)}>
            Cancel
          </Btn>
          <Btn onClick={addClient} disabled={!newClient.name.trim()}>
            Add Client
          </Btn>
        </div>
      </Modal>

      {/* Edit Client */}
      <Modal
        open={!!editingClient}
        onClose={() => setEditingClient(null)}
        title="Edit Client"
      >
        {editingClient && (
          <>
            <Input
              label="Full Name"
              value={editingClient.name}
              onChange={(v) => setEditingClient((p) => ({ ...p, name: v }))}
            />
            <Input
              label="Title / Company"
              value={editingClient.title}
              onChange={(v) => setEditingClient((p) => ({ ...p, title: v }))}
            />
            <Input
              label="LinkedIn Profile URL"
              value={editingClient.linkedinUrl || ""}
              onChange={(v) =>
                setEditingClient((p) => ({ ...p, linkedinUrl: v }))
              }
            />
            <Input
              label="Notes"
              value={editingClient.notes || ""}
              onChange={(v) => setEditingClient((p) => ({ ...p, notes: v }))}
              textarea
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <Btn
                variant="danger"
                onClick={() => {
                  if (confirm(`Remove ${editingClient.name}?`))
                    deleteClient(editingClient.id);
                }}
              >
                Delete Client
              </Btn>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="secondary" onClick={() => setEditingClient(null)}>
                  Cancel
                </Btn>
                <Btn
                  onClick={() => {
                    updateClient(editingClient.id, editingClient);
                    setEditingClient(null);
                    showToast("Client updated");
                  }}
                >
                  Save
                </Btn>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Import Connections */}
      <Modal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Import Connection Data"
        width={560}
      >
        <div
          style={{
            fontSize: 12,
            color: C.sub,
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          Paste JSON data from your screen recording tool or any export. Each
          connection needs at minimum a{" "}
          <code
            style={{
              fontFamily: FM,
              fontSize: 11,
              background: C.bg,
              padding: "1px 4px",
              borderRadius: 3,
            }}
          >
            name
          </code>{" "}
          field. Optional fields:{" "}
          <code
            style={{
              fontFamily: FM,
              fontSize: 11,
              background: C.bg,
              padding: "1px 4px",
              borderRadius: 3,
            }}
          >
            title, company, industry, location, seniority, mutualConnections,
            signals
          </code>
        </div>
        <div
          style={{
            background: C.bg,
            borderRadius: 6,
            padding: "12px 14px",
            marginBottom: 14,
            fontFamily: FM,
            fontSize: 10,
            color: C.muted,
            lineHeight: 1.6,
          }}
        >
          {
            '[{ "name": "Sarah Martinez", "title": "CEO", "company": "Acme Inc", "industry": "Healthcare", "location": "San Francisco, CA" }]'
          }
        </div>
        <textarea
          value={importData}
          onChange={(e) => setImportData(e.target.value)}
          placeholder="Paste JSON array here..."
          style={{
            width: "100%",
            minHeight: 140,
            padding: "12px",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            fontFamily: FM,
            fontSize: 11,
            background: C.card,
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 12,
          }}
        >
          <Btn variant="secondary" onClick={() => setShowImport(false)}>
            Cancel
          </Btn>
          <Btn onClick={importConnections} disabled={!importData.trim()}>
            Import Connections
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
