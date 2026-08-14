import { useState } from 'react';

export function useDeviceId() {
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('cohort_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('cohort_device_id', id);
    }
    return id;
  });
  return deviceId;
}
