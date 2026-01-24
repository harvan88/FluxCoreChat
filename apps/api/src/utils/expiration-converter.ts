interface OpenAIExpiresAfter {
  anchor: 'last_active_at';
  days: number;
}

export function convertToOpenAIExpiration(policy: string, days?: number): OpenAIExpiresAfter | null {
  if (!policy || policy === 'never') return null;
  
  return {
    anchor: 'last_active_at',
    days: policy === 'after_days' && days ? days : 30
  };
}

export function convertFromOpenAIExpiration(expiresAfter: OpenAIExpiresAfter | null): 
  { policy: string, days?: number } {
  if (!expiresAfter) return { policy: 'never' };
  
  return {
    policy: 'after_days',
    days: expiresAfter.days
  };
}
