// Force clear all financial data caches
console.log('🧹 CLEARING ALL FINANCIAL CACHES');

async function clearFinancialCaches() {
    try {
        // 1. Clear React Query cache for financial endpoints
        if (window.queryClient) {
            console.log('🔄 Clearing React Query cache...');
            window.queryClient.invalidateQueries({ queryKey: ['/api/financial/overview'] });
            window.queryClient.invalidateQueries({ queryKey: ['/api/financial/budget'] });
            window.queryClient.removeQueries({ queryKey: ['/api/financial/overview'] });
            window.queryClient.removeQueries({ queryKey: ['/api/financial/budget'] });
            console.log('✅ React Query cache cleared');
        }
        
        // 2. Clear Service Worker cache
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            console.log('🔧 Clearing Service Worker cache...');
            const registration = await navigator.serviceWorker.ready;
            const caches = await window.caches.keys();
            
            for (const cacheName of caches) {
                const cache = await window.caches.open(cacheName);
                await cache.delete('/api/financial/overview');
                await cache.delete('/api/financial/budget');
                console.log(`🗑️ Cleared ${cacheName} cache`);
            }
            console.log('✅ Service Worker cache cleared');
        }
        
        // 3. Clear browser cache for financial endpoints
        console.log('🌐 Testing fresh API call...');
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/financial/overview?' + Date.now(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            },
            cache: 'reload'
        });
        
        const data = await response.json();
        console.log('💰 FRESH API DATA:', data);
        console.log('💰 Monthly Spending (Fresh):', data?.data?.monthlySpending);
        
        // 4. Force page refresh after cache clear
        console.log('🔄 Forcing page refresh to load fresh data...');
        setTimeout(() => {
            window.location.reload(true);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Cache clear error:', error);
    }
}

clearFinancialCaches();