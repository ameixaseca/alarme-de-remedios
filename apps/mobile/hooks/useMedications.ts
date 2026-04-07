import { useState, useEffect, useCallback } from 'react';
import { Medication } from '@dailymed/shared/types';
import { apiRequest } from '@dailymed/shared/api-client';
import { useGroup } from '../contexts/GroupContext';

export function useMedications() {
  const { activeGroup } = useGroup();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!activeGroup) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await apiRequest<Medication[]>(`/api/v1/medications?group_id=${activeGroup.id}`);
      setMedications(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeGroup]);

  useEffect(() => { fetch(); }, [fetch]);

  return { medications, isLoading, refresh: fetch };
}
