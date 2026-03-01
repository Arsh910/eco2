/**
 * Ad Configuration
 *
 * Each entry maps to one ad_screen_* mesh (in alphabetical order).
 * ad1.mp4 → ad_screen_01, ad2.mp4 → ad_screen_02, etc.
 */

export const AD_LIST = [
    { id: 1, src: '/ads/ad1.mp4', url: 'https://example.com', label: 'Ad 1' },
    { id: 2, src: '/ads/ad2.mp4', url: 'https://example.com', label: 'Ad 2' },
    { id: 3, src: '/ads/ad3.mp4', url: 'https://example.com', label: 'Ad 3' },
    { id: 4, src: '/ads/ad4.mp4', url: 'https://example.com', label: 'Ad 4' },
    { id: 5, src: '/ads/ad5.mp4', url: 'https://example.com', label: 'Ad 5' },
    { id: 6, src: '/ads/ad6.mp4', url: 'https://example.com', label: 'Ad 6' },
    { id: 7, src: '/ads/ad7.mp4', url: 'https://example.com', label: 'Ad 7' },
];

/** Milliseconds between ad rotations */
export const ROTATION_INTERVAL = 10_000;

/** LED screen glow intensity */
export const EMISSIVE_INTENSITY = 2.0;

/** Max simultaneous active video elements */
export const MAX_ACTIVE_VIDEOS = 7;

/** UnrealBloomPass tuning */
export const BLOOM_CONFIG = {
    strength: 0.8,
    radius: 0.4,
    threshold: 0.85,
};
