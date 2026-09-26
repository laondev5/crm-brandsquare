"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Square, Volume2 } from "lucide-react";
import { listenMinutes, toChunks, type BriefChunk, type BriefSection } from "@/lib/exec-briefing";

type Status = "idle" | "playing" | "paused";

const SPEEDS = [0.85, 1, 1.15, 1.3, 1.5, 1.75];
const STORE = "bsq-exec-voice";

interface Prefs {
  voice?: string;
  rate?: number;
}

function loadPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}") as Prefs;
  } catch {
    return {};
  }
}

function savePrefs(next: Prefs) {
  try {
    localStorage.setItem(STORE, JSON.stringify(next));
  } catch {
    // A preference that does not stick is not worth an error.
  }
}

/**
 * Which voice to start with.
 *
 * English first, Nigerian English above British above American, and a voice
 * that runs on this device above one that does not. That last preference is
 * about privacy rather than sound: a voice marked "online" or "Natural" is
 * often synthesised on the browser maker's servers, which means the text of
 * the report — staff names, customers, figures — is sent to them to be
 * spoken. An on-device voice keeps it here. The other kind is one click away
 * and labelled, for anyone who prefers how it sounds.
 */
function rank(v: SpeechSynthesisVoice): number {
  const lang = v.lang.replace("_", "-").toLowerCase();
  let score = lang === "en-ng" ? 40 : lang === "en-gb" ? 30 : lang === "en-us" ? 20 : lang.startsWith("en") ? 10 : 0;
  if (v.localService) score += 12;
  return score;
}

/**
 * Reads the executive report aloud.
 *
 * The voice is the browser's own speech engine, so there is nothing to sign up
 * for, no key, and no charge: it is the same voice a screen reader uses. The
 * report is turned into a script first (see lib/exec-briefing) and spoken a
 * sentence at a time rather than as one long utterance. That is what makes
 * pause, skip and speed changes possible at all — engines cannot reliably
 * interrupt themselves mid-word, but moving between short pieces is exact —
 * and it avoids the point at which Chrome cuts a long utterance off.
 */
export default function VoiceReport({ sections }: { sections: BriefSection[] }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [index, setIndex] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);

  const chunks = useMemo(() => toChunks(sections), [sections]);
  const minutes = useMemo(() => listenMinutes(chunks, rate), [chunks, rate]);

  // What is being read is a copy taken when Play was pressed, so a page that
  // refreshes underneath cannot change the script halfway through a sentence.
  const queue = useRef<BriefChunk[]>(chunks);
  const at = useRef(0);
  // Bumped whenever playback is restarted or stopped. A cancelled utterance
  // still fires its end event, and without this it would advance the queue.
  const gen = useRef(0);
  const rateRef = useRef(1);
  const voiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined);
  // Held on to: some engines drop an utterance nothing references, and its end
  // event then never arrives, which would stall the queue silently.
  const held = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    setSupported(ok);
    if (!ok) return;

    const prefs = loadPrefs();
    if (prefs.rate && SPEEDS.includes(prefs.rate)) setRate(prefs.rate);

    const synth = window.speechSynthesis;
    const load = () => {
      const all = synth.getVoices();
      setVoices(all);
      setVoiceURI((current) => {
        if (current && all.some((v) => v.voiceURI === current)) return current;
        if (prefs.voice && all.some((v) => v.voiceURI === prefs.voice)) return prefs.voice;
        const english = all.filter((v) => v.lang.toLowerCase().startsWith("en"));
        const best = [...(english.length ? english : all)].sort((a, b) => rank(b) - rank(a))[0];
        return best?.voiceURI ?? "";
      });
    };
    load();
    // Voices arrive after the page does, on most browsers.
    synth.addEventListener("voiceschanged", load);
    return () => synth.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    voiceRef.current = voices.find((v) => v.voiceURI === voiceURI);
  }, [voices, voiceURI]);

  // Leaving the page, or switching to another period, must not leave the
  // report talking over whatever comes next.
  useEffect(
    () => () => {
      gen.current++;
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    []
  );

  const begin = useCallback((from: number) => {
    const synth = window.speechSynthesis;
    const token = ++gen.current;
    synth.cancel();
    setProblem(null);
    setStatus("playing");

    const finish = () => {
      if (token !== gen.current) return;
      setStatus("idle");
      setIndex(0);
      at.current = 0;
    };

    const step = (i: number) => {
      if (token !== gen.current) return;
      const chunk = queue.current[i];
      if (!chunk) return finish();

      at.current = i;
      setIndex(i);

      const u = new SpeechSynthesisUtterance(chunk.text);
      const voice = voiceRef.current;
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = "en-GB";
      }
      u.rate = rateRef.current;
      u.onend = () => step(i + 1);
      u.onerror = (e) => {
        if (token !== gen.current) return;
        // Our own cancel() reports itself as an error on some engines.
        if (e.error === "canceled" || e.error === "interrupted") return;
        gen.current++;
        setStatus("idle");
        setProblem(`The browser could not speak the report (${e.error}). Try a different voice.`);
      };
      held.current = u;
      synth.speak(u);
    };

    // Some engines swallow a speak() issued in the same breath as a cancel().
    setTimeout(() => step(from), 60);
  }, []);

  function play() {
    queue.current = chunks;
    begin(0);
  }

  function pause() {
    gen.current++;
    window.speechSynthesis.cancel();
    setStatus("paused");
  }

  // Pausing stops and remembers the sentence, and resuming reads it again from
  // its start. The engines' own pause() is unreliable: it does nothing at all
  // on some, and on Chrome's network voices it never comes back.
  function resume() {
    begin(at.current);
  }

  function stop() {
    gen.current++;
    window.speechSynthesis.cancel();
    setStatus("idle");
    setIndex(0);
    at.current = 0;
    setProblem(null);
  }

  const sectionAt = (i: number) => queue.current[i]?.section ?? 0;
  const sectionStart = (section: number) => queue.current.findIndex((c) => c.section === section);

  function jump(section: number) {
    const to = sectionStart(section);
    if (to < 0) return stop();
    begin(to);
  }

  function next() {
    const now = sectionAt(at.current);
    if (now + 1 >= sections.length) return stop();
    jump(now + 1);
  }

  // Like a music player: back goes to the start of this section, and only
  // from the start does it go to the one before.
  function previous() {
    const now = sectionAt(at.current);
    const start = sectionStart(now);
    if (at.current > start + 1 || now === 0) begin(Math.max(0, start));
    else jump(now - 1);
  }

  function chooseRate(value: number) {
    setRate(value);
    savePrefs({ voice: voiceURI, rate: value });
  }

  function chooseVoice(value: string) {
    setVoiceURI(value);
    savePrefs({ voice: value, rate });
  }

  if (supported === null) return null;

  if (!supported) {
    return (
      <p className="voice__off">This browser cannot read aloud. Chrome, Edge, Safari and Firefox all can.</p>
    );
  }

  const listed = (() => {
    const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
    return [...(english.length ? english : voices)].sort((a, b) => rank(b) - rank(a));
  })();
  const chosen = voices.find((v) => v.voiceURI === voiceURI);
  const current = sectionAt(index);
  const progress = queue.current.length > 1 ? (index / (queue.current.length - 1)) * 100 : 0;

  return (
    <div className={`voice${status === "idle" ? "" : " is-live"}`}>
      {status === "idle" ? (
        <div className="voice__bar">
          <button type="button" className="btn" onClick={play}>
            <Volume2 className="size-4" /> Listen to this report
          </button>
          <small>About {minutes} min · read aloud by your browser</small>
        </div>
      ) : (
        <div className="voice__player" role="region" aria-label="Reading the report aloud">
          <div className="voice__row">
            <button type="button" className="btn ghost sm" onClick={previous} aria-label="Previous section">
              <SkipBack className="size-3" />
            </button>
            {status === "playing" ? (
              <button type="button" className="btn sm" onClick={pause}>
                <Pause className="size-3" /> Pause
              </button>
            ) : (
              <button type="button" className="btn sm" onClick={resume}>
                <Play className="size-3" /> Resume
              </button>
            )}
            <button type="button" className="btn ghost sm" onClick={next} aria-label="Next section">
              <SkipForward className="size-3" />
            </button>
            <button type="button" className="btn ghost sm" onClick={stop}>
              <Square className="size-3" /> Stop
            </button>

            <div className="voice__spacer" />

            <select
              value={rate}
              onChange={(e) => chooseRate(Number(e.target.value))}
              aria-label="Speaking speed"
              title="Speaking speed"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s === 1 ? "Normal speed" : `${s}×`}
                </option>
              ))}
            </select>
            {listed.length > 1 && (
              <select
                value={voiceURI}
                onChange={(e) => chooseVoice(e.target.value)}
                aria-label="Voice"
                title="Voice"
              >
                {listed.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name}
                    {v.localService ? "" : " (online)"}
                  </option>
                ))}
              </select>
            )}
          </div>

          <nav className="voice__sections" aria-label="Sections">
            {sections.map((s, i) => (
              <button key={s.key} type="button" className={i === current ? "on" : ""} onClick={() => jump(i)}>
                {s.title}
              </button>
            ))}
          </nav>

          <div className="voice__progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          {/* The sentence being spoken, for following along. Hidden from screen
              readers, which would otherwise read it a second time. */}
          <p className="voice__now" aria-hidden="true">
            {queue.current[index]?.text}
          </p>

          {chosen && !chosen.localService && (
            <p className="voice__note">
              This is an online voice: your browser sends the text of the report to its maker to be
              spoken. Pick one without “online” beside it to keep everything on this computer.
            </p>
          )}
        </div>
      )}

      {problem && <div className="msg err">{problem}</div>}
    </div>
  );
}
