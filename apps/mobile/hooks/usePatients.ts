import { useState, useEffect, useCallback } from 'react';
import { Patient } from '@dailymed/shared/types';
import { apiRequest } from '@dailymed/shared/api-client';
import { useGroup } from '../contexts/GroupContext';

export function usePatients() {
  const { activeGroup } = useGroup();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeGroup) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Patient[]>(`/api/v1/patients?group_id=${activeGroup.id}`);
      setPatients(data.filter((p) => !p.archived));
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar pacientes');
    } finally {
      setIsLoading(false);
    }
  }, [activeGroup]);

  useEffect(() => { fetch(); }, [fetch]);

  return { patients, isLoading, error, refresh: fetch };
}
