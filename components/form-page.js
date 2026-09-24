import Link from "next/link";
import Icon from "./icon";
import PasswordInput from "./password-input";
export default function FormPage({
  title,
  description,
  icon = "book",
  children,
  back = "/",
  backLabel,
}) {
  const resolvedBackLabel =
    backLabel || (back === "/admin" ? "admin workspace" : "overview");

  return (
    <>
      <Link className="back-link" href={back}>
        ← Back to {resolvedBackLabel}
      </Link>
      <div className="form-layout">
        <div className="form-intro">
          <span className="intro-icon">
            <Icon name={icon} size={28} />
          </span>
          <p className="eyebrow">YOUR CLASS, CONNECTED</p>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="form-tip">
            A little organization goes a long way.
            <br />
            ClassFlow keeps your class on the same page.
          </div>
        </div>
        <div className="form-card">{children}</div>
      </div>
    </>
  );
}
export function Field({ label, name, options, multiline, ...props }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {options ? (
        <select id={name} name={name} {...props}>
          {options.map((o) => (
            <option
              key={typeof o === "string" ? o : o.value}
              value={typeof o === "string" ? o : o.value}
            >
              {typeof o === "string" ? o : o.label}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea id={name} name={name} rows={4} {...props} />
      ) : props.type === "password" ? (
        <PasswordInput id={name} name={name} {...props} />
      ) : (
        <input id={name} name={name} {...props} />
      )}
    </div>
  );
}
