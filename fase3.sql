-- FASE 3: ARQUITETURA MULTI-RÁDIO (WHITE LABEL)
-- Execute este script no painel SQL do Supabase.

-- 1. Criar tabela app_radios
CREATE TABLE IF NOT EXISTS public.app_radios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR NOT NULL,
    logo_radio VARCHAR,
    cor_padrao VARCHAR DEFAULT '#6b21a8',
    slug VARCHAR UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (opcional dependendo da arquitetura, mas recomendado)
ALTER TABLE public.app_radios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rádios são visíveis publicamente" 
ON public.app_radios FOR SELECT 
USING (true);

-- 2. Alterar app_eventos (caso ainda não seja Foreign Key explícita)
-- Como SorteioConfig estava usando user.slug como radio_id, é importante ter certeza:
-- Se "radio_id" já existe em app_eventos e é text/varchar (slug), vamos mantê-lo ou converter para UUID.
-- Recomendação de segurança: se antes era slug, adicione uma constraint ou migre para fk (UUID) no futuro.
-- Por enquanto, garantimos apenas a estrutura básica exigida:
-- ALTER TABLE public.app_eventos ADD COLUMN IF NOT EXISTS radio_id_fk UUID REFERENCES public.app_radios(id);

-- Para iniciar a tabela app_radios a partir dos profiles existentes:
INSERT INTO public.app_radios (nome, slug)
SELECT nome_completo, slug FROM public.profiles 
WHERE slug IS NOT NULL
ON CONFLICT (slug) DO NOTHING;
