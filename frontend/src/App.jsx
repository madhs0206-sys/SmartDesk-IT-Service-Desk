
import { useEffect, useMemo, useState } from "react";

const API_URL = "https://smartdesk-backend-lzo2.onrender.com";

const SLA_HOURS = { P1: 2, P2: 4, P3: 8, P4: 24 };
const technicians = ["Unassigned", "Technician A", "Technician B", "Technician C"];

function normalizeTicket(ticket) {
  return {
    ...ticket,
    id: ticket._id || ticket.id,
    technician: ticket.technician || "Unassigned",
    resolution: ticket.resolution || "",
    impact: ticket.impact || "Low",
    urgency: ticket.urgency || "Low",
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function getPriority(impact, urgency) {
  if (impact === "High" && urgency === "High") return "P1";
  if (
    (impact === "High" && urgency === "Medium") ||
    (impact === "Medium" && urgency === "High")
  ) return "P2";
  if (impact === "Medium" || urgency === "Medium") return "P3";
  return "P4";
}

function getSlaLabel(ticket) {
  if (ticket.status === "Resolved") return "Completed";
  const deadline =
    new Date(ticket.createdAt).getTime() +
    SLA_HOURS[ticket.priority] * 3600000;
  const remaining = deadline - Date.now();

  if (remaining <= 0) return "SLA BREACHED";

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return `${hours}h ${minutes}m left`;
}

function Layout({ children, role, page, setPage, onLogout }) {
  const links = [
    ["dashboard", "▦", "Dashboard"],
    ["tickets", "▤", "Tickets"],
    ["analytics", "◔", "Analytics"],
    ["users", "♙", "Users"],
    ["settings", "⚙", "Settings"],
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div><strong>SmartDesk</strong><span>IT SERVICE MANAGEMENT</span></div>
        </div>

        <div className="workspace">
          <div className="workspace-icon">IT</div>
          <div><small>Workspace</small><b>IT Operations</b></div>
          <span>⌄</span>
        </div>

        <div className="menu-label">MAIN MENU</div>
        <nav>
          {links.map(([id, icon, label]) => (
            <button
              key={id}
              className={page === id ? "nav-item active" : "nav-item"}
              onClick={() => setPage(id)}
            >
              <span className="nav-icon">{icon}</span>{label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">?</div>
            <b>Need assistance?</b>
            <p>Check the support documentation.</p>
            <button>View Help Center →</button>
          </div>
          <div className="profile">
            <div className="avatar">MS</div>
            <div className="profile-info"><b>Madhushree</b><span>{role}</span></div>
            <button onClick={onLogout}>⋮</button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumbs">SmartDesk <span>/</span> {page}</div>
          <div className="top-actions">
            <button className="icon-button">⌕</button>
            <button className="icon-button notification">♢<i /></button>
            <div className="top-avatar">MS</div>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

function Badge({ children, type }) {
  return <span className={`badge ${type || ""}`}>{children}</span>;
}

function Stat({ title, value, change, icon, type }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span><div className={`stat-icon ${type}`}>{icon}</div>
      </div>
      <strong>{value}</strong>
      <div className="stat-change">{change}</div>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function TicketRow({ ticket, admin = false }) {
  return (
    <div className="ticket-row">
      <div className="ticket-main">
        <span className="ticket-id">{ticket.id}</span>
        <h4>{ticket.title}</h4>
        <p>{ticket.category} · Created {new Date(ticket.createdAt).toLocaleDateString()}</p>
      </div>
      <Badge type={ticket.priority.toLowerCase()}>{ticket.priority}</Badge>
      <Badge type={ticket.status.toLowerCase().replaceAll(" ", "-")}>{ticket.status}</Badge>
      <div className="ticket-sla">
        <span>SLA</span>
        <b className={getSlaLabel(ticket) === "SLA BREACHED" ? "danger-text" : ""}>
          {getSlaLabel(ticket)}
        </b>
      </div>
      <div className="ticket-tech"><span>Assigned to</span><b>{ticket.technician}</b></div>
      {admin && <span className="row-more">•••</span>}
    </div>
  );
}

function Employee({ tickets, createTicket, setPage }) {
  const [form, setForm] = useState({
    title: "",
    category: "Hardware",
    description: "",
    impact: "Low",
    urgency: "Low",
  });
  const [saving, setSaving] = useState(false);
  const priority = getPriority(form.impact, form.urgency);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      alert("Please complete the ticket details.");
      return;
    }

    setSaving(true);
    try {
      await createTicket({
        ...form,
        priority,
        status: "Open",
        createdBy: "Madhushree",
      });
      setForm({
        title: "", category: "Hardware", description: "",
        impact: "Low", urgency: "Low",
      });
      alert("Ticket created successfully!");
    } catch (error) {
      alert(`Could not create ticket: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="EMPLOYEE PORTAL"
        title="Good morning, Madhushree"
        description="Create and track your IT support requests from one place."
        action={<button className="primary-btn" onClick={() => document.getElementById("ticket-form")?.scrollIntoView()}>+ New Ticket</button>}
      />

      <div className="hero employee-hero">
        <div>
          <div className="hero-tag">IT SUPPORT CENTER</div>
          <h2>How can we help you today?</h2>
          <p>Raise a request and our support team will take care of the rest.</p>
          <div className="hero-points">
            <span>✓ Automatic priority</span><span>✓ SLA monitoring</span><span>✓ Real-time updates</span>
          </div>
        </div>
        <div className="hero-graphic">
          <div className="floating-card one">✓ Ticket created</div>
          <div className="floating-card two">⚡ SLA active</div>
          <div className="hero-circle">S</div>
        </div>
      </div>

      <div className="section-heading" id="ticket-form">
        <div><h3>Submit a support request</h3><p>Tell us what you need help with.</p></div>
      </div>

      <form className="form-card" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Issue title">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Laptop is not connecting to Wi-Fi" />
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option>Hardware</option><option>Software</option><option>Network</option><option>Access</option>
            </select>
          </Field>
          <Field label="Impact">
            <select value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </Field>
          <Field label="Urgency">
            <select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea rows="4" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue and any relevant details..." />
        </Field>

        <div className="priority-preview">
          <div><span>Automatically calculated priority</span><b>Based on impact + urgency</b></div>
          <Badge type={priority.toLowerCase()}>{priority}</Badge>
          <div className="preview-sla"><span>SLA target</span><b>{SLA_HOURS[priority]} hours</b></div>
        </div>
        <div className="form-actions">
          <button type="button" className="secondary-btn" onClick={() => alert("Drafts are not enabled yet.")}>Save Draft</button>
          <button className="primary-btn" type="submit" disabled={saving}>{saving ? "Submitting..." : "Submit Ticket →"}</button>
        </div>
      </form>

      <div className="section-heading">
        <div><h3>My recent requests</h3><p>Track the progress of your support tickets.</p></div>
        <button className="text-btn" onClick={() => setPage("tickets")}>View all →</button>
      </div>
      <div className="ticket-list">
        {tickets.length === 0 ? <div className="empty">No tickets yet.</div> : tickets.slice(0, 5).map(ticket => <TicketRow key={ticket.id} ticket={ticket} />)}
      </div>
    </>
  );
}

function Technician({ tickets, updateTicket }) {
  const [busyId, setBusyId] = useState(null);
  const change = async (ticket, changes) => {
    setBusyId(ticket.id);
    try {
      await updateTicket(ticket.id, changes);
    } catch (error) {
      alert(`Could not update ticket: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const open = tickets.filter(t => t.status !== "Resolved").length;
  const breached = tickets.filter(t => getSlaLabel(t) === "SLA BREACHED").length;
  const resolved = tickets.filter(t => t.status === "Resolved").length;

  return (
    <>
      <PageHeader eyebrow="TECHNICIAN WORKSPACE" title="Support queue" description="Manage assigned incidents, SLA commitments and resolutions." action={<button className="secondary-btn" onClick={() => window.print()}>Export Queue</button>} />
      <div className="stats-grid four">
        <Stat title="Open Tickets" value={open} change="Currently active" icon="◫" type="blue" />
        <Stat title="SLA Breached" value={breached} change="Requires attention" icon="!" type="red" />
        <Stat title="Resolved" value={resolved} change="Completed tickets" icon="✓" type="green" />
        <Stat title="Avg. Resolution" value="3.8h" change="This week" icon="◷" type="purple" />
      </div>

      <div className="section-heading"><div><h3>Active queue</h3><p>Tickets requiring technician attention.</p></div></div>
      <div className="tech-list">
        {tickets.length === 0 && <div className="empty">No tickets available.</div>}
        {tickets.map(ticket => (
          <div className="tech-card" key={ticket.id}>
            <div className="tech-card-top">
              <div><span className="ticket-id">{ticket.id}</span><h3>{ticket.title}</h3><p>{ticket.description}</p></div>
              <div className="tech-badges"><Badge type={ticket.priority.toLowerCase()}>{ticket.priority}</Badge><Badge type={ticket.status.toLowerCase().replaceAll(" ", "-")}>{ticket.status}</Badge></div>
            </div>
            <div className="tech-meta">
              <div><span>Category</span><b>{ticket.category}</b></div>
              <div><span>SLA</span><b className={getSlaLabel(ticket) === "SLA BREACHED" ? "danger-text" : ""}>{getSlaLabel(ticket)}</b></div>
              <div>
                <span>Assign technician</span>
                <select disabled={busyId === ticket.id} value={ticket.technician} onChange={e => change(ticket, { technician: e.target.value, status: e.target.value === "Unassigned" ? "Open" : "Assigned" })}>
                  {technicians.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <span>Status</span>
                <select disabled={busyId === ticket.id} value={ticket.status} onChange={e => change(ticket, { status: e.target.value })}>
                  {["Open", "Assigned", "In Progress", "Pending Vendor", "Resolved"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="resolution-area">
              <input placeholder="Add resolution notes..." value={ticket.resolution} onChange={e => change(ticket, { resolution: e.target.value })} />
              <button className="primary-btn small" disabled={busyId === ticket.id} onClick={() => change(ticket, { status: "Resolved", resolvedAt: new Date().toISOString() })}>Save Resolution</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Admin({ tickets }) {
  const total = tickets.length;
  const resolved = tickets.filter(t => t.status === "Resolved").length;
  const breached = tickets.filter(t => getSlaLabel(t) === "SLA BREACHED").length;
  const priorities = ["P1", "P2", "P3", "P4"];

  return (
    <>
      <PageHeader eyebrow="ADMINISTRATION" title="Service desk overview" description="Monitor operational performance, SLA compliance and workload." action={<button className="primary-btn" onClick={() => window.print()}>+ Create Report</button>} />
      <div className="stats-grid four">
        <Stat title="Total Tickets" value={total} change="All tickets" icon="▤" type="blue" />
        <Stat title="Active Tickets" value={total - resolved} change="Across all queues" icon="◉" type="purple" />
        <Stat title="SLA Compliance" value={total ? `${Math.round(((total - breached) / total) * 100)}%` : "100%"} change="Current performance" icon="✓" type="green" />
        <Stat title="SLA Breached" value={breached} change="Needs attention" icon="!" type="red" />
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-head"><div><h3>Ticket volume</h3><p>Requests processed over time</p></div></div>
          <div className="fake-chart">
            <div className="chart-y"><span>40</span><span>30</span><span>20</span><span>10</span><span>0</span></div>
            <div className="chart-area"><div className="chart-line line-one" /><div className="chart-line line-two" /><div className="chart-bars">{[32,45,28,58,42,67,50,74,55,81,61,76].map((h,i) => <div key={i} style={{height:`${h}%`}} />)}</div></div>
          </div>
          <div className="chart-labels"><span>Sep 1</span><span>Sep 7</span><span>Sep 14</span><span>Sep 21</span><span>Sep 30</span></div>
        </div>
        <div className="panel">
          <div className="panel-head"><div><h3>Priority distribution</h3><p>Current ticket mix</p></div></div>
          <div className="priority-chart">
            {priorities.map(p => {
              const count = tickets.filter(t => t.priority === p).length;
              const percent = total ? Math.max(8, count / total * 100) : 8;
              return <div className="priority-item" key={p}><div><Badge type={p.toLowerCase()}>{p}</Badge><span>{count} tickets</span></div><div className="progress"><i className={`progress-${p.toLowerCase()}`} style={{width:`${percent}%`}} /></div></div>;
            })}
          </div>
        </div>
      </div>

      <div className="section-heading"><div><h3>Recent tickets</h3><p>Latest activity across the service desk.</p></div></div>
      <div className="ticket-table">
        <div className="table-head"><span>Ticket</span><span>Priority</span><span>Status</span><span>SLA</span><span>Technician</span><span /></div>
        {tickets.length === 0 ? <div className="empty">No tickets available.</div> : tickets.slice(0, 8).map(ticket => <TicketRow key={ticket.id} ticket={ticket} admin />)}
      </div>
    </>
  );
}

function Login({ onLogin }) {
  return (
    <div className="login">
      <div className="login-decoration decoration-one" /><div className="login-decoration decoration-two" />
      <div className="login-card">
        <div className="login-brand"><div className="brand-mark">S</div><div><strong>SmartDesk</strong><span>IT SERVICE MANAGEMENT</span></div></div>
        <div className="login-copy"><div className="eyebrow">WELCOME BACK</div><h1>Support, simplified.</h1><p>Choose your workspace to continue to the SmartDesk portal.</p></div>
        <div className="role-options">
          <button onClick={() => onLogin("Employee")}><span className="role-icon blue">♙</span><span><b>Employee</b><small>Raise and track requests</small></span><i>→</i></button>
          <button onClick={() => onLogin("Technician")}><span className="role-icon purple">⚡</span><span><b>Technician</b><small>Manage support queue</small></span><i>→</i></button>
          <button onClick={() => onLogin("Admin")}><span className="role-icon green">▦</span><span><b>Administrator</b><small>Monitor service operations</small></span><i>→</i></button>
        </div>
        <div className="login-footer"><span>● All systems operational</span><span>SmartDesk v1.0</span></div>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshTickets = async () => {
    const data = await apiRequest("/api/tickets");
    setTickets(data.map(normalizeTicket));
  };

  useEffect(() => {
    refreshTickets()
      .catch(error => {
        console.error(error);
        alert("Could not load tickets from the server. Please refresh the page.");
      })
      .finally(() => setLoading(false));
  }, []);

  const createTicket = async (ticketData) => {
    const saved = await apiRequest("/api/tickets", {
      method: "POST",
      body: JSON.stringify(ticketData),
    });
    setTickets(current => [normalizeTicket(saved), ...current]);
  };

  const updateTicket = async (id, changes) => {
    const saved = await apiRequest(`/api/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
    const normalized = normalizeTicket(saved);
    setTickets(current => current.map(ticket => ticket.id === id ? normalized : ticket));
  };

  const dashboard = useMemo(() => {
    if (role === "Employee") {
      return <Employee tickets={tickets} createTicket={createTicket} setPage={setPage} />;
    }
    if (role === "Technician") {
      return <Technician tickets={tickets} updateTicket={updateTicket} />;
    }
    return <Admin tickets={tickets} />;
  }, [role, tickets]);

  if (!role) return <Login onLogin={r => { setRole(r); setPage("dashboard"); }} />;

  return (
    <Layout role={role} page={page} setPage={setPage} onLogout={() => setRole(null)}>
      {loading ? <div className="empty">Loading tickets from database...</div> : <>
        {page === "dashboard" && dashboard}

        {page === "tickets" && <>
          <PageHeader eyebrow="TICKET MANAGEMENT" title="All tickets" description="Search, monitor and manage service requests." action={<button className="primary-btn" onClick={() => setPage("dashboard")}>+ New Ticket</button>} />
          <div className="ticket-table">
            <div className="table-head"><span>Ticket</span><span>Priority</span><span>Status</span><span>SLA</span><span>Technician</span><span /></div>
            {tickets.length === 0 ? <div className="empty">No tickets available.</div> : tickets.map(ticket => <TicketRow key={ticket.id} ticket={ticket} admin />)}
          </div>
        </>}

        {page === "analytics" && <>
          <PageHeader eyebrow="ANALYTICS" title="Service analytics" description="Understand ticket volume, SLA performance and resolution trends." />
          <div className="stats-grid four">
            <Stat title="Total Requests" value={tickets.length} change="All time" icon="▤" type="blue" />
            <Stat title="Resolved" value={tickets.filter(t => t.status === "Resolved").length} change="Completed" icon="✓" type="green" />
            <Stat title="P1 Incidents" value={tickets.filter(t => t.priority === "P1").length} change="Critical priority" icon="!" type="red" />
            <Stat title="Active" value={tickets.filter(t => t.status !== "Resolved").length} change="Currently open" icon="◉" type="purple" />
          </div>
          <div className="dashboard-grid">
            <div className="panel large-panel"><h3>Performance overview</h3><div className="big-metric">98<span>%</span></div><p>SLA compliance target</p><div className="large-progress"><i style={{width:"98%"}} /></div></div>
            <div className="panel"><h3>Average resolution time</h3><div className="big-metric">3.8<span>h</span></div><p>Average MTTR</p><div className="mini-bars">{[30,45,38,62,50,72,56].map((h,i) => <i key={i} style={{height:`${h}%`}} />)}</div></div>
          </div>
        </>}

        {page === "users" && <>
          <PageHeader eyebrow="USER MANAGEMENT" title="Users & teams" description="Manage service desk roles and technician assignments." />
          <div className="user-grid">{["Madhushree","Technician A","Technician B","Technician C"].map((name,i) => <div className="user-card" key={name}><div className="user-avatar">{name.split(" ").map(x => x[0]).join("").slice(0,2)}</div><h3>{name}</h3><p>{i === 0 ? "Employee" : "Technician"}</p><Badge type="resolved">Active</Badge></div>)}</div>
        </>}

        {page === "settings" && <>
          <PageHeader eyebrow="SYSTEM SETTINGS" title="Settings" description="Configure SmartDesk workspace preferences." />
          <div className="settings-panel">
            <div><b>SLA monitoring</b><span>Real-time SLA countdown and breach detection</span></div><label className="toggle"><input type="checkbox" defaultChecked /><i /></label>
            <div><b>Automatic priority calculation</b><span>Calculate P1–P4 based on impact and urgency</span></div><label className="toggle"><input type="checkbox" defaultChecked /><i /></label>
            <div><b>Notifications</b><span>Receive updates about ticket activity</span></div><label className="toggle"><input type="checkbox" defaultChecked /><i /></label>
          </div>
        </>}
      </>}
    </Layout>
  );
}
