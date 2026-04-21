export type ApiState = 'OPERATIONAL' | 'DEGRADED_QUOTA' | 'DEGRADED_AUTH';

export interface ProtocolLog {
  time: Date;
  endpoint: string;
  error: string;
}

class AIProtocolManager {
  private state: ApiState = 'OPERATIONAL';
  private lockUntil: number = 0;
  private errorLog: ProtocolLog[] = [];
  
  // Custom hook subscription array
  private listeners: Set<(state: ApiState) => void> = new Set();

  public getState() { return this.state; }

  // Subscribe to protocol changes
  public subscribe(listener: (state: ApiState) => void) {
    this.listeners.add(listener);
    // Let them know current state immediately
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(newState: ApiState) {
    if (this.state !== newState) {
      this.state = newState;
      this.listeners.forEach(listen => listen(newState));
    }
  }

  public reportError(endpoint: string, code: number, message: string) {
    this.errorLog.push({ time: new Date(), endpoint, error: message });
    
    // Evaluate error against Protocol Constraints
    const isHardQuota = message.toLowerCase().includes('exceeded your current quota') || message.toLowerCase().includes('billing details');
    const isRateLimit = message.includes('RESOURCE_EXHAUSTED') || code === 429 || message.toLowerCase().includes('quota');
    const isAuth = message.includes('PERMISSION_DENIED') || code === 403;

    if (isHardQuota || isRateLimit) {
      this.setState('DEGRADED_QUOTA');
      // Lock for 1 hour on hard limits, 5 mins on transient 429s
      const lockDurationMs = isHardQuota ? (1000 * 60 * 60) : (1000 * 60 * 5); 
      this.lockUntil = Date.now() + lockDurationMs;
      console.warn(`[AI Protocol] Quota limit triggered on ${endpoint}. Reconfigured to DEGRADED_QUOTA. Applying fallbacks.`);
    } else if (isAuth) {
      this.setState('DEGRADED_AUTH');
      console.warn(`[AI Protocol] Auth failure on ${endpoint}. Reconfigured to DEGRADED_AUTH.`);
    }
  }

  /**
   * The Protocol Execution Wrapper
   * If the system is degraded, it completely bypasses the network operation 
   * and instantly invokes the fallback configuration.
   */
  public async execute<T>(
    endpoint: string, 
    apiOperation: () => Promise<T>, 
    fallbackOperation: (reason: ApiState) => T | Promise<T>
  ): Promise<T> {
    
    // 1. Constraint Check
    if (this.state !== 'OPERATIONAL') {
      if (Date.now() > this.lockUntil && this.state === 'DEGRADED_QUOTA') {
        // Tentative recovery probe timeout reached
        console.log(`[AI Protocol] Lock expired. Attempting probe on ${endpoint}...`);
        this.setState('OPERATIONAL');
      } else {
        // Active Degradation Bypass
        // Do not perform expensive wait/retry or network calls at all. Return purely functional fallback.
        console.log(`[AI Protocol] Bypass active for ${endpoint} (Reason: ${this.state}). Returning immediate fallback.`);
        return fallbackOperation(this.state);
      }
    }

    // 2. Perform Operation
    try {
      return await apiOperation();
    } catch (error: any) {
      // Errors propagated here (like normalizedErrors thrown by withRetry)
      // are captured by the protocol manager.
      // This will set the state to DEGRADED preventing future hits.
      
      this.reportError(endpoint, error.code || 0, error.message || String(error));
      
      // If the error caused a state shift to degraded, return fallback instead of failing
      if (this.state !== 'OPERATIONAL') {
        console.log(`[AI Protocol] Intercepted failure on ${endpoint}. Injecting fallback.`);
        return fallbackOperation(this.state);
      }
      
      throw error;
    }
  }
}

// Global Singleton Protocol Manager
export const aiProtocol = new AIProtocolManager();
