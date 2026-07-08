import { useEffect, useState } from "react";

const listeners = [];

export function toast({ title, description, variant }) {
  const message = {
    id: Date.now(),
    title: title || "",
    description: description || "",
    variant: variant || "default",
  };
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](message);
  }
}

export function Toaster() {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    let timer = null;

    function show(message) {
      setCurrent(message);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setCurrent(null), 4000);
    }

    listeners.push(show);
    return () => {
      const index = listeners.indexOf(show);
      if (index > -1) listeners.splice(index, 1);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!current) return null;

  const isError = current.variant === "destructive";

  return (
    <div className={`toast-popup ${isError ? "toast-error" : "toast-info"}`} role="alert">
      {current.title ? <p className="toast-title">{current.title}</p> : null}
      {current.description ? <p className="toast-desc">{current.description}</p> : null}
    </div>
  );
}
