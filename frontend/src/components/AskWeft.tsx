"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Send, Sparkles } from "lucide-react";
import styles from "./AskWeft.module.css";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
  data?: Record<string, unknown>;
  action?: { type: string; url: string };
}

export function AskWeft() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || loading) return;

      // If it looks like a milestone hash, navigate directly
      if (/^0x[a-fA-F0-9]{10,}$/.test(trimmed)) {
        router.push(`/milestone/${trimmed}/story`);
        return;
      }

      const userMsg: ChatMessage = { role: "user", text: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });
        const data = await res.json();

        const agentMsg: ChatMessage = {
          role: "agent",
          text: data.message || "I couldn't process that request.",
          data: data.data,
          action: data.action,
        };
        setMessages((prev) => [...prev, agentMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "agent", text: "Could not reach the Weft agent. Try again in a moment." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, router]
  );

  const handleAction = (action: { type: string; url: string }) => {
    if (action.type === "navigate") {
      router.push(action.url);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <MessageCircle size={16} />
        <span>Talk to the Weft Agent</span>
        <span className={styles.badge}>MCP</span>
      </div>

      <div className={styles.chatWindow} ref={scrollRef}>
        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <Sparkles size={20} className={styles.sparkleIcon} />
            <p>Ask about a milestone, request a Builder Journey, or check verification status.</p>
            <div className={styles.suggestions}>
              {[
                "tell me the story of 0x516975…",
                "check status of 0x516975…",
                "what can you do?",
              ].map((s) => (
                <button
                  key={s}
                  className={styles.suggestion}
                  onClick={() => {
                    setInput(s);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={msg.role === "user" ? styles.userMsg : styles.agentMsg}
          >
            {msg.role === "agent" && (
              <span className={styles.agentLabel}>🧵 Weft</span>
            )}
            <p className={styles.msgText}>{msg.text}</p>
            {msg.data && (
              <div className={styles.dataBlock}>
                {Object.entries(msg.data).map(([k, v]) => (
                  <div key={k} className={styles.dataRow}>
                    <span className={styles.dataKey}>{k}</span>
                    <span className={styles.dataVal}>{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
            {msg.action && (
              <button
                className={styles.actionBtn}
                onClick={() => handleAction(msg.action!)}
              >
                {msg.action.type === "navigate" ? "Go →" : msg.action.type}
              </button>
            )}
          </div>
        ))}

        {loading && (
          <div className={styles.agentMsg}>
            <span className={styles.agentLabel}>🧵 Weft</span>
            <Loader2 size={16} className={styles.spinner} />
          </div>
        )}
      </div>

      <form className={styles.form} onSubmit={sendMessage}>
        <input
          className={styles.input}
          type="text"
          placeholder="Ask the Weft Agent…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button className={styles.sendBtn} type="submit" disabled={loading || !input.trim()} aria-label="Send">
          {loading ? <Loader2 size={16} className={styles.spinner} /> : <Send size={16} />}
        </button>
      </form>
    </section>
  );
}
