-- Sorteio Fácil - Migration: Enable pgcrypto and create_radio_account RPC

-- 1. Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. RPC create_radio_account
CREATE OR REPLACE FUNCTION create_radio_account(
  p_nome text,
  p_slug text,
  p_email text,
  p_pin text,
  p_owner uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  norm_slug text := lower(regexp_replace(p_slug, '[^a-z0-9\-]', '-', 'g'));
  created_user jsonb;
BEGIN
  -- Insert radio row
  INSERT INTO public.app_radios (nome, slug, logo_radio, cor_padrao, owner, created_at)
  VALUES (p_nome, norm_slug, NULL, NULL, COALESCE(p_owner, auth.uid()), now())
  ON CONFLICT (slug) DO UPDATE
    SET nome = EXCLUDED.nome
  RETURNING to_jsonb( (SELECT ar FROM public.app_radios ar WHERE ar.slug = norm_slug) ) INTO created_user;

  RETURN jsonb_build_object('radio', created_user, 'slug', norm_slug);
END;
$$ SECURITY DEFINER;
