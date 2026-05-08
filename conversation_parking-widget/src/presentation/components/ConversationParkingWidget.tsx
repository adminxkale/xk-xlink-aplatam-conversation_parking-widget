"use client";

import { useAuthContext } from "../providers/AuthContext";
import { useAgentLines } from "../../application/hooks/useAgentLines";
import { useInteractions } from "../../application/hooks/useInteractions";
import { Header } from "./Header";
import { LineSelector } from "./LineSelector";
import { InteractionList } from "./InteractionList";

export function ConversationParkingWidget() {
  const { agentGroupIds, agent, token } = useAuthContext();
  const {
    lines,
    selectedLineId,
    setSelectedLineId,
    isLoading: linesLoading,
  } = useAgentLines(agentGroupIds);
  const { interactions, isLoading, error, unpark, sendingIds, retry } =
    useInteractions(agent?.id ?? null, token);

  // Filter interactions by selected line (origin line = line.phone_number)
  const filteredInteractions = selectedLineId
    ? (() => {
        const selectedLine = lines.find((l) => l.id === selectedLineId);
        if (!selectedLine) return interactions;
        return interactions.filter(
          (i) => i.originLine === selectedLine.phone_number
        );
      })()
    : interactions;

  const handleLineSelect = (lineId: string) => {
    setSelectedLineId(lineId || null);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <Header />
      <LineSelector
        lines={lines}
        selectedLineId={selectedLineId}
        onSelect={handleLineSelect}
        isLoading={linesLoading}
      />
      <div className="flex-1 overflow-y-auto">
        <InteractionList
          interactions={filteredInteractions}
          isLoading={isLoading}
          error={error}
          onRetry={retry}
          onUnpark={unpark}
          sendingIds={sendingIds}
        />
      </div>
    </div>
  );
}
