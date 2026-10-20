
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "https://smartdesk-backend-lzo2.onrender.com";

const STATUSES = [
  "Open",
  "Assigned",
  "In Progress",
  "Pending Vendor",
  "Resolved",
  "Closed",
];

const TECHNICIANS = [
  "Unassigned",
  "Technician A",
  "Technician B",
  "Technician C",
];

const SLA_HOURS = { P1: 2, P2: 4, P3: 8, P4: 24 };

const PRIORITY_COLORS = {
  P1: "priority-p1",
  P2: "priority-p2",
  P3: "priority-p3",
  P4: "priority-p4",
};

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
}

function normalizeTicket(ticket) {
  return {
    ...ticket,
    id: ticket._id || ticket.id,
    priority: ticket.priority || "P3",
    status: ticket.status || "Open",
    technician: ticket.technician || "Unassigned",
    createdBy: ticket.createdBy || "Employee",
    title: ticket.title || "Untitled ticket",
    description: ticket.description || "",
    category: ticket.category || "Other",
    impact: ticket.impact || "Medium",
    urgency: ticket.urgency || "Medium",
    resolution: ticket.resolution || "",
  };
}

function getPriority(impact, urgency) {
  if (impact === "High" && urgency === "High") return "P1";
  if (
    (impact === "High" && urgency === "Medium") ||
    (impact === "Medium" && urgency === "High")
  ) return "P2";
  if (impact === "Low" && urgency === "Low") return "P4";
  return "P3";
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isResolved(ticket) {
  return ["Resolved", "Closed"].includes(ticket.status);
}

function Avatar({ role }) {
  const letter = role === "Administrator" ? "A" : role === "Technician" ? "T" : "E";
  return <span className={`avatar avatar-${letter}`}>{letter}</span>;
}

function Badge({ children, className = "" }) {
  return <span className={`badge ${className}`}>{children}</span>;
}

function StatCard({ label, value, icon, color, note }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

function TicketCard({ ticket, role, onUpdate }) {
  const [resolution, setResolution] = useState(ticket.resolution || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function update(fields) {
    setBusy(true);
    setError("");
    try {
      await onUpdate(ticket.id, fields);
    } catch (err) {
      setError(err.message || "Could not update ticket");
    } finally {
      setBusy(false);
    }
  }

  const canManage = role === "Technician" || role === "Administrator";

  return (
    <article className="ticket-card">
      <div className="ticket-card-top">
        <div className="ticket-heading">
          <div className="ticket-id">
            #{String(ticket.id || "").slice(-6).toUpperCase()}
          </div>
          <h3>{ticket.title}</h3>
        </div>
        <Badge className={PRIORITY_COLORS[ticket.priority]}>
          {ticket.priority}
        </Badge>
      </div>

      <p className="ticket-description">
        {ticket.description || "No description provided."}
      </p>

      <div className="ticket-tags">
        <Badge className="badge-category">{ticket.category}</Badge>
        <Badge className={`status-${ticket.status.toLowerCase().replaceAll(" ", "-")}`}>
          {ticket.status}
        </Badge>
      </div>

      <div className="ticket-details">
        <div>
          <span>Created by</span>
          <strong>{ticket.createdBy}</strong>
        </div>
        <div>
          <span>Technician</span>
          <strong>{ticket.technician}</strong>
        </div>
        <div>
          <span>Created</span>
          <strong>{formatDate(ticket.createdAt)}</strong>
        </div>
        <div>
          <span>Impact / Urgency</span>
          <strong>{ticket.impact} / {ticket.urgency}</strong>
        </div>
      </div>

      {canManage && (
        <div className="ticket-controls">
          <div className="control-field">
            <label>Assign technician</label>
            <select
              value={ticket.technician}
              disabled={busy}
              onChange={(e) => update({
                technician: e.target.value,
                status: e.target.value === "Unassigned" ? "Open" : "Assigned",
              })}
            >
              {TECHNICIANS.map((tech) => (
                <option key={tech}>{tech}</option>
              ))}
            </select>
          </div>

          <div className="control-field">
            <label>Update status</label>
            <select
              value={ticket.status}
              disabled={busy}
              onChange={(e) => update({ status: e.target.value })}
            >
              {STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          {role === "Technician" && (
            <div className="control-field resolution-field">
              <label>Resolution notes</label>
              <textarea
                rows={2}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe the fix..."
              />
              <button
                className="button button-secondary"
                disabled={busy}
                onClick={() => update({ resolution })}
              >
                Save notes
              </button>
            </div>
          )}
        </div>
      )}

      {ticket.resolution && (
        <div className="resolution-note">
          <strong>Resolution</strong>
          <p>{ticket.resolution}</p>
        </div>
      )}

      {error && <p className="error-message">{error}</p>}
      {busy && <p className="muted small-text">Saving changes...</p>}
    </article>
  );
}

function App() {
  const [role, setRole] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showForm, setShowForm] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Software",
    impact: "Medium",
    urgency: "Medium",
  });

  const priority = getPriority(form.impact, form.urgency);

  async function loadTickets() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/api/tickets");
      const list = Array.isArray(data) ? data : data.tickets || [];
      setTickets(list.map(normalizeTicket));
    } catch (err) {
      setError(`${err.message}. Check that the backend is running.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function createTicket(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const created = await apiRequest("/api/tickets", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          priority,
          status: "Open",
          technician: "Unassigned",
          createdBy: "Employee",
        }),
      });

      if (created && (created._id || created.id)) {
        setTickets((previous) => [
          normalizeTicket(created),
          ...previous,
        ]);
      } else {
        await loadTickets();
      }

      setForm({
        title: "",
        description: "",
        category: "Software",
        impact: "Medium",
        urgency: "Medium",
      });
      setSuccess("Your ticket has been created successfully!");
      setShowForm(false);
    } catch (err) {
      setError(err.message || "Unable to create ticket.");
    }
  }

  async function updateTicket(id, fields) {
    const updated = await apiRequest(`/api/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });

    const updatedTicket = updated.ticket || updated;
    setTickets((previous) =>
      previous.map((ticket) =>
        ticket.id === id
          ? normalizeTicket({ ...ticket, ...updatedTicket })
          : ticket
      )
    );
  }

  const visibleTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch = [
        ticket.title,
        ticket.description,
        ticket.category,
        ticket.createdBy,
        ticket.technician,
      ].some((value) =>
        String(value || "").toLowerCase().includes(search.toLowerCase())
      );

      const matchesStatus =
        filterStatus === "All" || ticket.status === filterStatus;

      const matchesRole =
        role !== "Employee" ||
        ticket.createdBy === "Employee" ||
        ticket.createdBy === "Madhushree";

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [tickets, search, filterStatus, role]);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => !isResolved(t)).length;
    const resolved = tickets.filter(isResolved).length;
    const urgent = tickets.filter((t) => t.priority === "P1").length;
    const assigned = tickets.filter(
      (t) => t.technician !== "Unassigned"
    ).length;

    return { total: tickets.length, open, resolved, urgent, assigned };
  }, [tickets]);

  if (!role) {
    return (
      <div className="login-page">
        <div className="login-decoration decoration-one" />
        <div className="login-decoration decoration-two" />

        <div className="login-card">
          <div className="brand-mark">S</div>
          <p className="eyebrow">SMARTER SUPPORT STARTS HERE</p>
          <h1>Welcome to <span>SmartDesk</span></h1>
          <p className="login-description">
            Your team's IT support, organised in one place.
          </p>

          <div className="role-options">
            {[
              ["Employee", "E", "Create and track support tickets", "role-employee"],
              ["Technician", "T", "Manage and resolve tickets", "role-technician"],
              ["Administrator", "A", "Monitor support operations", "role-admin"],
            ].map(([name, letter, description, color]) => (
              <button
                key={name}
                className={`role-option ${color}`}
                onClick={() => setRole(name === "Administrator" ? "Administrator" : name)}
              >
                <span className="role-icon">{letter}</span>
                <span className="role-copy">
                  <strong>{name}</strong>
                  <small>{description}</small>
                </span>
                <span className="role-arrow">↗</span>
              </button>
            ))}
          </div>

          <p className="login-footnote">
            Demo role selection · Authentication is not enabled
          </p>
        </div>
      </div>
    );
  }

  const roleLabel = role === "Administrator" ? "Admin" : role;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small-brand">S</div>
          <div>
            <strong>SmartDesk</strong>
            <span>IT SERVICE PORTAL</span>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>
        <button className="nav-item active" onClick={() => setFilterStatus("All")}>
          <span>▦</span> Dashboard
        </button>
        <button className="nav-item" onClick={() => setFilterStatus("Open")}>
          <span>◷</span> Open tickets
          <span className="nav-count">{stats.open}</span>
        </button>
        <button className="nav-item" onClick={() => setFilterStatus("Resolved")}>
          <span>✓</span> Resolved
        </button>

        <div className="sidebar-label sidebar-label-spaced">YOUR ROLE</div>
        <div className="sidebar-role">
          <Avatar role={role} />
          <div>
            <strong>{role}</strong>
            <span>Workspace access</span>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-emoji">✨</span>
            <strong>Need a hand?</strong>
            <p>Create a ticket and let the IT team help you out.</p>
          </div>
          <button className="nav-item logout-button" onClick={() => {
            setRole("");
            setSearch("");
            setFilterStatus("All");
          }}>
            <span>↪</span> Switch role / Log out
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace <span>/</span> <strong>Dashboard</strong>
          </div>
          <div className="topbar-right">
            <span className="online-indicator">● System online</span>
            <Avatar role={role} />
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-banner">
            <div>
              <p className="eyebrow banner-eyebrow">YOUR SUPPORT OVERVIEW</p>
              <h1>
                {role === "Employee" ? "Hey there, welcome back!" :
                  role === "Technician" ? "Ready to fix things?" :
                  "Here's your command centre."}
              </h1>
              <p>
                {role === "Employee"
                  ? "Raise an issue, track progress, and get back to work."
                  : role === "Technician"
                  ? "Keep tickets moving and help your team stay productive."
                  : "Track tickets, priorities, and your team's support workload."}
              </p>
            </div>
            <div className="banner-art" aria-hidden="true">
              <div className="art-circle art-circle-one" />
              <div className="art-circle art-circle-two" />
              <div className="art-window">
                <span>✦</span>
                <div className="art-line" />
                <div className="art-line short-line" />
                <div className="art-check">✓</div>
              </div>
            </div>
          </section>

          {error && (
            <div className="alert alert-error">
              <span>⚠</span> {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <span>✓</span> {success}
              <button onClick={() => setSuccess("")}>×</button>
            </div>
          )}

          <section className="stats-grid">
            <StatCard label="Total tickets" value={stats.total} icon="▤" color="stat-purple" note="All recorded requests" />
            <StatCard label="Active tickets" value={stats.open} icon="◷" color="stat-blue" note="Awaiting completion" />
            <StatCard label="Resolved" value={stats.resolved} icon="✓" color="stat-green" note="Resolved or closed" />
            <StatCard label="High priority" value={stats.urgent} icon="⚡" color="stat-orange" note="P1 · Requires attention" />
          </section>

          {role === "Employee" && (
            <section className="panel create-panel">
              <button
                className="section-heading heading-button"
                onClick={() => setShowForm(!showForm)}
              >
                <span className="section-icon purple-icon">＋</span>
                <span className="heading-copy">
                  <strong>Create a support ticket</strong>
                  <small>Tell us what's going wrong.</small>
                </span>
                <span className="heading-chevron">{showForm ? "−" : "+"}</span>
              </button>

              {showForm && (
                <form onSubmit={createTicket} className="ticket-form">
                  <div className="form-field full-field">
                    <label>Ticket title</label>
                    <input
                      required
                      maxLength={120}
                      placeholder="e.g. Laptop won't connect to Wi-Fi"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>

                  <div className="form-field full-field">
                    <label>Description</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe the issue and what you've tried..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      {["Software", "Hardware", "Network", "Account Access", "Email", "Other"].map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Impact</label>
                    <select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}>
                      {["Low", "Medium", "High"].map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Urgency</label>
                    <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
                      {["Low", "Medium", "High"].map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </div>

                  <div className="priority-preview">
                    <span>Calculated priority</span>
                    <Badge className={PRIORITY_COLORS[priority]}>{priority}</Badge>
                    <small>SLA target: {SLA_HOURS[priority]} hours</small>
                  </div>

                  <div className="form-actions full-field">
                    <button type="submit" className="button button-primary">
                      Submit ticket <span>→</span>
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          {role === "Administrator" && (
            <section className="panel admin-summary">
              <div className="panel-heading">
                <div>
                  <h2>Support operations</h2>
                  <p>A quick snapshot of your team's workload.</p>
                </div>
                <Badge className="badge-category">Live overview</Badge>
              </div>
              <div className="admin-metrics">
                <div className="admin-metric">
                  <span className="metric-dot dot-purple" />
                  <span>Assigned tickets</span>
                  <strong>{stats.assigned}</strong>
                </div>
                <div className="admin-metric">
                  <span className="metric-dot dot-orange" />
                  <span>P1 critical tickets</span>
                  <strong>{stats.urgent}</strong>
                </div>
                <div className="admin-metric">
                  <span className="metric-dot dot-green" />
                  <span>Completion rate</span>
                  <strong>{stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0}%</strong>
                </div>
              </div>
            </section>
          )}

          <section className="panel tickets-panel">
            <div className="panel-heading tickets-heading">
              <div>
                <h2>{role === "Employee" ? "My tickets" : "Ticket management"}</h2>
                <p>
                  {role === "Employee"
                    ? "Check the latest updates on your requests."
                    : role === "Technician"
                    ? "Assign tickets, update statuses, and record fixes."
                    : "Monitor all tickets across the support team."}
                </p>
              </div>
              <button className="button button-secondary refresh-button" onClick={loadTickets}>
                ↻ Refresh
              </button>
            </div>

            <div className="ticket-filters">
              <div className="search-box">
                <span>⌕</span>
                <input
                  placeholder="Search tickets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                {["All", ...STATUSES].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner" />
                <strong>Loading tickets...</strong>
                <p>Connecting to your support workspace.</p>
              </div>
            ) : visibleTickets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-illustration">✦</div>
                <strong>No tickets found</strong>
                <p>
                  {tickets.length === 0
                    ? "Your workspace is clear. New tickets will show up here."
                    : "Try changing your search or status filter."}
                </p>
              </div>
            ) : (
              <div className="ticket-list">
                {visibleTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    role={role}
                    onUpdate={updateTicket}
                  />
                ))}
              </div>
            )}
          </section>

          <footer className="page-footer">
            <span><span className="footer-dot" /> SmartDesk IT Service Desk</span>
            <span>Made for smoother support ✨</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
