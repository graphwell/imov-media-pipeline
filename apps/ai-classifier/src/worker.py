import os
import json
import time
import asyncio
import structlog
import redis.asyncio as aioredis
from classifier import classify_image_with_ai, classify_by_filename

structlog.configure(processors=[structlog.dev.ConsoleRenderer()])
logger = structlog.get_logger()

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '')
TMP_DIR = os.getenv('TMP_DIR', '/tmp/media-processing')
MAX_CONCURRENT = int(os.getenv('MAX_CONCURRENT_AI', 3))
QUEUE = 'importacao'

sem = asyncio.Semaphore(MAX_CONCURRENT)


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


async def enqueue_job(r, job_name: str, data: dict):
    """Adiciona um job à fila no formato BullMQ."""
    job_id = str(await r.incr(f'bull:{QUEUE}:id'))
    job_key = f'bull:{QUEUE}:{job_id}'
    await r.hset(job_key, mapping={
        'id': job_id,
        'name': job_name,
        'data': json.dumps(data),
        'opts': json.dumps({'attempts': 3, 'backoff': {'type': 'exponential', 'delay': 1000}}),
        'timestamp': str(int(time.time() * 1000)),
        'attemptsMade': '0',
        'stacktrace': '[]',
    })
    await r.rpush(f'bull:{QUEUE}:wait', job_id)
    return job_id


async def classify_job(data: dict) -> dict:
    async with sem:
        file_path = data.get('filePath', '')
        nome_original = data.get('nomeOriginal', '')
        caminho_original = data.get('caminhoOriginal', '')

        # 1. Tenta por nome de arquivo
        result = classify_by_filename(nome_original)
        if result and result['confianca'] > 0.85:
            return result

        # 2. Tenta por estrutura de pasta
        if caminho_original:
            from folder_rules import FOLDER_RULES
            parts = caminho_original.lower().replace('\\', '/').split('/')
            for part in reversed(parts[:-1]):
                if part.strip() in FOLDER_RULES:
                    return {
                        'categoria': FOLDER_RULES[part.strip()],
                        'confianca': 0.85,
                        'classificadoPor': 'ESTRUTURA_PASTA',
                    }

        # 3. IA Visual (apenas imagens)
        ext = file_path.split('.')[-1].lower() if file_path else ''
        if ext in ('jpg', 'jpeg', 'png', 'webp', 'gif') and os.path.exists(file_path):
            try:
                result = await asyncio.to_thread(classify_image_with_ai, file_path)
                return result
            except Exception as e:
                logger.error("ai_classify_failed", error=str(e))

        return {'categoria': 'OUTRO', 'confianca': 0.5, 'classificadoPor': 'FALLBACK'}


async def main():
    logger.info("ai_classifier_started", queue=f'bull:{QUEUE}:wait')

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
            data = job['data']

            if job_name != 'classify-file':
                # Devolve jobs de outros tipos para o final da fila
                await r.rpush(f'bull:{QUEUE}:wait', job_id)
                await asyncio.sleep(0.1)
                continue

            try:
                classification = await classify_job(data)
                logger.info(
                    "classified",
                    arquivo=data.get('nomeOriginal'),
                    categoria=classification.get('categoria'),
                )

                # Enfileira process-media após classificação
                await enqueue_job(r, 'process-media', {
                    **data,
                    'categoria': classification.get('categoria'),
                    'focalPoint': classification.get('focalPoint'),
                    'confianca': classification.get('confianca'),
                    'classificadoPor': classification.get('classificadoPor'),
                    'altText': classification.get('altText'),
                    'tags': classification.get('tags', []),
                })

            except Exception as e:
                logger.error("classify_job_failed", job_id=job_id, error=str(e))

        except Exception as e:
            logger.error("worker_error", error=str(e))
            await asyncio.sleep(5)


if __name__ == '__main__':
    asyncio.run(main())
