# GR-BC project page

Static GitHub Pages website. The interactive trajectory section is implemented in `progress.js`, with styles in `style.css` and frame-aligned media in `assets/progress/`.

## Preview

Run `node scripts/serve-preview.mjs` and open `http://127.0.0.1:8765/#trajectories`. The preview supports HTTP byte ranges for MP4 seeking. Use HTTP rather than opening `index.html` directly: the interactive section loads JSON.

## Trajectory data

The four episodes come from the supplied `../progress visual/` export: screw 92, GPU 44, block 75, and RAM 6. `scripts/prepare-progress.py` copies the original 30 FPS videos and exports lightweight WebP keyframes (requires Python 3 and FFmpeg). It preserves every numeric value for all 4,906 frames. It does not overwrite `assets/progress/annotations.json`.

Each sample stores `[raw graph progress, 15-frame smoothed graph progress, transition weight]`. Frame `f` maps to video time `f / 30`; the final frame is `(frame_count - 1) / 30`, not container duration. The progress plot and dip values use the selected raw/smoothed series; transition weight has a separate 0–1.5 axis. No artificial ground truth or reference-method prediction is added.

The desktop layout uses a 2×2 grid; narrow screens use one column. Curve zoom is not offered; scrubbing, event jumps, looping, and camera expansion remain available.

`intervention.flags` preserves the boolean `complementary_info.is_intervention` field in video-frame order, independently of the numeric samples and dip events. Pale orange bands mark those frames in the progress panel; camera badges update only after all three views have finished seeking. The source marks all 1,097 GPU frames as intervention; screw has 819/1,978, block 71/435, and RAM 731/1,396 flagged frames. These are recorded intervention labels, not inferred from progress drops.

The camera views remain on a shared timebase. Camera 2 is initially focused except for RAM, which starts on Camera 0. Drop captions are visual observations/interpretations of the provided keyframes, not verified causal labels or failure classifications. All four source episodes are successful.

The new section is outside the construction overlay. The earlier homepage body remains under that overlay while it is being edited.

## Checks and release

- `node --check progress.js`
- `git diff --check`
- Preview event jumps, slider/curve scrubbing, frame steps, slow playback, looping, camera focus/expansion, and mobile layout.
- Refresh the `style.css?v=...` and `progress.js?v=...` versions in `index.html` from the first 12 characters of each file's SHA-256 hash after changing them.
- Commit and push to `origin/main`; verify the GitHub Pages deployment.
