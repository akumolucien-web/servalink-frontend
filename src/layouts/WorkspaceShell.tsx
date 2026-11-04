import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BadgeCheck, Briefcase, CalendarCheck, ChevronDown, Flag, Images, Inbox, LayoutDashboard, LogOut, Menu,
  MessageSquareText, Search, Tags, User, Users, Wrench,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { AttentionMenu } from "../components/domain/AttentionMenu";
import { Brand, LocalModeBanner } from "../components/domain/Brand";
import { usePopover } from "../components/domain/usePopover";
import { Avatar } from "../components/ui/Display";

interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean }
const icon = (Icon: typeof Search) => <Icon size={19} aria-hidden="true" />;

const CITIZEN_NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: icon(LayoutDashboard), end: true },
  { to: "/search", label: "Find a Service", icon: icon(Search) },
  { to: "/app/bookings", label: "My Bookings", icon: icon(CalendarCheck) },
  { to: "/app/reviews", label: "My Reviews", icon: icon(MessageSquareText) },
  { to: "/app/reports", label: "My Reports", icon: icon(Flag) },
  { to: "/app/profile", label: "My Profile", icon: icon(User) },
];
const PROVIDER_NAV: NavItem[] = [
  { to: "/app/provider", label: "Provider Dashboard", icon: icon(Briefcase), end: true },
  { to: "/app/provider/bookings", label: "Booking Requests", icon: icon(Inbox) },
  { to: "/app/provider/services", label: "My Services", icon: icon(Wrench) },
  { to: "/app/provider/gallery", label: "Work Gallery", icon: icon(Images) },
  { to: "/app/provider/profile", label: "Provider Profile", icon: icon(BadgeCheck) },
];
const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: icon(LayoutDashboard), end: true },
  { to: "/admin/providers", label: "Providers", icon: icon(Users) },
  { to: "/admin/reports", label: "Reports", icon: icon(Flag) },
  { to: "/admin/categories", label: "Category Requests", icon: icon(Tags) },
];

function UserMenu() {
  const { displayName, session, signOut } = useAuth();
  const navigate = useNavigate();
  const { open, setOpen, anchor } = usePopover();
  return (
    <div className="pop-anchor" ref={anchor}>
      <button className="user-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        <Avatar name={displayName} size={32} />
        <span className="uname">{displayName.split(" ")[0] + (displayName.split(" ")[1] ? " " + displayName.split(" ")[1][0] + "." : "")}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="popover" style={{ width: 260 }}>
          <div className="head"><div>{displayName}</div><div className="muted xs" style={{ fontWeight: 400 }}>{session?.email}</div></div>
          <Link className="item" to="/app/profile" onClick={() => setOpen(false)}>My profile</Link>
          <button className="item" onClick={async () => {
            // Leave the protected page first: signing out while still on it makes RequireAuth record it as ?next=.
            setOpen(false); navigate("/", { replace: true }); await signOut();
          }}>
            <span className="row" style={{ gap: 8 }}><LogOut size={16} aria-hidden="true" />Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function WorkspaceShell({ variant = "citizen", children }: { variant?: "citizen" | "admin"; children?: ReactNode }) {
  const { hasProviderTools, provider, needsSessionRefresh } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawer]);

  const renderLinks = (items: NavItem[]) => items.map((item) => (
    <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
      {item.icon}{item.label}
    </NavLink>
  ));

  return (
    <>
      <LocalModeBanner />
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="ws">
        {drawer && <div className="scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}
        <aside className={`sidebar${drawer ? " open" : ""}`} aria-label="Sidebar">
          <Brand to={variant === "admin" ? "/admin" : "/app"} />
          {variant === "admin" ? (
            <>
              <nav className="nav-group" aria-label="Admin">{renderLinks(ADMIN_NAV)}</nav>
            </>
          ) : (
            <>
              <nav className="nav-group" aria-label="Workspace">{renderLinks(CITIZEN_NAV)}</nav>
              {hasProviderTools || needsSessionRefresh ? (
                <>
                  <div className="nav-label">Provider tools</div>
                  <nav className="nav-group" aria-label="Provider tools">{renderLinks(PROVIDER_NAV)}</nav>
                </>
              ) : (
                <>
                  <div className="nav-label">Offer your services</div>
                  <nav className="nav-group" aria-label="Become a provider">
                    {renderLinks([{ to: "/app/become-provider", label: provider ? "Provider application" : "Become a Provider", icon: icon(Briefcase) }])}
                  </nav>
                </>
              )}
            </>
          )}
          <div className="sidebar-foot" />
        </aside>
        <div className="ws-main">
          <div className="topbar">
            <button className="icon-btn menu-btn" onClick={() => setDrawer(true)} aria-label="Open navigation" aria-expanded={drawer}><Menu size={20} /></button>
            <Brand to={variant === "admin" ? "/admin" : "/app"} />
            <div className="spacer" />
            {variant === "citizen" && <AttentionMenu />}
            <UserMenu />
          </div>
          <main id="main" className="content" tabIndex={-1}>{children ?? <Outlet />}</main>
        </div>
      </div>
    </>
  );
}
