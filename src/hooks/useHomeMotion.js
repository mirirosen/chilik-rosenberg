import { useRef } from 'react';
import { useBrowserLayoutEffect } from './useBrowserLayoutEffect';
import { setupHomeMotion } from '../animations/homeMotion';

export function useHomeMotion(route) {
  const root = useRef(null);
  useBrowserLayoutEffect(() => {
    if (route !== 'home') return;
    return setupHomeMotion(root.current);
  }, [route]);
  return root;
}
