"use client";
import { useEffect, useState } from "react";
import Icon from "./icon";
export default function InstallApp() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const sync = () =>
      setInstalled(media.matches || Boolean(navigator.standalone));
    sync();
    const ready = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", done);
    media.addEventListener("change", sync);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", done);
      media.removeEventListener("change", sync);
    };
  }, []);
  async function install() {
    if (!prompt) {
      setHelp(!help);
      return;
    }
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }
  if (installed) return null;
  return (
    <div className="install-control">
      <button className="install-button" onClick={install}>
        <Icon name="download" size={18} />
        Install ClassFlow
      </button>
      {help && (
        <p className="install-help" role="status">
          On iPhone: open in Safari, tap Share, then Add to Home Screen. On
          Android: open the browser menu and choose Install app or Add to Home
          screen. A secure connection and supported browser are required.
        </p>
      )}
    </div>
  );
}
