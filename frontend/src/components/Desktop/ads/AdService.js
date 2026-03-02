export async function fetchAds() {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/adds/`);
        if (!response.ok) {
            throw new Error(`Failed to fetch ads: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[AdService] Error fetching ads from backend:', error);
        return [];
    }
}
