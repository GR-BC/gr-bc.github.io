# Robustness clothesline

The homepage's final section presents the four supplied clips as hanging video prints. A metal rail, wire hangers, and two clothespins per print use CSS and inline SVG. Each print gently sways; hover or keyboard focus lifts it, and a damped pointer spring gives the video surface a small perspective tilt.

| Clip | Supplied filename | Web duration |
| --- | --- | --- |
| Assembly model | `block.mp4` | 53.13 s |
| Graphics card | `gpu自进化.mp4` | 35.13 s |
| Screw tightening | `screw自进化.mp4` | 91.60 s |
| Memory stick | `ram自进化.mp4` | 36.57 s |

The web copies use H.264, 1280×720, 30 FPS, CRF 23, a 2.2 Mbps maximum video rate, 60-frame keyframe spacing, and fast-start MP4 metadata. Audio tracks are removed, in addition to setting `muted`, `defaultMuted`, and zero volume before playback. The original clips are not edited. Frame-rate conversion can round duration by one 60 FPS source frame. Each JPEG poster comes from its clip at 3 seconds. `media.json` records the source mapping, output sizes, durations, and content hashes.

Like the reference EgoJEPA page, videos use muted inline looping playback and lazy source assignment. Intersection observers load and play the visible clips without requiring a click. Clips pause outside the section, outside the horizontal viewport, or when the document is hidden; their timeline positions are preserved. Playback rejection or a media error exposes a silent play/retry control. The global pause button stops both videos and ambient sway. Reduced motion starts the videos paused and disables the hanging/hover motion; the resume button remains available.

The track uses native horizontal overflow for trackpads and touch, leaving vertical page scrolling intact. Mouse dragging, previous/next buttons, and the focused track's Left/Right/Home/End keys are also supported. CSS selectors are prefixed `robust-rack-` to keep the earlier trajectory shelf independent. The CSS and JavaScript references in `index.html`, and each clip/poster URL, carry the first 12 characters of the asset's SHA-256 hash.
