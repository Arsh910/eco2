# /public/ads/ — Ad Video Files

Place your MP4 video files here. They must match the `src` values in:
`src/components/Desktop/ads/videoConfig.js`

## Default expected files

| File       | Maps to       |
|------------|---------------|
| `ad1.mp4`  | AD_LIST[0]    |
| `ad2.mp4`  | AD_LIST[1]    |
| `ad3.mp4`  | AD_LIST[2]    |
| `ad4.mp4`  | AD_LIST[3]    |
| `ad5.mp4`  | AD_LIST[4]    |
| `ad6.mp4`  | AD_LIST[5]    |

## Recommended specs
- Resolution: **1280×720** (720p) — balances quality vs. GPU cost
- Codec: **H.264 / AAC**
- Duration: 10–30 seconds (they loop automatically)
- Ratio: match the UV dimensions of your `ad_screen_*` meshes in `eco2.glb`

## Mesh names

Your GLB meshes must be named starting with `ad_screen_` for the system to detect them.
Example names: `ad_screen_01`, `ad_screen_02`, `ad_screen_billboard`

You can verify mesh names by opening the browser console and checking:
```
[ScreenRegistry] Detected N ad screen(s): [...]
```
