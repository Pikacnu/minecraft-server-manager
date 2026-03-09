import { useSyncExternalStore } from 'react';

export enum DeviceType {
  Mobile,
  Tablet,
  Desktop,
}

export function useDevice() {
  const deviceType = useSyncExternalStore<DeviceType>(
    (onStorageChange) => {
      document.addEventListener('resize', onStorageChange);
      return () => document.removeEventListener('resize', onStorageChange);
    },
    () => {
      const width = window.innerWidth;
      if (width < 768) {
        return DeviceType.Mobile;
      } else if (width < 1024) {
        return DeviceType.Tablet;
      } else {
        return DeviceType.Desktop;
      }
    },
    () => DeviceType.Desktop, // Server-side fallback
  );
  return deviceType;
}
