// utils/haptics.ts

/**
 * Trigger device vibration (haptic feedback)
 * Works only on mobile devices with vibration support
 * Silently does nothing on desktop/unsupported browsers
 */
export const triggerHaptic = (
  type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light'
): void => {
  // Check if vibration API is available
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) {
    return;
  }

  // Vibration patterns (milliseconds)
  const patterns: Record<string, number | number[]> = {
    light: 10,                    // Short tap
    medium: 25,                   // Medium tap
    heavy: 50,                    // Long buzz
    success: [10, 30, 10],        // Double tap
    error: [50, 50, 50],          // Triple buzz
  };

  try {
    navigator.vibrate(patterns[type] || 10);
  } catch (err) {
    // Silently ignore errors (some browsers throw)
    console.debug('Haptic feedback not supported:', err);
  }
};