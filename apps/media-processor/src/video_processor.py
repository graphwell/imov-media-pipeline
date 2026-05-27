import subprocess
import json
import os
from pathlib import Path


def get_video_info(video_path: str) -> dict:
    cmd = ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_streams', '-show_format', video_path]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"ffprobe falhou: {result.stderr}")

    data = json.loads(result.stdout)
    video_stream = next((s for s in data['streams'] if s['codec_type'] == 'video'), {})

    fps = 0.0
    fps_str = video_stream.get('r_frame_rate', '0/1')
    try:
        num, den = fps_str.split('/')
        fps = float(num) / float(den) if float(den) > 0 else 0.0
    except Exception:
        pass

    return {
        'duracao': float(data['format'].get('duration', 0)),
        'largura': video_stream.get('width'),
        'altura': video_stream.get('height'),
        'fps': round(fps, 2),
        'codec': video_stream.get('codec_name'),
        'bitrate': int(data['format'].get('bit_rate', 0)),
        'tamanho': int(data['format'].get('size', 0)),
    }


def process_video(input_path: str, output_dir: str) -> dict:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    info = get_video_info(input_path)
    results = {}

    # 1. Thumbnail
    thumb_time = max(1, info['duracao'] * 0.1)
    thumb_path = output_dir / 'thumbnail.webp'
    subprocess.run([
        'ffmpeg', '-y', '-ss', str(thumb_time),
        '-i', input_path, '-vframes', '1',
        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease',
        str(thumb_path)
    ], capture_output=True)
    results['VIDEO_THUMB'] = str(thumb_path)

    # 2. MP4 HQ (1080p)
    mp4_hq_path = output_dir / 'video_hq.mp4'
    subprocess.run([
        'ffmpeg', '-y', '-i', input_path,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '22',
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
        str(mp4_hq_path)
    ], capture_output=True)
    results['VIDEO_MP4_HQ'] = str(mp4_hq_path)

    # 3. MP4 LQ (480p)
    mp4_lq_path = output_dir / 'video_lq.mp4'
    subprocess.run([
        'ffmpeg', '-y', '-i', input_path,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '28',
        '-vf', 'scale=854:480:force_original_aspect_ratio=decrease',
        '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart',
        str(mp4_lq_path)
    ], capture_output=True)
    results['VIDEO_MP4_LQ'] = str(mp4_lq_path)

    # 4. HLS
    hls_dir = output_dir / 'hls'
    hls_dir.mkdir(exist_ok=True)
    subprocess.run([
        'ffmpeg', '-y', '-i', input_path,
        '-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac',
        '-hls_time', '6', '-hls_list_size', '0',
        '-hls_segment_filename', str(hls_dir / 'seg_%03d.ts'),
        str(hls_dir / 'index.m3u8')
    ], capture_output=True)
    results['VIDEO_HLS'] = str(hls_dir / 'index.m3u8')

    return {'info': info, 'versoes': results}
