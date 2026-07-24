import { ObservabilityClient } from "./ObservabilityClient";

export default async function ObservabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ guided?: string; present?: string }>;
}) {
  const params = await searchParams;
  // Guided mode is the default — progressive disclosure collapses non-active
  // acts to teasers so the page reads as a narrative, not a dashboard dump.
  // Use ?guided=0 to see everything at once.
  const guided = params.guided !== "0" && params.guided !== "false";
  const present = params.present === "1" || params.present === "true";

  return <ObservabilityClient guided={guided} present={present} />;
}
