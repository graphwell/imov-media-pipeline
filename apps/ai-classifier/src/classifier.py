import anthropic
import base64
import json
from pathlib import Path
import structlog

logger = structlog.get_logger()
client = anthropic.Anthropic()

CATEGORIAS_PROMPT = """
Você é um especialista em classificação de imagens de empreendimentos imobiliários.

Analise a imagem e retorne APENAS um JSON válido com:
{
  "categoria": "<categoria>",
  "subcategoria": "<subcategoria opcional ou null>",
  "confianca": <0.0-1.0>,
  "sujeitoPrincipal": "<o que é o assunto principal>",
  "focalPoint": {"x": <0.0-1.0>, "y": <0.0-1.0>},
  "altText": "<descrição acessível em português>",
  "tags": ["tag1", "tag2"],
  "qualidadeVisual": <1-5>
}

Categorias disponíveis:
FACHADA, AREA_DE_LAZER, PISCINA, ACADEMIA, SALAO_DE_FESTAS, PLAYGROUND,
PLANTA_BAIXA, PLANTA_HUMANIZADA, PLANTA_3D, LOGO, BANNER, POST_INSTAGRAM,
POST_FACEBOOK, VIDEO_TOUR, VIDEO_DRONE, QUARTO, SALA, COZINHA, BANHEIRO,
VARANDA, AREA_GOURMET, VISTA, MAPA_LOCALIZACAO, OBRA, OUTRO

Para focalPoint: identifique o ponto de interesse principal da imagem.
x=0 é esquerda, x=1 é direita, y=0 é topo, y=1 é base.
"""

EXTRACAO_PDF_PROMPT = """
Você é um especialista em extração de dados de materiais comerciais imobiliários.

Analise o documento e extraia as informações em formato JSON:
{
  "nomeEmpreendimento": "<nome ou null>",
  "construtora": "<nome da construtora ou null>",
  "bairro": "<bairro ou null>",
  "cidade": "<cidade ou null>",
  "estado": "<estado ou null>",
  "metragem": { "min": <numero>, "max": <numero>, "unidade": "m²" },
  "quartos": { "min": <numero>, "max": <numero> },
  "banheiros": { "min": <numero>, "max": <numero> },
  "vagas": { "min": <numero>, "max": <numero> },
  "andares": <numero ou null>,
  "unidades": <numero ou null>,
  "precoMin": <numero ou null>,
  "precoMax": <numero ou null>,
  "entrega": "<data prevista ou null>",
  "diferenciais": ["diferencial1"],
  "descricaoComercial": "<texto descritivo completo>",
  "tipoDocumento": "FOLDER|MEMORIAL_DESCRITIVO|TABELA_PRECO|OUTRO",
  "confianca": <0.0-1.0>
}

Se algum campo não encontrado, use null.
Retorne APENAS o JSON, sem explicações.
"""


def classify_by_filename(filename: str) -> dict | None:
    name = filename.lower()

    rules = [
        (['fachada', 'facade', 'externo', 'externa', 'frente'], 'FACHADA', 0.9),
        (['piscina', 'pool', 'aqua'], 'PISCINA', 0.92),
        (['academia', 'gym', 'fitness'], 'ACADEMIA', 0.92),
        (['planta_hum', 'humanizada', 'ambientada'], 'PLANTA_HUMANIZADA', 0.92),
        (['planta', 'plant', 'floor_plan', 'floorplan'], 'PLANTA_BAIXA', 0.85),
        (['logo', 'brand', 'marca'], 'LOGO', 0.95),
        (['video', 'tour', 'drone', 'aerial'], 'VIDEO_TOUR', 0.9),
        (['banner', 'hero', 'destaque'], 'BANNER', 0.88),
        (['insta', 'instagram', 'post'], 'POST_INSTAGRAM', 0.92),
        (['lazer', 'leisure', 'salao', 'churrasq', 'gourmet'], 'AREA_DE_LAZER', 0.88),
        (['quarto', 'suite', 'bedroom', 'dorm'], 'QUARTO', 0.9),
        (['sala', 'living', 'lounge'], 'SALA', 0.9),
        (['cozinha', 'kitchen'], 'COZINHA', 0.92),
        (['banheiro', 'bath', 'lavabo'], 'BANHEIRO', 0.9),
        (['varanda', 'sacada', 'balcony'], 'VARANDA', 0.9),
        (['obra', 'construcao', 'andamento'], 'OBRA', 0.88),
        (['folder', 'comercial'], 'PDF_FOLDER', 0.85),
        (['memorial', 'descritivo'], 'PDF_MEMORIAL', 0.9),
        (['tabela', 'preco', 'price'], 'TABELA_PRECO', 0.88),
    ]

    for keywords, categoria, confianca in rules:
        if any(k in name for k in keywords):
            return {'categoria': categoria, 'confianca': confianca, 'classificadoPor': 'NOME_ARQUIVO'}

    return None


def classify_by_folder_path(folder_path: str) -> dict | None:
    from folder_rules import FOLDER_RULES
    parts = folder_path.lower().replace('\\', '/').split('/')

    for part in reversed(parts):
        part = part.strip()
        if part in FOLDER_RULES:
            return {'categoria': FOLDER_RULES[part], 'confianca': 0.85, 'classificadoPor': 'ESTRUTURA_PASTA'}

    return None


def classify_image_with_ai(image_path: str) -> dict:
    quick = classify_by_filename(Path(image_path).name)
    if quick and quick['confianca'] > 0.85:
        return quick

    with open(image_path, 'rb') as f:
        image_data = base64.standard_b64encode(f.read()).decode('utf-8')

    ext = Path(image_path).suffix.lower()
    media_type_map = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.webp': 'image/webp',
        '.gif': 'image/gif'
    }
    media_type = media_type_map.get(ext, 'image/jpeg')

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_data}},
                {"type": "text", "text": CATEGORIAS_PROMPT}
            ],
        }]
    )

    text = response.content[0].text.replace('```json', '').replace('```', '').strip()
    result = json.loads(text)
    result['classificadoPor'] = 'IA_VISUAL'
    return result


def extract_pdf_data(pdf_text: str, document_name: str) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"Documento: {document_name}\n\nConteúdo:\n{pdf_text[:8000]}\n\n{EXTRACAO_PDF_PROMPT}"
        }]
    )

    text = response.content[0].text.replace('```json', '').replace('```', '').strip()
    return json.loads(text)
