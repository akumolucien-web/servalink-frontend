import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BadgeCheck, Briefcase, CalendarCheck, ChevronDown, Flag, Images, Inbox, LayoutDashboard, LogOut, Menu,
  MessageSquareText, Search, Tags, User, UserCheck, Users, Wrench,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { AttentionMenu } from "../components/domain/AttentionMenu";
import { Brand, LocalModeBanner } from "../components/domain/Brand";
import { usePopover } from "../components/domain/usePopover";
import { Avatar } from "../components/ui/Display";
import { useT, type Key } from "../i18n/I18nProvider";
import { formatCmPhone } from "../lib/phone";
import { LanguageSwitch } from "./LanguageSwitch";

interface NavItem { to: string; label: Key; icon: ReactNode; end?: boolean }
const icon = (Icon: typeof Search) => <Icon size={19} aria-hidden="true" />;

const CITIZEN_NAV: NavItem[] = [
  { to: "/app", label: "ws.dashboard", icon: icon(LayoutDashboard), end: true },
  { to: "/search", label: "ws.findService", icon: icon(Search) },
  { to: "/app/bookings", label: "ws.myBookings", icon: icon(CalendarCheck) },
  { to: "/app/reviews", label: "ws.myReviews", icon: icon(MessageSquareText) },
  { to: "/app/reports", label: "ws.myReports", icon: icon(Flag) },
  { to: "/app/profile", label: "ws.myProfile", icon: icon(User) },
];
const PROVIDER_NAV: NavItem[] = [
  { to: "/app/provider", label: "ws.providerDashboard", icon: icon(Briefcase), end: true },
  { to: "/app/provider/bookings", label: "ws.bookingRequests", icon: icon(Inbox) },
  { to: "/app/provider/services", label: "ws.myServices", icon: icon(Wrench) },
  { to: "/app/provider/gallery", label: "ws.workGallery", icon: icon(Images) },
  { to: "/app/provider/vouches", label: "ws.pastClients", icon: icon(UserCheck) },
  { to: "/app/provider/profile", label: "ws.providerProfile", icon: icon(BadgeCheck) },
];
const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "ws.dashboard", icon: icon(LayoutDashboard), end: true },
  { to: "/admin/providers", label: "ws.providers", icon: icon(Users) },
  { to: "/admin/reports", label: "ws.reports", icon: icon(Flag) },
  { to: "/admin/categories", label: "ws.categoryRequests", icon: icon(Tags) },
];

function UserMenu() {
  const { displayName, session, signOut } = useAuth();
  const t = useT();
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
          <div className="head"><div>{displayName}</div><div className="muted xs" style={{ fontWeight: 400 }}>{session?.email || formatCmPhone(session?.phone ?? "")}</div></div>
          <Link className="item" to="/app/profile" onClick={() => setOpen(false)}>{t("ws.menuProfile")}</Link>
          <button className="item" onClick={async () => {
            // Leave the protected page first: signing out while still on it makes RequireAuth record it as ?next=.
            setOpen(false); navigate("/", { replace: true }); await signOut();
          }}>
            <span className="row" style={{ gap: 8 }}><LogOut size={16} aria-hidden="true" />{t("ws.logout")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function WorkspaceShell({ variant = "citizen", children }: { variant?: "citizen" | "admin"; children?: ReactNode }) {
  const { hasProviderTools, provider, needsSessionRefresh } = useAuth();
  const t = useT();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawer]);

  const renderLinks = (items: NavItem[]) => items.map((item) => (
    <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
      {item.icon}{t(item.label)}
    </NavLink>
  ));

  return (
    <>
      <LocalModeBanner />
      <a className="skip-link" href="#main">{t("common.skipToContent")}</a>
      <div className="ws">
        {drawer && <div className="scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}
        <aside className={`sidebar${drawer ? " open" : ""}`} aria-label={t("ws.sidebar")}>
          <Brand to={variant === "admin" ? "/admin" : "/app"} />
          {variant === "admin" ? (
            <>
              <nav className="nav-group" aria-label={t("ws.adminNav")}>{renderLinks(ADMIN_NAV)}</nav>
            </>
          ) : (
            <>
              <nav className="nav-group" aria-label={t("ws.workspace")}>{renderLinks(CITIZEN_NAV)}</nav>
              {hasProviderTools || needsSessionRefresh ? (
                <>
                  <div className="nav-label">{t("ws.providerTools")}</div>
                  <nav className="nav-group" aria-label={t("ws.providerTools")}>{renderLinks(PROVIDER_NAV)}</nav>
                </>
              ) : (
                <>
                  <div className="nav-label">{t("ws.offerServices")}</div>
                  <nav className="nav-group" aria-label={t("ws.becomeProvider")}>
                    {renderLinks([{ to: "/app/become-provider", label: provider ? "ws.providerApplication" : "ws.becomeProvider", icon: icon(Briefcase) }])}
                  </nav>
                </>
              )}
            </>
          )}
          <div className="sidebar-foot" />
        </aside>
        <div className="ws-main">
          <div className="topbar">
            <button className="icon-btn menu-btn" onClick={() => setDrawer(true)} aria-label={t("ws.openNav")} aria-expanded={drawer}><Menu size={20} /></button>
            <Brand to={variant === "admin" ? "/admin" : "/app"} />
            <div className="spacer" />
            <LanguageSwitch />
            {variant === "citizen" && <AttentionMenu />}
            <UserMenu />
          </div>
          <main id="main" className="content" tabIndex={-1}>{children ?? <Outlet />}</main>
        </div>
      </div>
    </>
  );
}
