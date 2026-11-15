import { Capacitor } from '@capacitor/core';
import { webAdapter } from './webDatabase.js';
import { androidAdapter } from './androidDatabase.js';
export const getAdapter = () => Capacitor.isNativePlatform() ? androidAdapter : webAdapter;
