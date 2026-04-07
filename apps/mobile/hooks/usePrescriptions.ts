import { useState, useEffect, useCallback } from 'react';
import { Prescription } from '@dailymed/shared/types';
import { apiRequest } from '@dailymed/shared/api-client';

export function usePrescriptions(patientId: string | null) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!patientId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Prescription[]>(`/api/v1/prescriptions?patient_id=${patientId}`);
      setPrescriptions(data);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar prescrições');
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { prescriptions, isLoading, error, refresh: fetch };
}
