"use client";

import Link from "next/link";
import { ArrowLeft, Activity as ActivityIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { RefreshButton } from "@/components/RefreshButton";
import { ListSkeleton } from "@/components/KPISkeleton";
import styles from "./page.module.css";

interface ActivityEvent {
  timestamp: number;
  type: "verification" | "charge" | "revenue" | "consensus" | "deadline" | "chaos";
  title: string;
  description: string;
  metadata: Record<string, unknown>;
}

interface ActivityData {
  ok: boolean;
  events: ActivityEvent[];
  count: number;
}

async function fetchActivity(): Promise<ActivityData> {
  const res = await fetch("/api/activity", { cache: "no-store" });
  if (!res.ok) throw new Error(`Activity fetch failed: ${res.status}`);
  return res.json();
}

function useActivity() {
  return useQuery({ queryKey: ["activity"], queryFn: fetchActivity, staleTime: 15_000 });
}

function formatTime(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const TYPE_LABELS: Record<string, string> = {
  verification: "Verification",
  charge: "Spend",
  revenue: "Revenue",
  chaos: "Chaos",
  deadline: "Milestone",
  consensus: "Consensus",
};

export default function ActivityPage() {
  const { data, isLoading, error, refetch, isFetching } = useActivity();
  const events = data?.events ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to Weft
        </Link>

        <div className={styles.header}>
          <div className={styles.eyebrow}>
            <ActivityIcon size={15} /> Activity Feed
          </div>
          <h1 className={styles.title}>Every action, timestamped.</h1>
          <p className={styles.subtitle}>
            A chronological feed of everything the Weft agent has done — verifications submitted,
            infrastructure paid for, revenue swept, and milestones created.
          </p>
          <div style={{ marginTop: "1rem" }}>
            <RefreshButton onClick={() => refetch()} isFetching={isFetching} />
          </div>
        </div>

        {isLoading && <ListSkeleton rows={6} />}
        {error && (
          <div className={styles.errorState}>
            Failed to load: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        )}

        {!isLoading && !error && events.length === 0 && (
          <div className={styles.emptyState}>No activity recorded yet.</div>
        )}

        {!isLoading && !error && events.length > 0 && (
          <div className={styles.timeline}>
            {events.map((event, i) => (
              <div key={`${event.timestamp}-${i}`} className={`${styles.event} ${styles[`event${event.type.charAt(0).toUpperCase() + event.type.slice(1)}`]}`}>
                <div className={styles.eventHeader}>
                  <span className={styles.eventTitle}>
                    <span className={`${styles.eventType} ${styles[`type${event.type.charAt(0).toUpperCase() + event.type.slice(1)}`]}`}>
                      {TYPE_LABELS[event.type] ?? event.type}
                    </span>
                    {event.title}
                  </span>
                  <span className={styles.eventTime}>{formatTime(event.timestamp)}</span>
                </div>
                <p className={styles.eventDesc}>{event.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
