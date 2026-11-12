"use client";

import { useEffect, useState } from "react";

export function useResource(loader, refresh = 0) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    loader()
      .then((value) => {
        if (!active) return;
        setData(value);
        const empty = Array.isArray(value)
          ? value.length === 0
          : !value || (Array.isArray(value.sections) && value.sections.length === 0 && value.matches?.length === 0);
        setStatus(empty ? "empty" : "ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [loader, refresh]);

  return { data, status };
}
