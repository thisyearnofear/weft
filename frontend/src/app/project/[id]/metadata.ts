import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const shortId = id.length > 20 ? `${id.slice(0, 10)}...${id.slice(-8)}` : id;

  return {
    title: `Milestone ${shortId} — Weft`,
    description: `Onchain verification for milestone ${shortId}. Verified by Weft on 0G Chain.`,
    openGraph: {
      title: `Milestone ${shortId} — Weft`,
      description: `Onchain verification for milestone ${shortId}. Verified by Weft on 0G Chain.`,
      type: "website",
      siteName: "Weft",
    },
    twitter: {
      card: "summary_large_image",
      title: `Milestone ${shortId} — Weft`,
      description: `Onchain verification for milestone ${shortId}. Verified by Weft on 0G Chain.`,
    },
  };
}
