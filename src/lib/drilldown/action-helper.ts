
/**
 * Simulates an asynchronous action with a delay.
 * Useful for mocking API calls in the drilldown system.
 * 
 * @param label The name of the action for logging
 * @param durationMs Duration of the fake network request in ms (default 800-1500ms)
 * @returns Promise that resolves when the action is "complete"
 */
export async function simulateAction(label: string, durationMs?: number): Promise<void> {
  const duration = durationMs || Math.floor(Math.random() * 700) + 800;
  
  return new Promise((resolve) => {
    console.log(`[DrillAction] Starting: ${label}...`);
    setTimeout(() => {
      console.log(`[DrillAction] Completed: ${label}`);
      resolve();
    }, duration);
  });
}
