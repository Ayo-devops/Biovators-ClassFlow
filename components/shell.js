"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./icon";
import InstallApp from "./install-app";
export default function Shell({ children }) {
  const path = usePathname();
  const adminMode = path.startsWith("/admin") && path !== "/admin/login";
  const links = adminMode
    ? [
        { href: "/admin", label: "Admin home", icon: "grid", exact: true },
        { href: "/admin/assignments", label: "Assignments", icon: "book" },
        { href: "/admin/announcements", label: "Announcements", icon: "bell" },
        { href: "/admin/whatsapp", label: "WhatsApp", icon: "send" },
      ]
    : [
        { href: "/", label: "Home", icon: "grid", exact: true },
        { href: "/assignments", label: "Assignments", icon: "book" },
        { href: "/announcements", label: "Noticeboard", icon: "bell" },
        { href: "/reminders", label: "Reminders", icon: "clock" },
      ];
  const isActive = (link) =>
    link.exact ? path === link.href : path.startsWith(link.href);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Icon name="book" size={25} />
          </span>
          ClassFlow.
        </Link>
        <div className="workspace-label">
          {adminMode ? "BIOVATORS ADMIN" : "BIOVATORS, CONNECTED"}
        </div>
        <nav aria-label="Main navigation">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={`nav-link ${isActive(l) ? "active" : ""}`}
            >
              <Icon name={l.icon} />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="small-label">A LITTLE LESS CHAOS.</span>
          <h3>
            A little more
            <br />
            headspace.
          </h3>
          <p>
            Keep our deadlines in one place. Make room for everything else.
          </p>
          <Link href={adminMode ? "/" : "/reminders"}>
            {adminMode ? "View the public app" : "Set up reminders"}{" "}
            <Icon name="arrow" size={16} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <InstallApp />
          {!adminMode && (
            <Link
              className={`nav-link ${path.startsWith("/admin") ? "active" : ""}`}
              href="/admin"
            >
              <Icon name="shield" />
              Admin workspace
            </Link>
          )}
          <p>Made for our next chapter.</p>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <Link className="mobile-brand brand" href="/">
            <span className="brand-mark">
              <Icon name="book" />
            </span>
            ClassFlow.
          </Link>
          <span className="desktop-breadcrumb">
            Our workspace <span>/</span>{" "}
            {path.startsWith("/admin") ? "Administration" : "Biovators"}
          </span>
          <Link className="topbar-link" href={adminMode ? "/" : "/reminders"}>
            <Icon name={adminMode ? "grid" : "bell"} size={18} />
            <span>{adminMode ? "View public app" : "Stay in the loop"}</span>
            <span className="avatar">CF</span>
          </Link>
        </header>
        <main id="main-content" className="page-content">
          {children}
        </main>
        <footer className="page-footer">
          <span>ClassFlow · Biovators, connected.</span>
          <Link href="/admin">Admin workspace ↗</Link>
          <span>A clearer day starts with us.</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className={isActive(l) ? "active" : ""}
          >
            <Icon name={l.icon} size={21} />
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
