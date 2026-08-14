import { useEffect, useState } from 'react';

export interface Participant {
  name: string;
  isTa: boolean;
}

// Simple fetch — participants change rarely, no need for React Query overhead here
export function useParticipants(roomCode: string): Participant[] {
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (!roomCode) return;
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    fetch(`${base}/api/rooms/${roomCode}/participants`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setParticipants(data);
      })
      .catch(() => {});
  }, [roomCode]);

  return participants;
}
