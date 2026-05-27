import os
import json
import asyncio
import structlog
import redis.asyncio as aioredis
from classifier import classify_image_with_ai, classify_by_filename, extract_pdf_data

structlog.configure(processors=[structlog.dev.ConsoleRenderer()])
logger = structlog.get_logger()

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '')
TMP_DIR = os.getenv('TMP_DIR', '/tmp/media-processing')
MAX_CONCURRENT = int(os.getenv('MAX_CONCURRENT_AI', 3))

sem = asyncio.Semaphore(MAX_CONCURRENT)


async def classify_job(data: dict) -> dict:
    async with sem:
        file_path = data.get('filePath', '')
        nome_original = data.get('nomeOriginal', '')
        caminho_original = data.get('caminhoOriginal', '')

        # 1. Tenta por nome
        result = classify_by_filename(nome_original)
        if result and result['confianca'] > 0.85:
            return result

        # 2. Tenta por pasta
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

        # 3. IA Visual (apenas para imagens)
        ext = file_path.split('.')[-1].lower()
        if ext in ('jpg', 'jpeg', 'png', 'webp', 'gif') and os.path.exists(file_path):
            try:
                result = await asyncio.to_thread(classify_image_with_ai, file_path)
                return result
            except Exception as e:
                logger.error("ai_classify_failed", error=str(e))

        return {'categoria': 'OUTRO', 'confianca': 0.5, 'classificadoPor': 'NOME_ARQUIVO'}


async def main():
    logger.info("ai_classifier_started")

    r = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD or None)

    while True:
        try:
            result = await r.blpop(['bull:classification:wait'], timeout=5)

            if result:
                _, job_bytes = result
                job_data = json.loads(job_bytes)
                data = job_data.get('data', {})
                job_name = job_data.get('name', '')

                try:
                    if job_name in ('classify-by-ai', 'classify-file'):
                        output = await classify_job(data)
                        logger.info("classified", arquivo=data.get('nomeOriginal'), categoria=output.get('categoria'))
                except Exception as e:
                    logger.error("job_failed", error=str(e))

        except Exception as e:
            logger.error("worker_error", error=str(e))
            await asyncio.sleep(5)


if __name__ == '__main__':
    asyncio.run(main())
