from PIL import Image, ImageOps
import cv2
import numpy as np
from pathlib import Path
import json
import os

PROFILES = {
    'THUMBNAIL':     {'width': 200,  'height': 150,  'quality': 75,  'format': 'webp'},
    'CARD':          {'width': 400,  'height': 300,  'quality': 80,  'format': 'webp'},
    'BANNER':        {'width': 1200, 'height': 600,  'quality': 85,  'format': 'webp'},
    'MOBILE':        {'width': 768,  'height': 512,  'quality': 82,  'format': 'webp'},
    'GALLERY':       {'width': 1024, 'height': 768,  'quality': 85,  'format': 'webp'},
    'FULLSCREEN':    {'width': 1920, 'height': 1080, 'quality': 88,  'format': 'webp'},
    'SQUARE':        {'width': 600,  'height': 600,  'quality': 82,  'format': 'webp'},
    'WEBP_ORIGINAL': {'max_width': 3840,             'quality': 90,  'format': 'webp'},
}


def smart_crop(image: Image.Image, target_w: int, target_h: int, focal_point: dict = None) -> Image.Image:
    src_w, src_h = image.size
    target_ratio = target_w / target_h
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        fx = focal_point['x'] if focal_point else 0.5
        x_center = int(src_w * fx)
        x_start = max(0, min(x_center - new_w // 2, src_w - new_w))
        box = (x_start, 0, x_start + new_w, src_h)
    else:
        new_h = int(src_w / target_ratio)
        fy = focal_point['y'] if focal_point else 0.4
        y_center = int(src_h * fy)
        y_start = max(0, min(y_center - new_h // 2, src_h - new_h))
        box = (0, y_start, src_w, y_start + new_h)

    cropped = image.crop(box)
    return cropped.resize((target_w, target_h), Image.LANCZOS)


def detect_focal_point(image_path: str) -> dict:
    img = cv2.imread(image_path)
    if img is None:
        return {'x': 0.5, 'y': 0.4}

    try:
        saliency = cv2.saliency.StaticSaliencySpectralResidual_create()
        success, saliency_map = saliency.computeSaliency(img)

        if not success:
            return {'x': 0.5, 'y': 0.4}

        saliency_map = (saliency_map * 255).astype(np.uint8)
        M = cv2.moments(saliency_map)

        if M['m00'] == 0:
            return {'x': 0.5, 'y': 0.4}

        cx = M['m10'] / M['m00']
        cy = M['m01'] / M['m00']
        h, w = img.shape[:2]

        return {'x': round(cx / w, 3), 'y': round(cy / h, 3)}
    except Exception:
        return {'x': 0.5, 'y': 0.4}


def process_image(input_path: str, output_dir: str, focal_point: dict = None, profiles: list = None) -> list:
    if profiles is None:
        profiles = list(PROFILES.keys())

    if focal_point is None:
        focal_point = detect_focal_point(input_path)

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    original = Image.open(input_path)
    original = ImageOps.exif_transpose(original)

    if original.mode not in ('RGB', 'RGBA'):
        original = original.convert('RGB')
    elif original.mode == 'RGBA':
        bg = Image.new('RGB', original.size, (255, 255, 255))
        bg.paste(original, mask=original.split()[3])
        original = bg

    results = []

    for profile_name in profiles:
        if profile_name not in PROFILES:
            continue

        profile = PROFILES[profile_name]
        fmt = profile['format']
        quality = profile['quality']

        if profile_name == 'WEBP_ORIGINAL':
            max_w = profile.get('max_width', 3840)
            if original.size[0] > max_w:
                ratio = max_w / original.size[0]
                new_size = (max_w, int(original.size[1] * ratio))
                processed = original.resize(new_size, Image.LANCZOS)
            else:
                processed = original.copy()
        else:
            processed = smart_crop(original, profile['width'], profile['height'], focal_point)

        output_filename = f"{profile_name.lower()}.{fmt}"
        output_path = output_dir / output_filename

        save_kwargs = {'quality': quality, 'optimize': True}
        if fmt == 'webp':
            save_kwargs['method'] = 6

        processed.save(str(output_path), fmt.upper(), **save_kwargs)

        results.append({
            'perfil': profile_name,
            'formato': fmt,
            'largura': processed.size[0],
            'altura': processed.size[1],
            'tamanho': output_path.stat().st_size,
            'path': str(output_path),
        })

    return results
