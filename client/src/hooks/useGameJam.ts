import { useState, useEffect } from "react";
import { formatJamTitle } from "../utils/jam";

interface GameJam {
  slug: string;
  title: string;
  startDate: Date;
  endDate: Date;
  prizePool: string;
  registrationUrl?: string;
  isActive: boolean;
}

export function useGameJam() {
  const [jam, setJam] = useState<GameJam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchJam() {
      try {
        const res = await fetch("/api/jams");
        if (!res.ok) return;
        const jams = await res.json();
        if (!jams.length) return;
        const latest = jams[0];

        if (!latest.startDate || !latest.endDate || !latest.prizePool) return;

        // Parse as noon local time to avoid timezone day-shift
        const startDate = new Date(latest.startDate + "T12:00:00");
        const endDate = new Date(latest.endDate + "T12:00:00");
        // AOE (UTC-12) expiry for isActive check
        const expiresAt = new Date(latest.endDate + "T23:59:59-12:00");
        if (cancelled) return;

        setJam({
          slug: latest.slug,
          title: formatJamTitle(latest.slug),
          startDate,
          endDate,
          prizePool: latest.prizePool,
          registrationUrl: latest.registrationUrl || undefined,
          isActive: new Date() <= expiresAt,
        });
      } catch {
        // Fail silently — card will show fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchJam();
    return () => {
      cancelled = true;
    };
  }, []);

  return { jam, loading };
}
