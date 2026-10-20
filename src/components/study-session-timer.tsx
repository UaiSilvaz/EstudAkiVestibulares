"use client";

import { Clock3, Loader2, Play, Square } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";

type Session = { id: string; startedAt: string; endedAt: string | null; focus: string };
export function StudySessionTimer() {
  const router = useRouter();
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [elapsed, setElapsed] = useState(0), [busy, setBusy] = useState(true), [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetch("/api/study-sessions").then(response => { if (!response.ok) throw new Error("Não foi possível carregar sua sessão."); return response.json(); }).then(data => { if (active) setSession(data?.sessions?.find((row: Session) => row.focus === "timer" && !row.endedAt) ?? null); }).catch(() => { if (active) setMessage("Não foi possível carregar sua sessão."); }).finally(() => { if (active) setBusy(false); });
    };
    refresh();
    window.addEventListener("estudaki:study-session-updated", refresh);
    return () => { active = false; window.removeEventListener("estudaki:study-session-updated", refresh); };
  }, []);
  useEffect(() => {
    if (!session) return;
    const tick = () => setElapsed(Math.max(0, Math.min(7200, Math.floor((Date.now() - Date.parse(session.startedAt)) / 1000))));
    const timer = window.setInterval(tick, 1000); tick();
    return () => window.clearInterval(timer);
  }, [session]);
  async function act() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/study-sessions", { method: session ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(session ? { id: session.id } : { action: "start" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Tente novamente.");
      if (session) { setSession(null); setElapsed(0); setMessage("Sessão salva · +" + result.gainedXp + " XP"); router.refresh(); }
      else setSession(result.session);
      window.dispatchEvent(new Event("estudaki:study-session-updated"));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  const time = String(Math.floor(elapsed / 60)).padStart(2, "0") + ":" + String(elapsed % 60).padStart(2, "0");
  return <section className="study-clock" data-expanded={expanded} data-running={!!session} aria-label="Seu tempo de estudo">
    <div className="study-clock-capsule">
      <button type="button" className="study-clock-toggle" aria-label={expanded ? "Recolher cronômetro" : "Abrir cronômetro de estudo"} aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(!expanded)}>
        <Clock3 className="study-clock-face" aria-hidden="true" />
        {session && <span className="study-clock-dot" />}
      </button>
      <div id={panelId} className="study-clock-reveal" inert={!expanded}>
        <div className="study-clock-controls">
          <div><span className="study-clock-label">{session ? "Em foco" : "Tempo de estudo"}</span><span className="study-clock-time" role="timer">{time}</span></div>
          <button type="button" disabled={busy} onClick={() => void act()} className="study-clock-action" aria-label={session ? "Concluir e salvar sessão" : "Começar sessão"}>
            {busy ? <Loader2 className="animate-spin" /> : session ? <Square /> : <Play />}
            <span>{session ? "Salvar" : "Iniciar"}</span>
          </button>
        </div>
      </div>
    </div>
    {expanded && message && <p role="status" className="study-clock-message">{message}</p>}
  </section>;
}
