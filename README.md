# GR-BC project page

Static GitHub Pages website. The interactive trajectory section is implemented in `progress.js`, with styles in `style.css` and frame-aligned media in `assets/progress/`.

The homepage opens with the project demo, then the animated framework. Abstract and task context follow; the four-trajectory collection and progress comparison appear afterward, with headline and policy results later on the page. Navigation follows that reading order.

The framework's four stage explanations follow the paper's method sections and live inside the figure. Hover or focus a part to lift it and smoothly switch the shared explanation; move away to return to the complete cycle. The former separate method cards and potential note are removed.

The demo and original Frame 20 task figure share one stage. The task curtain hangs from a rod and eight rings, with a separate pleated hem below the complete picture, gentle irregular wind motion, and a small lifted corner that reveals the video behind it. An animated diagonal arrow guides corner dragging; labels and the corner also toggle the task map. Drawing it aside preserves the video's playback position. The former separate task section is removed, with its `#tasks` anchor moved to the combined stage. See `assets/task-curtain/README.md` for motion, accessibility, and source-fidelity checks.

## Embedded experiment figures

`assets/homepage-modules.js` mounts the same native components used by `experiment-motion.html` and `progress-comparison.html`. The progress comparison replaces Figure 5; the four-task animated result panel replaces Figure 6 and the old task-tab bar chart. Method highlighting, detail-frame links, percentage bubbles, replay, keyboard controls, and reduced motion remain available. The homepage supplies section headings instead of repeating the experiment preview's heading. Static paper figures remain visible without JavaScript or if a module fails to load.

Run `python3 scripts/version-homepage-modules.py` after editing either module or the homepage stylesheet. It refreshes the stylesheet, module, configuration, and preview cache versions. Verify both modules inside the homepage, including their mobile scroll areas, as well as the standalone pages. Source-fidelity checks: `python3 scripts/check-experiment.py` and `python3 scripts/check-progress-comparison.py` (the latter uses the supplied `~/Downloads/Frame 21.svg` by default).

## Preview

Run `node scripts/serve-preview.mjs` and open `http://127.0.0.1:8765/#trajectories`. The preview supports HTTP byte ranges for MP4 seeking. Use HTTP rather than opening `index.html` directly: the interactive section loads JSON.

## Trajectory data

The four episodes come from the supplied `../progress visual/` export: screw 92, GPU 44, block 75, and RAM 6. `scripts/prepare-progress.py` copies the original 30 FPS videos and exports lightweight WebP keyframes (requires Python 3 and FFmpeg). It preserves every numeric value for all 4,906 frames. It does not overwrite `assets/progress/annotations.json`.

Each sample stores `[raw graph progress, 15-frame smoothed graph progress, transition weight]`. Frame `f` maps to video time `f / 30`; the final frame is `(frame_count - 1) / 30`, not container duration. The progress plot and dip values use the selected raw/smoothed series; transition weight has a separate 0–1.5 axis. No artificial ground truth or reference-method prediction is added.

The collection starts as four overlapping preview cards in a shelf. Hover/focus gives a brief staggered shiver; clicking a card or Expand unfolds the live cards over roughly 1.7 seconds with the native Web Animations API. Shared camera stills, titles, and progress curves travel between measured shelf/grid positions; controls fade in as the visuals settle. The wider shelf fans cards across the available width. Back to shelf pauses playback, preserves each timeline position and focused camera in its preview, and resets the dip panels. Only poster images load while the initial shelf is closed. The open desktop layout uses a 2×2 grid; narrow screens use one column. Each open-grid card initially stops after the progress curve. Pointer hover lifts the card; clicking its title or noninteractive surface unfolds the weight curve, playback controls, and dip analysis. Camera buttons and chart scrubbing keep their own actions. The disclosure button and Enter/Space on a focused card also expand/collapse it. Timeline dip shortcuts open that disclosure; opening it alone preserves the current video frame. Motion honors `prefers-reduced-motion`; the shelf and disclosures support keyboard controls, focus restoration, and `aria-expanded`. Direct episode anchors still open the correct card. Curve zoom is not offered; scrubbing, event jumps, looping, and camera expansion remain available.

`intervention.flags` preserves the boolean `complementary_info.is_intervention` field in video-frame order, independently of the numeric samples and dip events. Pale orange bands mark those frames in the progress panel; camera badges update only after all three views have finished seeking. The source marks all 1,097 GPU frames as intervention; screw has 819/1,978, block 71/435, and RAM 731/1,396 flagged frames. These are recorded intervention labels, not inferred from progress drops.

Each visible trajectory downloads its three videos into reusable local Blob URLs before playback. The loading indicator combines the actual download fractions and first-frame decoding state of the three cameras; the grayscale poster mask recedes upward as each view becomes ready. Transfers retry once after failure and use a 45-second idle timeout, rather than a fixed 20-second total deadline. A retry keeps completed views. Play can be queued or cancelled while loading. Seeking uses the complete local videos, checks both decoded readiness and time position, and polls in addition to listening for seek events. The camera views remain on a shared timebase. Camera 2 is initially focused except for RAM, which starts on Camera 0. The 11 dip captions use the supplied episode annotations, including alignment errors, gripper transitions, and human–policy control handoffs. All four source episodes are successful.

The construction overlay has been removed; the full homepage body is accessible.

## Interactive framework

Figure 1 in the original Approach section uses `assets/framework/homepage.js` and `homepage.css`, mounted from the same decomposed SVG as `framework-preview.html`. The editor keeps its default component-selection behavior; the homepage mounts with `interactive: false` and supplies stage/trajectory interactions. The original SVG, all source geometry, and editable component inventory are preserved.

The first viewport entrance plays an approximately 2.5-second A → B → C → D reveal. A tapered, softly glowing ribbon arrow follows the clockwise feedback circuit, with color transitions, four faint stage checkpoints, and a few trailing particles. The orbit is sampled once; subsequent frames interpolate cached points to form the flowing ribbon. Flowing dashed borders and floating stages continue afterward; the outer-frame dash cycles are about 22% shorter than the original presentation. Hover a part or graph trajectory to focus it; leaving restores the whole diagram, and clicking never pins focus. The highlighted demonstration and intervention-assisted paths also lift their cross-stage dashed arrows and the corresponding four-frame strips in Part B. Stable hit paths prevent hover flicker while the visual paths move. SVG trajectories remain keyboard-focusable, with Escape to clear and blur to restore the overview. Touch focus lasts only while pressing. The former stage toolbar, descriptive footer, route chips, and Figure 1 caption have been removed. Two quiet corner icons replay the introduction and pause/resume motion. Motion also pauses outside the viewport and when the document is hidden; reduced-motion preferences show the complete static diagram. Narrow screens scroll within the diagram instead of shrinking its labels. The original JPG is the fallback if the interactive assets cannot load.

The graph's four route memberships follow the temporal arrows in the illustrative source figure. Similarity links remain independent. Source temporal edge 17 contains two unrelated arrows in one compound path; the homepage splits its four subpaths into two arrow pairs in the presentation DOM only. These are schematic paths, not additional experimental trajectories.

After framework edits, run `python3 scripts/check-framework.py` and `python3 scripts/version-framework.py`. The version script refreshes both preview and homepage dependencies, including the main stylesheet hash. Verify the first entrance, replay, pause/resume, stage and complete-route focus, pointer leave after clicking, keyboard controls, and small-screen scrolling.

## Checks and release

- `node --check progress.js`
- `git diff --check`
- Preview the shelf hover/focus motion, expand/collapse, independent dip disclosures, repeat toggles, direct anchors, and mobile layout. Check that hidden video playback pauses and timeline positions survive shelving.
- Preview event jumps, slider/curve scrubbing, frame steps, slow playback, looping, and camera focus/expansion.
- Refresh the `style.css?v=...` and `progress.js?v=...` versions in `index.html` from the first 12 characters of each file's SHA-256 hash after changing them.
- Commit and push to `origin/main`; verify the GitHub Pages deployment.
