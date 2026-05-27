import os
import json
import asyncio
import logging
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


async def process_job(job_data: dict):
    job_type = job_data.get('name')
    data = job_data.get('data', {})

    logger.info("job_started", job_type=job_type)

    if job_type == 'process-image':
        file_path = data['filePath']
        output_dir = os.path.join(TMP_DIR, data['empreendimentoId'], 'processed', data['mediaId'])
        focal_point = data.get('focalPoint')
        profiles = data.get('profiles')

        if not focal_point:
            focal_point = detect_focal_point(file_path)

        results = process_image(file_path, output_dir, focal_point, profiles)
        logger.info("image_processed", media_id=data['mediaId'], versions=len(results))
        return {'versoes': results, 'focalPoint': focal_point}

    elif job_type == 'process-video':
        file_path = data['filePath']
        output_dir = os.path.join(TMP_DIR, data['empreendimentoId'], 'video', data['mediaId'])

        result = process_video(file_path, output_dir)
        logger.info("video_processed", media_id=data['mediaId'])
        return result

    else:
        logger.warning("unknown_job_type", job_type=job_type)


async def main():
    logger.info("media_processor_started")

    r = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD or None)

    while True:
        try:
            result = await r.blpop(['bull:media-processing:wait'], timeout=5)

            if result:
                _, job_bytes = result
                job_data = json.loads(job_bytes)
                try:
                    output = await asyncio.to_thread(process_job, job_data)
                    logger.info("job_completed", job_id=job_data.get('id'))
                except Exception as e:
                    logger.error("job_failed", error=str(e))

        except Exception as e:
            logger.error("worker_error", error=str(e))
            await asyncio.sleep(5)


if __name__ == '__main__':
    asyncio.run(main())
