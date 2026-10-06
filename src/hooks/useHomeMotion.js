import { useLayoutEffect, useRef } from 'react';
import { setupHomeMotion } from '../animations/homeMotion';

export function useHomeMotion(route) {
  const root = useRef(null);
  useLayoutEffect(() => {
    if (route !== 'home') return;
    return setupHomeMotion(root.current);
  }, [route]);
  return root;
}
