import math
from typing import Dict, Any, List, Tuple
from backend.models import VideoMetadata

def calculate_crop_filter(
    video_meta: VideoMetadata,
    layout_type: str = "active_speaker",
    target_width: int = 1080,
    target_height: int = 1920
) -> str:
    """
    Generates high-performance FFmpeg filter_complex strings for vertical 9:16 reframing:
    - 'active_speaker': Smart centered face crop with 9:16 aspect ratio.
    - 'blur_background': Original 16:9 centered with blurred background fill.
    - 'split_screen': Stacked dual perspective.
    - 'fit_center': Padded letterbox with dark aesthetic backdrop.
    """
    orig_w = video_meta.width or 1920
    orig_h = video_meta.height or 1080

    if layout_type == "blur_background":
        # Create blurred background from scaled video + center overlay
        return (
            f"[0:v]scale={target_width}:{target_height}:force_original_aspect_ratio=increase:flags=lanczos,"
            f"crop={target_width}:{target_height},"
            f"gblur=sigma=28[bg];"
            f"[0:v]scale={target_width}:-1:flags=lanczos[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2[outv]"
        )

    elif layout_type == "split_screen":
        # Top half (Left speaker) & Bottom half (Right speaker)
        half_h = target_height // 2
        return (
            f"[0:v]scale=-1:{target_height}:flags=lanczos,crop={target_width}:{half_h}:0:0[top];"
            f"[0:v]scale=-1:{target_height}:flags=lanczos,crop={target_width}:{half_h}:{orig_w//4}:0[bottom];"
            f"[top][bottom]vstack[outv]"
        )

    elif layout_type == "fit_center":
        # Letterbox with sleek dark padding
        return (
            f"[0:v]scale={target_width}:-1:flags=lanczos[fg];"
            f"color=c=0x0a0a0f:s={target_width}x{target_height}[bg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2[outv]"
        )

    else:
        # Default: 'active_speaker' -> 9:16 Smart Center Crop
        # Crop 9:16 window from original height
        crop_w = int(orig_h * (9 / 16))
        # Ensure crop width is even
        if crop_w % 2 != 0:
            crop_w += 1
        crop_h = orig_h
        crop_x = (orig_w - crop_w) // 2
        
        return f"[0:v]crop={crop_w}:{crop_h}:{crop_x}:0,scale={target_width}:{target_height}:flags=lanczos[outv]"
