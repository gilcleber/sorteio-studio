-- FASE 2: Expansão do Motor do Sorteio Studio
-- Trazendo robustez para Capas de Brindes, Patrocinadores e Formulários Live.

-- Adicionar colunas em app_brindes (prêmios)
ALTER TABLE app_brindes ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE app_brindes ADD COLUMN IF NOT EXISTS imagem_url TEXT;
ALTER TABLE app_brindes ADD COLUMN IF NOT EXISTS galeria JSONB;

-- Nova tabela: patrocinadores
CREATE TABLE IF NOT EXISTS app_patrocinadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sorteio_id UUID REFERENCES app_historico(id),
  nome TEXT NOT NULL,
  logo_url TEXT,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nova tabela: configuração do formulário
CREATE TABLE IF NOT EXISTS app_formulario_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  radio_id TEXT NOT NULL, -- user_id do logista
  campos JSONB NOT NULL DEFAULT '[]',
  acao_pos_participacao JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar slug e QR rules para sessões de sorteios independentes em app_historico
ALTER TABLE app_historico ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE app_historico ADD COLUMN IF NOT EXISTS data_sorteio TIMESTAMPTZ;
ALTER TABLE app_historico ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'unico';
ALTER TABLE app_historico ADD COLUMN IF NOT EXISTS qtd_ganhadores INT DEFAULT 1;

-- RLs Segurança
-- RLS para tabela app_historico (Acesso de leitura anônimo para ler slugs de evento)
-- RLS para inserção anônima não ocorre em app_historico (quem ganha é gerado na RPC), mas será gerado no app_participantes.
