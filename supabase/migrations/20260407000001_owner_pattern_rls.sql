-- ======================================================
-- MIGRATION: OWNER PATTERN & RECOVERY (MANDATORY)
-- ======================================================

-- 1. GARANTIR COLUNA OWNER NAS TABELAS
ALTER TABLE public.app_radios ADD COLUMN IF NOT EXISTS owner UUID DEFAULT auth.uid();
ALTER TABLE public.app_patrocinadores ADD COLUMN IF NOT EXISTS owner UUID DEFAULT auth.uid();
ALTER TABLE public.app_eventos ADD COLUMN IF NOT EXISTS owner UUID DEFAULT auth.uid();

-- 2. RECUPERAÇÃO DE DADOS (OPCIONAL MAS RECOMENDADO)
-- Se já houver radios sem owner, vincula ao primeiro admin encontrado ou ao master
UPDATE public.app_radios SET owner = (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1) WHERE owner IS NULL;

-- 3. ATUALIZAR RPC PARA TRATA PERFIS TAMBÉM
CREATE OR REPLACE FUNCTION create_radio_account(
  p_nome text,
  p_slug text,
  p_email text,
  p_pin text,
  p_owner uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  norm_slug text := lower(regexp_replace(p_slug, '[^a-z0-9\-]', '-', 'g'));
BEGIN
  -- Se o perfil não existe mas queremos criar a rádio, garantimos a rádio primeiro.
  -- O perfil deve ser criado pelo Auth Trigger em condições ideais.
  
  INSERT INTO public.app_radios (nome, slug, owner, created_at)
  VALUES (p_nome, norm_slug, COALESCE(p_owner, auth.uid()), now())
  ON CONFLICT (slug) DO UPDATE SET owner = EXCLUDED.owner, nome = EXCLUDED.nome;

  RETURN jsonb_build_object('status', 'success', 'slug', norm_slug);
END;
$$;

-- 4. POLÍTICAS RLS ROBUSTAS (OWNER + MASTER BYPASS)
-- Permite que o Dono edite E que o Super Admin edite

-- app_radios
DROP POLICY IF EXISTS "Radios manage own branding_all" ON public.app_radios;

CREATE POLICY "Radios manage own branding_all" 
ON public.app_radios FOR ALL 
USING (
    owner = auth.uid() OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- app_patrocinadores
DROP POLICY IF EXISTS "Radios manage own sponsors" ON public.app_patrocinadores;
CREATE POLICY "Radios manage own sponsors" 
ON public.app_patrocinadores FOR ALL 
USING (
    owner = auth.uid() OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- app_eventos
DROP POLICY IF EXISTS "Radios manage own events" ON public.app_eventos;
CREATE POLICY "Radios manage own events" 
ON public.app_eventos FOR ALL 
USING (
    owner = auth.uid() OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
