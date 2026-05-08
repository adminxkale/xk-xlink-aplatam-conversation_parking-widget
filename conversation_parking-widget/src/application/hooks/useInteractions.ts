"use client";

import { useState, useEffect, useCallback } from "react";
import type { Interaction } from "../../domain/entities/interaction";
import {
  getInteractionService,
} from "../../infrastructure/config/service-registry";
import { getInteractions } from "../use-cases/get-interactions";
import { unparkInteraction } from "../use-cases/unpark-interaction";

interface UseInteractionsResult {
  interactions: Interaction[];
  isLoading: boolean;
  error: string | null;
  unpark: (id: string) => Promise<void>;
  sendingIds: Set<string>;
  retry: () => void;
}

export function useInteractions(
  agentId: string | null,
  token: string | null
): UseInteractionsResult {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

  const fetchInteractions = useCallback(async () => {
    if (!agentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const service = getInteractionService();
      const result = await getInteractions(service, agentId);
      setInteractions(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load interactions"
      );
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  const unpark = useCallback(
    async (id: string) => {
      const interaction = interactions.find((i) => i.id === id);
      if (!interaction || !interaction.isParked) return;

      const service = getInteractionService();

      setSendingIds((prev) => new Set(prev).add(id));

      try {
        const updated = await unparkInteraction(service, {
          id: interaction.id,
          business: interaction.originLine,
          client: interaction.destinationLine,
          agentId: interaction.agentId ?? '',
          agentName: interaction.agentName ?? '',
          queueId: interaction.queueId ?? '',
          token: token ?? '',
        });

        setInteractions((prev) =>
          prev.map((i) => (i.id === id ? updated : i))
        );

        // Refetch interactions after successful unpark
        await fetchInteractions();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al desparquear la conversación"
        );
      } finally {
        setSendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [interactions, token]
  );

  const retry = useCallback(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  return { interactions, isLoading, error, unpark, sendingIds, retry };
}
