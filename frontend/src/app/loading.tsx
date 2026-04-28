import { SkeletonCard } from "@/components/SkeletonCard";

export default function Loading() {
  return (
    <div style={{ padding: "6rem 3rem 4rem" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "1.5rem",
        maxWidth: 1280,
        margin: "0 auto",
      }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
