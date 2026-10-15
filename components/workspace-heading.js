"use client";

import Icon from "./icon";

export default function WorkspaceHeading({ eyebrow, title, description, user, role, onSignOut, children }) {
  const roleLabel = role === "super_admin" ? "Super administrator" : role === "admin" ? "Administrator" : "Course representative";
  return <div className="page-heading admin-page-heading">
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}<span>.</span></h1>
      <p>{description}</p>
      {user && <span className="identity-line"><Icon name="shield" size={14} />{user.email} · {roleLabel}</span>}
    </div>
    <div className="admin-actions">{children}<button className="button secondary" onClick={onSignOut}>Sign out</button></div>
  </div>;
}
