export async function fetchAds() {
    try {
        // Fetch from the Django backend API
        const response = await fetch('/api/adds/');
        if (!response.ok) {
            throw new Error(`Failed to fetch ads: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data; // Array of { screen, videoUrl, clickUrl }
    } catch (error) {
        console.error('[AdService] Error fetching ads from backend:', error);
        return [];
    }
}
