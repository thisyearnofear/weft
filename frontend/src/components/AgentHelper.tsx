"use client";

import { FormEvent, useCallback, useState } from "react";
import { Loader2, MessageCircle, Send, Bot } from "lucide-react";
import styles from "./AgentHelper.module.css";

interface HelperMessage {
  role: "user" | "agent";
  text: string;
}

interface AgentHelperProps {
  /** Context-specific Q&A shown by default (before user asks anything) */
  faqs: { q: string; a: string }[];
  /** Page context passed to the chat API so answers are relevant */
  context?: string;
}

export function AgentHelper({ faqs, context = "create-milestone" }: AgentHelperProps) {
  const [messages, setMessages] = useState<HelperMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const sendQuestion = useCallback(
    async (question: string) => {
      setMessages((prev) => [...prev, { role: "user", text: question }]);
      setInput("");
      setLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: question, context }),
        });
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "agent", text: data.message || "I couldn't process that." },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "agent", text: "I couldn't reach the agent right now. Try again in a moment." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [context]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setShowChat(true);
    sendQuestion(q);
  };

  return (
    <div className={styles.helper}>
      <div className={styles.header}>
        <MessageCircle size={15} />
        <span>Ask the agent</span>
      </div>

      {!showChat && (
        <div className={styles.faqs}>
          {faqs.map((faq) => (
            <button
              key={faq.q}
              type="button"
              className={styles.faqItem}
              onClick={() => {
                setShowChat(true);
                sendQuestion(faq.q);
              }}
            >
              <span className={styles.faqQ}>{faq.q}</span>
            </button>
          ))}
        </div>
      )}

      {showChat && (
        <div className={styles.chatArea}>
          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? styles.userMsg : styles.agentMsg}>
                {msg.role === "agent" && <Bot size={14} className={styles.msgIcon} />}
                <p className={styles.msgText}>{msg.text}</p>
              </div>
            ))}
            {loading && (
              <div className={styles.agentMsg}>
                <Loader2 size={14} className={styles.spinner} />
              </div>
            )}
          </div>
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button className={styles.sendBtn} type="submit" disabled={loading || !input.trim()} aria-label="Send question">
          {loading ? <Loader2 size={14} className={styles.spinner} /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
}
