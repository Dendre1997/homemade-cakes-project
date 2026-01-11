import { useState, useEffect } from "react";
import { SeasonalEvent } from "@/types";

export const useActiveSeasonal = () => {
  const [activeEvent, setActiveEvent] = useState<SeasonalEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSeasonal = async () => {
      try {
        const res = await fetch("/api/seasonals");
        if (res.ok) {
          const events: SeasonalEvent[] = await res.json();
          if (events.length > 0) {
            setActiveEvent(events[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch seasonal event", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeasonal();
  }, []);

  return { activeEvent, isLoading };
};
