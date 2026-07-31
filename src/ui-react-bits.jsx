import { useEffect, useRef, useState } from "react";

// React Bits-style primitives are kept local so their motion obeys the shared design tokens.
export function FadeContent({ children, className = "" }) {
  return <div className={"bits-fade " + className}>{children}</div>;
}

export function BitsTopBar({ children, className = "" }) {
  return <div className={`bits-topbar ${className}`}>
    <div className="bits-topbar-highlight" aria-hidden="true" />
    {children}
  </div>;
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

export function ScrollReveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`bits-reveal ${visible ? "is-visible" : ""} ${className}`} style={{ "--bits-delay": `${delay}ms` }}>{children}</div>;
}

export function SpotlightCard({ children, className = "" }) {
  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
  };
  return <div className={`bits-spotlight ${className}`} onPointerMove={handlePointerMove}>{children}</div>;
}

export function ShinyText({ children, className = "" }) {
  return <span className={`bits-shiny-text ${className}`}>{children}</span>;
}

export function MouseGlow() {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(pointer: coarse)").matches) return undefined;
    const move = (event) => {
      node.style.setProperty("--mouse-x", `${event.clientX}px`);
      node.style.setProperty("--mouse-y", `${event.clientY}px`);
      node.classList.add("is-active");
    };
    const leave = () => node.classList.remove("is-active");
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
    };
  }, []);
  return <div ref={ref} className="bits-mouse-glow" aria-hidden="true" />;
}

export function Magnetic({ children, strength = 8, className = "" }) {
  const ref = useRef(null);
  const move = (event) => {
    const node = ref.current;
    const rect = node?.getBoundingClientRect();
    if (!node || !rect) return;
    const x = ((event.clientX - rect.left) / rect.width - .5) * strength;
    const y = ((event.clientY - rect.top) / rect.height - .5) * strength;
    node.style.transform = `translate(${x}px, ${y}px)`;
  };
  const reset = () => { if (ref.current) ref.current.style.transform = "translate(0, 0)"; };
  return <span ref={ref} className={`bits-magnetic ${className}`} onPointerMove={move} onPointerLeave={reset}>{children}</span>;
}
