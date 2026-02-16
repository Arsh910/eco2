const API_URL = 'http://localhost:8000/api/settings/background/';

export const getBackgroundSettings = async (token) => {
    try {
        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch settings');
        return await response.json();
    } catch (error) {
        console.error('Error fetching settings:', error);
        throw error;
    }
};

export const updateBackgroundSettings = async (token, settings) => {
    try {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        if (!response.ok) throw new Error('Failed to update settings');
        return await response.json();
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
};
