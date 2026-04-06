-- ======================================================
-- SCRIPT DE CORREÇÃO DE PERMISSÕES (RLS) - SORTEIO STUDIO (V2)
-- ======================================================
-- Execute este script no SQL Editor do seu painel Supabase.

-- 0. GARANTIR QUE AS COLUNAS DE VÍNCULO EXISTAM
ALTER TABLE public.app_patrocinadores ADD COLUMN IF NOT EXISTS radio_id TEXT;
ALTER TABLE public.app_eventos ADD COLUMN IF NOT EXISTS radio_id TEXT;

-- 1. Políticas para a tabela app_radios (Branding)
ALTER TABLE public.app_radios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Radios can manage their own branding_update" ON public.app_radios;
CREATE POLICY "Radios can manage their own branding_update"
ON public.app_radios
FOR UPDATE
USING (slug IN (SELECT slug FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (slug IN (SELECT slug FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Radios can manage their own branding_insert" ON public.app_radios;
CREATE POLICY "Radios can manage their own branding_insert"
ON public.app_radios
FOR INSERT
WITH CHECK (slug IN (SELECT slug FROM public.profiles WHERE id = auth.uid()));

-- 2. Políticas para a tabela app_patrocinadores (Banco de Patrocinadores)
ALTER TABLE public.app_patrocinadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Radios can manage their own sponsors" ON public.app_patrocinadores;
CREATE POLICY "Radios can manage their own sponsors"
ON public.app_patrocinadores
FOR ALL
USING (radio_id IN (SELECT slug FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (radio_id IN (SELECT slug FROM public.profiles WHERE id = auth.uid()));

-- 3. Políticas para a tabela app_eventos (Sorteios)
ALTER TABLE public.app_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Radios can manage their own events" ON public.app_eventos;
CREATE POLICY "Radios can manage their own events"
ON public.app_eventos
FOR ALL
USING (radio_id IN (SELECT slug FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (radio_id IN (SELECT slug FROM public.profiles WHERE id = auth.uid()));

-- 4. Garantir que a tabela app_radios tenha SELECT público
DROP POLICY IF EXISTS "Rádios são visíveis publicamente" ON public.app_radios;
CREATE POLICY "Rádios são visíveis publicamente" 
ON public.app_radios FOR SELECT 
USING (true);
