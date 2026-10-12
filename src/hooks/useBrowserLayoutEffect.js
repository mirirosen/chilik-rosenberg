import { useEffect, useLayoutEffect } from 'react';

// Motion and focus listeners are browser enhancements; prerender has no layout.
export const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
