import { useCallback, useRef, useState } from 'react';
import { TOAST_DURATION } from '../constants';

interface UseToastReturn {
  error: string;
  success: string;
  showError: (msg: string) => void;
  showSuccess: (msg: string) => void;
}

export function useToast(): UseToastReturn {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const successTimerObj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerObj = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    if (successTimerObj.current) clearTimeout(successTimerObj.current);
    successTimerObj.current = setTimeout(() => {
      setSuccess('');
    }, TOAST_DURATION.SUCCESS);
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    if (errorTimerObj.current) clearTimeout(errorTimerObj.current);
    errorTimerObj.current = setTimeout(() => {
      setError('');
    }, TOAST_DURATION.ERROR);
  }, []);

  return { error, success, showError, showSuccess };
}
