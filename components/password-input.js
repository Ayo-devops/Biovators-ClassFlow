"use client";

import { useState } from "react";
import Icon from "./icon";

export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-controls={props.id}
        onClick={() => setVisible((value) => !value)}
      >
        <Icon name={visible ? "eye-off" : "eye"} size={20} />
      </button>
    </div>
  );
}
