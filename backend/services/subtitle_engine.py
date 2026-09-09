import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from backend.models import SubtitleSentence, WordTimestamp
from backend.config import TEMP_DIR

EMOJI_KEYWORD_MAP = {
    # Wealth & Finance
    "money": "💰", "cash": "💵", "dollar": "💵", "rich": "🤑", "million": "💸", "billion": "💸", "wealth": "💎",
    "crypto": "🪙", "bitcoin": "🪙", "profit": "📈", "cost": "💳", "pay": "💳", "invest": "📊", "market": "📊",
    # Energy & Excitement
    "fire": "🔥", "hot": "🔥", "burn": "🔥", "crazy": "🤯", "insane": "🤯", "wild": "🦁", "mind": "🧠", "brain": "🧠",
    "shock": "😱", "shocking": "😱", "omg": "😱", "wow": "✨", "magic": "🪄", "boom": "💥", "explode": "💥",
    # Growth & Success
    "growth": "📈", "scale": "🚀", "rocket": "🚀", "win": "🏆", "winner": "🏆", "success": "🎯", "goal": "🎯",
    "target": "🎯", "focus": "🎯", "champion": "🥇", "king": "👑", "boss": "👑", "top": "🔝", "lead": "⭐",
    # Danger & Secrets
    "danger": "⚠️", "warning": "⚠️", "secret": "🤫", "shh": "🤫", "hidden": "🔍", "truth": "💯", "lie": "🤥",
    "fake": "🤡", "scam": "🚫", "stop": "🛑", "no": "❌", "yes": "✅", "mistake": "❌", "risk": "⚡",
    # Action, Speed & Strength
    "fast": "⚡", "speed": "⚡", "quick": "⚡", "instant": "⚡", "power": "💪", "strong": "💪", "hard": "🏋️",
    "beast": "🦍", "work": "🔨", "hustle": "🔥", "discipline": "🛡️", "fight": "🥊",
    # Time & Ideas
    "time": "⏳", "clock": "⏰", "now": "⏱️", "future": "🔮", "history": "📜", "idea": "💡", "light": "💡",
    "think": "🤔", "learn": "📚", "read": "📖", "study": "🎓",
    # Social & Tech
    "video": "🎬", "camera": "📷", "youtube": "🔴", "phone": "📱", "code": "💻", "ai": "🤖", "robot": "🤖",
    "music": "🎵", "sound": "🔊", "voice": "🎙️", "heart": "❤️", "love": "❤️", "death": "💀", "dead": "💀",
    "question": "❓", "why": "❓", "how": "🔍", "100": "💯", "percent": "💯",
}

def inject_auto_emojis(text: str) -> str:
    """Detects keywords and appends high-engagement emojis."""
    words = text.split()
    augmented = []
    for w in words:
        clean = re.sub(r'[^\w]', '', w.lower())
        augmented.append(w)
        if clean in EMOJI_KEYWORD_MAP:
            emoji = EMOJI_KEYWORD_MAP[clean]
            if emoji not in augmented[-2:]:
                augmented.append(emoji)
    return " ".join(augmented)

def format_ass_timestamp(seconds: float) -> str:
    """Converts seconds into ASS timestamp format: H:MM:SS.cs"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs >= 100:
        cs = 99
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

def generate_ass_subtitles(
    sentences: List[SubtitleSentence],
    clip_start_time: float,
    clip_end_time: float,
    output_ass_path: Optional[str] = None,
    preset: str = "hormozi",
    font_family: str = "Montserrat ExtraBold",
    font_size: int = 24,
    primary_color_hex: str = "#FFFFFF",
    highlight_color_hex: str = "#FFD700",
    stroke_color_hex: str = "#000000",
    stroke_width: int = 3,
    auto_emojis: bool = True,
    style_segments: Optional[List[Any]] = None
) -> str:
    """Generates an ASS subtitle file with word-by-word karaoke highlights and dynamic mid-video style switching."""
    if not output_ass_path:
        output_ass_path = str(TEMP_DIR / f"subtitles_{preset}_{int(clip_start_time)}.ass")

    # Convert HEX (#RRGGBB) to ASS BGR format (&H00BBGGRR)
    def hex_to_ass(hex_str: str) -> str:
        if not hex_str:
            return "&H00FFFFFF"
        hex_str = hex_str.lstrip("#")
        if len(hex_str) == 6:
            r, g, b = hex_str[0:2], hex_str[2:4], hex_str[4:6]
            return f"&H00{b}{g}{r}"
        return "&H00FFFFFF"

    # Style definitions dictionary
    PRESET_CONFIGS = {
        "hormozi": {
            "style_name": "HormoziStyle",
            "font": font_family or "Montserrat ExtraBold",
            "size": 68,
            "primary": hex_to_ass(primary_color_hex or "#FFFFFF"),
            "highlight": hex_to_ass(highlight_color_hex or "#FFD700"),
            "outline": hex_to_ass(stroke_color_hex or "#000000"),
            "outline_w": stroke_width * 2,
            "shadow": 4,
            "back": "&H80000000",
        },
        "cyber": {
            "style_name": "CyberStyle",
            "font": "Impact",
            "size": 70,
            "primary": hex_to_ass("#FFFFFF"),
            "highlight": hex_to_ass("#00F0FF"), # Cyan Neon
            "outline": hex_to_ass("#D900FF"),   # Magenta Outline
            "outline_w": stroke_width * 2 + 1,
            "shadow": 5,
            "back": "&H80000000",
        },
        "beast": {
            "style_name": "BeastStyle",
            "font": "Arial Black",
            "size": 72,
            "primary": hex_to_ass("#FFCC00"),   # Beast Yellow
            "highlight": hex_to_ass("#FF3B30"), # Beast Red
            "outline": hex_to_ass("#000000"),
            "outline_w": stroke_width * 2 + 2,
            "shadow": 6,
            "back": "&H80000000",
        },
        "minimalist": {
            "style_name": "MinimalistStyle",
            "font": "Inter",
            "size": 60,
            "primary": hex_to_ass("#CCCCCC"),
            "highlight": hex_to_ass("#FFFFFF"),
            "outline": "&H00000000",
            "outline_w": 1,
            "shadow": 2,
            "back": "&HA0000000",
        },
    }

    # ASS Header with all 4 style definitions declared
    ass_content = f"""[Script Info]
Title: Dynamic Viral Multi-Style Karaoke Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: HormoziStyle,{PRESET_CONFIGS['hormozi']['font']},{PRESET_CONFIGS['hormozi']['size']},{PRESET_CONFIGS['hormozi']['primary']},&H000000FF,{PRESET_CONFIGS['hormozi']['outline']},{PRESET_CONFIGS['hormozi']['back']},-1,0,0,0,100,100,1,0,1,{PRESET_CONFIGS['hormozi']['outline_w']},{PRESET_CONFIGS['hormozi']['shadow']},2,60,60,520,1
Style: CyberStyle,{PRESET_CONFIGS['cyber']['font']},{PRESET_CONFIGS['cyber']['size']},{PRESET_CONFIGS['cyber']['primary']},&H000000FF,{PRESET_CONFIGS['cyber']['outline']},{PRESET_CONFIGS['cyber']['back']},-1,0,0,0,100,100,1,0,1,{PRESET_CONFIGS['cyber']['outline_w']},{PRESET_CONFIGS['cyber']['shadow']},2,60,60,520,1
Style: BeastStyle,{PRESET_CONFIGS['beast']['font']},{PRESET_CONFIGS['beast']['size']},{PRESET_CONFIGS['beast']['primary']},&H000000FF,{PRESET_CONFIGS['beast']['outline']},{PRESET_CONFIGS['beast']['back']},-1,0,0,0,100,100,1,0,1,{PRESET_CONFIGS['beast']['outline_w']},{PRESET_CONFIGS['beast']['shadow']},2,60,60,520,1
Style: MinimalistStyle,{PRESET_CONFIGS['minimalist']['font']},{PRESET_CONFIGS['minimalist']['size']},{PRESET_CONFIGS['minimalist']['primary']},&H000000FF,{PRESET_CONFIGS['minimalist']['outline']},{PRESET_CONFIGS['minimalist']['back']},-1,0,0,0,100,100,1,0,1,{PRESET_CONFIGS['minimalist']['outline_w']},{PRESET_CONFIGS['minimalist']['shadow']},2,60,60,520,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def resolve_style_for_time(abs_time: float, sentence_style: Optional[str] = None) -> str:
        # 1. Per-sentence explicit style override
        if sentence_style and sentence_style in PRESET_CONFIGS:
            return sentence_style
        # 2. Check if a style segment covers this timestamp
        if style_segments:
            rel_t = abs_time - clip_start_time
            for seg in style_segments:
                seg_s = getattr(seg, "start_time", None) if hasattr(seg, "start_time") else seg.get("start_time", 0.0)
                seg_e = getattr(seg, "end_time", None) if hasattr(seg, "end_time") else seg.get("end_time", 9999.0)
                seg_style = getattr(seg, "style", None) if hasattr(seg, "style") else seg.get("style", "")
                if seg_s <= rel_t <= seg_e and seg_style in PRESET_CONFIGS:
                    return seg_style
        # 3. Default preset
        return preset if preset in PRESET_CONFIGS else "hormozi"

    dialogue_lines = []

    for sentence in sentences:
        # Check if sentence intersects the clip duration
        if sentence.end < clip_start_time or sentence.start > clip_end_time:
            continue

        s_words = sentence.words
        if not s_words:
            # Split text manually if words missing
            tokens = sentence.text.split()
            dur_per_word = (sentence.end - sentence.start) / max(len(tokens), 1)
            s_words = []
            for i, t in enumerate(tokens):
                st = sentence.start + i * dur_per_word
                s_words.append(WordTimestamp(word=t, start=st, end=st + dur_per_word))

        # Chunk sentence words into groups of 3-5 words for high-impact vertical presentation
        chunk_size = 4
        for i in range(0, len(s_words), chunk_size):
            chunk = s_words[i:i + chunk_size]
            if not chunk:
                continue

            chunk_start = max(0.0, chunk[0].start - clip_start_time)
            chunk_end = max(chunk_start + 0.3, chunk[-1].end - clip_start_time)

            # Determine the style dynamically for this chunk (sentence level or mid-video segment)
            chunk_abs_time = chunk[0].start
            cur_preset = resolve_style_for_time(chunk_abs_time, getattr(sentence, "style", None))
            cfg = PRESET_CONFIGS[cur_preset]

            # Word-by-word active highlight frame generation
            for active_idx, active_word in enumerate(chunk):
                w_start = max(0.0, active_word.start - clip_start_time)
                w_end = max(w_start + 0.15, active_word.end - clip_start_time)

                # Compose line with active word highlighted
                parts = []
                for idx, w in enumerate(chunk):
                    display_word = w.word.upper()
                    if auto_emojis and idx == active_idx:
                        display_word = inject_auto_emojis(display_word)

                    if idx == active_idx:
                        # Glowing active word with scale boost
                        parts.append(f"{{\\c{cfg['highlight']}\\t(0,100,\\fscx112\\fscy112)\\3c{cfg['outline']}}}{display_word}{{\\r}}")
                    else:
                        parts.append(f"{{\\c{cfg['primary']}\\3c{cfg['outline']}}}{display_word}{{\\r}}")

                line_text = " ".join(parts)
                start_str = format_ass_timestamp(w_start)
                end_str = format_ass_timestamp(w_end)
                dialogue_lines.append(f"Dialogue: 0,{start_str},{end_str},{cfg['style_name']},,0,0,0,,{line_text}")

    ass_content += "\n".join(dialogue_lines) + "\n"

    with open(output_ass_path, "w", encoding="utf-8") as f:
        f.write(ass_content)

    return output_ass_path
