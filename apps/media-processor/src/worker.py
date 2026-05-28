import os
import json
import time
import asyncio
import structlog
from pathlib import Path
import redis.asyncio as aioredis

from image_processor import process_image, detect_focal_point
from video_processor import process_video

structlog.configure(processors=[structlog.dev.ConsoleRenderer()])
logger = structlog.get_logger()

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '')
TMP_DIR = os.getenv('TMP_DIR', '/tmp/media-processing')
QUEUE = 'importacao'


async def fetch_job(r, job_id: str) -> dict | None:
    """Lê dados de um job BullMQ pelo ID (hash bull:{queue}:{id})."""
    raw = await r.hgetall(f'bull:{QUEUE}:{job_id}')
    if not raw:
        return None
    def d(key): return raw.get(key.encode(), b'').decode()
    return {
        'id': job_id,
        'name': d('name'),
        'data': json.loads(d('data') or '{}'),
    }


async def process_job(job: dict):
    job_name = job['name']
    data = job['data']

    logger.info("job_started", job_type=job_name, arquivo=data.get('nomeOriginal'))

    if job_name == 'process-media':
        file_path = data.get('filePath', '')
        arquivo_id = data.get('arquivoId', '')
        importacao_id = data.get('importacaoId', '')
        mime_type = data.get('mimeType', '')
        focal_point = data.get('focalPoint')

        if not file_path or not os.path.exists(file_path):
            logger.warning("file_not_found", file_path=file_path)
            return

        output_dir = os.path.join(TMP_DIR, importacao_id, 'processed', arquivo_id)

        if mime_type.startswith('image/'):
            if not focal_point:
                focal_point = detect_focal_point(file_path)
            results = process_image(file_path, output_dir, focal_point)
            logger.info("image_processed", arquivo_id=arquivo_id, versions=len(results))
            return {'versoes': results, 'focalPoint': focal_point}

        elif mime_type.startswith('video/'):
            result = process_video(file_path, output_dir)
            logger.info("video_processed", arquivo_id=arquivo_id)
            return result

        else:
            logger.info("skipped_non_media", mime_type=mime_type, arquivo_id=arquivo_id)

    elif job_name == 'process-image':
        file_path = data['filePath']
        output_dir = os.path.join(TMP_DIR, data['empreendimentoId'], 'processed', data['mediaId'])
        focal_point = data.get('focalPoint')
        profiles = data.get('profiles')

        if not focal_point:
            focal_point = detect_focal_point(file_path)

        results = process_image(file_path, output_dir, focal_point, profiles)
        logger.info("image_processed", media_id=data['mediaId'], versions=len(results))
        return {'versoes': results, 'focalPoint': focal_point}

    elif job_name == 'process-video':
        file_path = data['filePath']
        output_dir = os.path.join(TMP_DIR, data['empreendimentoId'], 'video', data['mediaId'])
        result = process_video(file_path, output_dir)
        logger.info("video_processed", media_id=data['mediaId'])
        return result

    else:
        logger.warning("unknown_job_type", job_type=job_name)


async def main():
    logger.info("media_processor_started", queue=f'bull:{QUEUE}:wait')

    r = aioredis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD or None,
    )

    while True:
        try:
            result = await r.blpop([f'bull:{QUEUE}:wait'], timeout=5)

            if not result:
                continue

            _, job_id_bytes = result
            job_id = job_id_bytes.decode() if isinstance(job_id_bytes, bytes) else job_id_bytes

            job = await fetch_job(r, job_id)
            if not job:
                logger.warning("job_not_found", job_id=job_id)
                continue

            job_name = job['name']

            if job_name not in ('process-media', 'process-image', 'process-video'):
                # Devolve jobs de outros tipos para o final da fila
                await r.rpush(f'bull:{QUEUE}:wait', job_id)
                await asyncio.sleep(0.1)
                continue

            try:
                await asyncio.to_thread(process_job, job)
                logger.info("job_completed", job_id=job_id)
            except Exception as e:
                logger.error("job_failed", job_id=job_id, error=str(e))

        except Exception as e:
            logger.error("worker_error", error=str(e))
            await asyncio.sleep(5)


if __name__ == '__main__':
    asyncio.run(main())
