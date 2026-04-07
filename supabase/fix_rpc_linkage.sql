-- REVISÃO DO RPC create_radio_account (MUITO IMPORTANTE)
-- Este RPC agora cria a rádio E vincula o slug ao perfil do dono para o RLS funcionar.

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
  actual_owner uuid := COALESCE(p_owner, auth.uid());
BEGIN
  -- 1. Inserir/Atualizar a rádio na tabela app_radios
  INSERT INTO public.app_radios (nome, slug, owner, created_at)
  VALUES (p_nome, norm_slug, actual_owner, now())
  ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, owner = EXCLUDED.owner;

  -- 2. Vincular o slug ao perfil do usuário para o RLS atual funcionar
  -- O RLS do sr. Gil usa: WHERE (slug IN ( SELECT profiles.slug FROM profiles WHERE (profiles.id = auth.uid())))
  UPDATE public.profiles 
  SET slug = norm_slug, pin = p_pin, nome_completo = p_nome
  WHERE id = actual_owner;

  RETURN jsonb_build_object('status', 'success', 'slug', norm_slug, 'owner', actual_owner);
END;
$$;
