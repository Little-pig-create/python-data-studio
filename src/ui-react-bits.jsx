import { useEffect, useState } from "react";

// React Bits-style primitives are kept local so their motion obeys the shared design tokens.
export function FadeContent({ children, className = "" }) {
  return <div className={"bits-fade " + className}>{children}</div>;
}

export function CountUp({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const start = performance.now();
    const frame = (now) => {
      const progress = Math.min((now - start) / 420, 1);
      setDisplay(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(frame);
    };
    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <>{display}{suffix}</>;
}
