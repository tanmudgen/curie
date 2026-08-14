import { useState } from 'react';

const KEY = 'cohort_display_name';

export function useDisplayName() {
  const [name, setNameState] = useState<string>(() => localStorage.getItem(KEY) ?? '');

  const setName = (value: string) => {
    localStorage.setItem(KEY, value);
    setNameState(value);
  };

  const clearName = () => {
    localStorage.removeItem(KEY);
    setNameState('');
  };

  return { name, setName, clearName };
}
