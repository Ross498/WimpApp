/**
 * Debug utilities for financial scanning - minimal stubs
 */

export async function debugFinancialScanFlow(userId: number): Promise<void> {
  // Debug function - no-op in production
  console.log(`[DEBUG] Financial scan flow check for user ${userId}`);
}

export async function debugScanRoutePersistence(): Promise<void> {
  // Debug function - no-op in production  
  console.log(`[DEBUG] Scan route persistence check`);
}
