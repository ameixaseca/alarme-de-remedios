import { useState, useEffect, useCallback } from 'react';
import { PendingMedication } from '@dailymed/shared/types';
import { apiRequest } from '@dailymed/shared/api-client';
import { useGroup } from '../contexts/GroupContext';

export function usePendingMedications() {
  const { activeGroup } = useGroup();
  const [medications, setMedications] = useState<PendingMedication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // getTimezoneOffset() retorna minutos *atrás* do UTC — negamos para obter offset correto
      const tzOffset = -new Date().getTimezoneOffset();
      const params = new URLSearchParams({
        tz_offset: String(tzOffset),
        ...(activeGroup ? { group_id: activeGroup.id } : {}),
      });
      const data = await apiRequest<PendingMedication[]>(
        `/api/v1/dashboard/pending?${params}`
      );
      setMedications(data);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao carregar medicações');
    } finally {
      setIsLoading(false);
    }
  }, [activeGroup]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { medications, isLoading, error, refresh: fetch };
}
