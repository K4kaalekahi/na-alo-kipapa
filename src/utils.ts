export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
  if (typeof window === 'undefined' || !window.navigator || !window.navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case 'light':
        window.navigator.vibrate(10);
        break;
      case 'medium':
        window.navigator.vibrate(20);
        break;
      case 'heavy':
        window.navigator.vibrate(30);
        break;
      case 'success':
        window.navigator.vibrate([10, 30, 20]);
        break;
      case 'warning':
        window.navigator.vibrate([20, 20, 20]);
        break;
      case 'error':
        window.navigator.vibrate([30, 50, 30, 50, 30]);
        break;
      default:
        window.navigator.vibrate(10);
    }
  } catch (error) {
    // Ignore errors if vibration is not supported or blocked
    console.warn('Haptic feedback failed', error);
  }
};
