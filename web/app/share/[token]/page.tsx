import Proposal from "@/components/proposal";
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <Proposal token={token} />;
}
