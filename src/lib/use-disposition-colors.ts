import { useEffect, useState } from "react";
import api from "@/lib/api";
import { DISPOSITIONS } from "@/lib/mock-store";

export function useDispositionColors() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    api.getCustomStatuses()
      .then((statuses) => {
        if (!active || !Array.isArray(statuses)) return;
        const byKey = new Map(statuses.map((status: any) => [status.key, status]));
        DISPOSITIONS.forEach((disposition) => {
          const configured = byKey.get(disposition.key) as any;
          if (configured?.color) disposition.color = configured.color;
          if (configured?.name) disposition.label = configured.name;
        });
        setVersion(version => version + 1);
      })
      .catch(() => {
        // Keep the built-in colors when settings are unavailable.
      });
    return () => { active = false; };
  }, []);
}
