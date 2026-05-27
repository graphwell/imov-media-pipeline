-- docker/postgres/init.sql
-- Inicialização do banco IMOV MEDIA PIPELINE AI

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- busca por similaridade textual
CREATE EXTENSION IF NOT EXISTS "unaccent";     -- busca sem acentos
CREATE EXTENSION IF NOT EXISTS "vector";       -- pgvector para embeddings

-- Índice GIN para busca textual nos empreendimentos
-- (criado após o Prisma criar as tabelas)
-- CREATE INDEX CONCURRENTLY idx_empreendimento_search
--   ON "Empreendimento" USING GIN (to_tsvector('portuguese', nome || ' ' || COALESCE(bairro,'') || ' ' || COALESCE(cidade,'')));

-- Configuração de timezone
SET timezone = 'America/Fortaleza';
ALTER DATABASE imov_media SET timezone TO 'America/Fortaleza';

-- Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE 'IMOV MEDIA PIPELINE AI - Banco inicializado com sucesso';
  RAISE NOTICE 'Extensões: uuid-ossp, pg_trgm, unaccent, vector';
  RAISE NOTICE 'Timezone: America/Fortaleza';
END
$$;
