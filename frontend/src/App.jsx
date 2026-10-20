
import { useEffect, useState } from "react";

const API_URL = "https://smartdesk-backend-lzo2.onrender.com";

const TECHNICIANS = [
  "Unassigned",
  "Technician A",
  "Technician B",
  "Technician C",
];

const STATUSES = [
  "Open",
  "Assigned",
  "In Progress",
  "Pending Vendor",
  "Resolved",
  "Closed",
];

const SLA_HOURS = { P1: 2, P2: 4, P3: 8, P4: 24 };

function normalize(ticket) {
  return {
    ...ticket,
    id: ticket._id || ticket.id,
    status: ticket.status || "Open",
    priority: ticket.priority || "P3",
    technician: ticket.technician || "Unassigned",
    resolution: ticket.resolution || "",
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Server error: ${response.status}`);
  }

  return data;
}

function priorityFrom(impact, urgency) {
  if (impact === "High" && urgency === "High") return "P1";
  if (
    (impact === "High" && urgency === "Medium") ||
    (impact === "Medium" && urgency === "High")
  ) return "P2";
  if (impact === "Medium" || urgency === "Medium") return "P3";
  return "P4";
}

function sla(ticket) {
  if (["Resolved", "Closed"].includes(ticket.status)) return "Completed";

  const deadline =
    new Date(ticket.createdAt).getTime() +
    (SLA_HOURS[ticket.priority] || 8) * 3600000;

  const remaining = deadline - Date.now();
  if (remaining <= 0) return "SLA BREACHED";

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);

  return `${hours}h ${minutes}m left`;
}

function AppButton({ children, onClick, disabled, secondary = false }) {
  return (
    <button
      className={secondary ? "secondary-btn" : "primary-btn"}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
}

function App() {
  const [role, setRole] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    category: "Hardware",
    description: "",
    impact: "Low",
    urgency: "Low",
  });

  async function refreshTickets() {
    const data = await request("/api/tickets");
    setTickets(data.map(normalize));
  }

  useEffect(() => {
    refreshTickets()
      .catch((e) => setError(`Could not load tickets: ${e.message}`))
      .finally(() => setLoading(false));
  }, []);

  async function createTicket(e) {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      setError("Enter a title and description.");
      return;
    }

    setError("");

    try {
      const saved = await request("/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          priority: priorityFrom(form.impact, form.urgency),
          status: "Open",
          createdBy: "Employee",
          technician: "Unassigned",
        }),
      });

      setTickets((old) => [normalize(saved), ...old]);

      setForm({
        title: "",
        category: "Hardware",
        description: "",
        impact: "Low",
        urgency: "Low",
      });

      setPage("tickets");
    } catch (e) {
      setError(`Ticket creation failed: ${e.message}`);
    }
  }

  async function updateTicket(id, changes) {
    setBusy((old) => ({ ...old, [id]: true }));
    setError("");

    try {
      const saved = await request(`/api/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });

      const updated = normalize(saved);
      setTickets((old) =>
        old.map((ticket) => ticket.id === id ? updated : ticket)
      );
    } catch (e) {
      setError(`Update failed: ${e.message}`);
      throw e;
    } finally {
      setBusy((old) => ({ ...old, [id]: false }));
    }
  }

  const active = tickets.filter(
    (t) => !["Resolved", "Closed"].includes(t.status)
  ).length;

  const resolved = tickets.filter(
    (t) => ["Resolved", "Closed"].includes(t.status)
  ).length;

  const breached = tickets.filter(
    (t) => sla(t) === "SLA BREACHED"
  ).length;

  function statusControl(ticket) {
    return (
      <select
        aria-label={`Status for ${ticket.title}`}
        value={ticket.status}
        disabled={!!busy[ticket.id]}
        onChange={(e) =>
          updateTicket(ticket.id, { status: e.target.value }).catch(() => {})
        }
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  }

  function technicianControl(ticket) {
    return (
      <select
        aria-label={`Technician for ${ticket.title}`}
        value={ticket.technician}
        disabled={!!busy[ticket.id]}
        onChange={(e) => {
          const technician = e.target.value;
          updateTicket(ticket.id, {
            technician,
            status: technician === "Unassigned" ? "Open" : "Assigned",
          }).catch(() => {});
        }}
      >
        {TECHNICIANS.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    );
  }

  function ticketCard(ticket) {
    const canManage = role === "Technician" || role === "Admin";

    return (
      <article
        key={ticket.id}
        style={{
          border: "1px solid #e1e5ef",
          borderRadius: 12,
          padding: 16,
          marginBottom: 14,
          background: "white",
          color: "#20243a",
        }}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <div>
            <small>{ticket.id}</small>
            <h3 style={{ margin: "8px 0" }}>{ticket.title}</h3>
            <p>{ticket.description}</p>
          </div>
          <div>
            <strong>{ticket.priority}</strong>
            <p>{ticket.status}</p>
          </div>
        </div>

        <p>
          Category: {ticket.category} · Created by: {ticket.createdBy || "Employee"}
        </p>
        <p>
          SLA: <strong style={{ color: sla(ticket) === "SLA BREACHED" ? "#c62828" : "inherit" }}>
            {sla(ticket)}
          </strong>
        </p>
        <p>Assigned to: {ticket.technician}</p>

        {canManage && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginTop: 14,
          }}>
            <label>
              Assign technician
              {technicianControl(ticket)}
            </label>

            <label>
              Update status
              {statusControl(ticket)}
            </label>
          </div>
        )}

        {role === "Technician" && (
          <ResolutionEditor
            ticket={ticket}
            saving={!!busy[ticket.id]}
            onSave={(resolution) =>
              updateTicket(ticket.id, {
                resolution,
                status: "Resolved",
                resolvedAt: new Date().toISOString(),
              }).catch(() => {})
            }
          />
        )}

        {ticket.resolution && (
          <p><strong>Resolution:</strong> {ticket.resolution}</p>
        )}

        {busy[ticket.id] && <small>Saving changes...</small>}
      </article>
    );
  }

  if (!role) {
    return (
      <main style={styles.login}>
        <h1>SmartDesk</h1>
        <p>IT Service Management</p>
        <h2>Choose your role</h2>
        {["Employee", "Technician", "Admin"].map((r) => (
          <button key={r} style={styles.roleButton} onClick={() => {
            setRole(r);
            setPage("dashboard");
            setError("");
          }}>
            Continue as {r}
          </button>
        ))}
        <p>Demo role selection — authentication is not enabled.</p>
      </main>
    );
  }

  const visibleTickets =
    role === "Employee"
      ? tickets.filter((t) => t.createdBy === "Employee" || t.createdBy === "Madhushree")
      : tickets;

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>SmartDesk</h2>
          <small>{role} workspace</small>
        </div>
        <AppButton secondary onClick={() => {
          setRole(null);
          setError("");
        }}>
          Switch role / Logout
        </AppButton>
      </header>

      <nav style={styles.nav}>
        {["dashboard", "tickets", ...(role === "Admin" ? ["analytics"] : [])].map((p) => (
          <button
            key={p}
            style={page === p ? styles.activeNav : styles.navButton}
            onClick={() => setPage(p)}
          >
            {p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {error && (
          <div role="alert" style={styles.error}>
            {error}
            <button onClick={() => setError("")}>Dismiss</button>
          </div>
        )}

        {loading ? (
          <p>Loading tickets...</p>
        ) : (
          <>
            {page === "dashboard" && (
              <>
                <h1>
                  {role === "Employee" ? "Create a ticket" :
                    role === "Technician" ? "Technician queue" : "Admin overview"}
                </h1>

                <div style={styles.stats}>
                  <StatBox label="Total tickets" value={tickets.length} />
                  <StatBox label="Active tickets" value={active} />
                  <StatBox label="Resolved / Closed" value={resolved} />
                  <StatBox label="SLA breached" value={breached} />
                </div>

                {role === "Employee" && (
                  <form onSubmit={createTicket} style={styles.form}>
                    <h3>New support request</h3>

                    <label>Issue title
                      <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Wi-Fi is not working"
                      />
                    </label>

                    <label>Category
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      >
                        {["Hardware", "Software", "Network", "Access", "General"].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>

                    <label>Impact
                      <select
                        value={form.impact}
                        onChange={(e) => setForm({ ...form, impact: e.target.value })}
                      >
                        {["Low", "Medium", "High"].map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </label>

                    <label>Urgency
                      <select
                        value={form.urgency}
                        onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                      >
                        {["Low", "Medium", "High"].map((x) => <option key={x}>{x}</option>)}
                      </select>
                    </label>

                    <p>
                      Calculated priority: <strong>{priorityFrom(form.impact, form.urgency)}</strong>
                    </p>

                    <label>Description
                      <textarea
                        rows={4}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Describe the issue..."
                      />
                    </label>

                    <button className="primary-btn" type="submit">
                      Submit ticket
                    </button>
                  </form>
                )}

                {role === "Technician" && (
                  <p>Assign technicians and change ticket statuses below or in All Tickets.</p>
                )}

                {role === "Admin" && (
                  <p>Monitor all tickets, assignments, priorities and SLA performance.</p>
                )}

                <h2>{role === "Employee" ? "My requests" : "Recent tickets"}</h2>
                {visibleTickets.slice(0, 5).map(ticketCard)}
                {visibleTickets.length === 0 && <p>No tickets found.</p>}
              </>
            )}

            {page === "tickets" && (
              <>
                <h1>{role === "Employee" ? "My tickets" : "All tickets"}</h1>
                <p>
                  {role === "Technician"
                    ? "Assign technicians and update statuses below."
                    : role === "Admin"
                      ? "Monitor all requests and operational status."
                      : "Track your support requests."}
                </p>
                {visibleTickets.map(ticketCard)}
                {visibleTickets.length === 0 && <p>No tickets found.</p>}
              </>
            )}

            {page === "analytics" && role === "Admin" && (
              <>
                <h1>Service analytics</h1>
                <div style={styles.stats}>
                  <StatBox label="Total tickets" value={tickets.length} />
                  <StatBox label="Open / active" value={active} />
                  <StatBox label="Resolved / closed" value={resolved} />
                  <StatBox label="SLA breached" value={breached} />
                </div>
                <h2>Ticket status breakdown</h2>
                {STATUSES.map((status) => (
                  <p key={status}>
                    {status}: {tickets.filter((t) => t.status === status).length}
                  </p>
                ))}
                <h2>Technician workload</h2>
                {TECHNICIANS.slice(1).map((tech) => (
                  <p key={tech}>
                    {tech}: {tickets.filter((t) => t.technician === tech).length} tickets
                  </p>
                ))}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ResolutionEditor({ ticket, saving, onSave }) {
  const [resolution, setResolution] = useState(ticket.resolution || "");

  useEffect(() => {
    setResolution(ticket.resolution || "");
  }, [ticket.resolution]);

  return (
    <div style={{ marginTop: 12 }}>
      <label>Resolution notes
        <textarea
          rows={2}
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="Describe the fix..."
        />
      </label>
      <button
        className="primary-btn"
        disabled={saving || !resolution.trim()}
        onClick={() => onSave(resolution.trim())}
      >
        {saving ? "Saving..." : "Save resolution & resolve"}
      </button>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div style={styles.stat}>
      <small>{label}</small>
      <h2>{value}</h2>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "#f5f7fc",
    color: "#20243a",
    fontFamily: "Inter, Arial, sans-serif",
  },
  header: {
    padding: "20px 5%",
    background: "#fff",
    borderBottom: "1px solid #e2e6ef",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  nav: {
    display: "flex",
    gap: 10,
    padding: "12px 5%",
    background: "#fff",
    borderBottom: "1px solid #e2e6ef",
    flexWrap: "wrap",
  },
  navButton: {
    padding: "10px 16px",
    border: "1px solid #dce1ee",
    background: "#fff",
    borderRadius: 8,
    cursor: "pointer",
  },
  activeNav: {
    padding: "10px 16px",
    border: "1px solid #4f46e5",
    background: "#4f46e5",
    color: "#fff",
    borderRadius: 8,
    cursor: "pointer",
  },
  main: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "28px 20px 60px",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 14,
    margin: "20px 0 30px",
  },
  stat: {
    background: "#fff",
    border: "1px solid #e1e5ef",
    borderRadius: 12,
    padding: 18,
  },
  form: {
    background: "#fff",
    border: "1px solid #e1e5ef",
    borderRadius: 12,
    padding: 20,
    margin: "20px 0 30px",
    display: "grid",
    gap: 14,
  },
  login: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    background: "#f5f7fc",
    color: "#20243a",
  },
  roleButton: {
    width: "min(320px, 90vw)",
    margin: 8,
    padding: 16,
    borderRadius: 10,
    border: "1px solid #dce1ee",
    background: "#fff",
    cursor: "pointer",
    fontSize: 16,
  },
  error: {
    padding: 14,
    background: "#fff0f0",
    color: "#a32020",
    borderRadius: 8,
    marginBottom: 20,
  },
};

export default App;
