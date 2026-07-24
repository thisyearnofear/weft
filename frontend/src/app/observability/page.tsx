import { ObservabilityClient } from "./ObservabilityClient";

export default async function ObservabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ guided?: string; present?: string }>;
}) {
  const params = await searchParams;
  const guided = params.guided === "1" || params.guided === "true";
  const present = params.present === "1" || params.present === "true";

  return <ObservabilityClient guided={guided} present={present} />;
}
