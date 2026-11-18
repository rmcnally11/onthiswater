import { FundamentalsBoard } from "@/components/fundamentals-board";

// The doctrine is static. The default month follows the clock, refreshed daily.
export const revalidate = 86400;

export default function FundamentalsPage() {
  const nowMonth = new Date().getUTCMonth() + 1;
  return <FundamentalsBoard nowMonth={nowMonth} />;
}
