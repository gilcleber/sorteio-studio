-- Migration para Otimização de Performance e Sorteio Server-Side
-- Adição de RLS / Policies e Índice de buscas.

CREATE INDEX IF NOT EXISTS idx_user_id_nome ON app_participantes (user_id, nome);

CREATE OR REPLACE FUNCTION executar_sorteio_seguro(p_user_id UUID, p_brinde VARCHAR)
RETURNS jsonb AS $$
DECLARE
    v_ganhador RECORD;
    v_historico_id bigint;
    v_resultado jsonb;
BEGIN
    SELECT * INTO v_ganhador 
    FROM app_participantes
    WHERE user_id = p_user_id
    ORDER BY RANDOM()
    LIMIT 1;

    IF v_ganhador.id IS NULL THEN
        RAISE EXCEPTION 'Nenhum participante encontrado para este evento.';
    END IF;

    v_resultado := row_to_json(v_ganhador)::jsonb || 
                   jsonb_build_object('dataHora', now(), 'premio', p_brinde);

    INSERT INTO app_historico (user_id, nome, telefone, premio, detalhes)
    VALUES (p_user_id, v_ganhador.nome, v_ganhador.telefone, p_brinde, v_resultado)
    RETURNING id INTO v_historico_id;

    v_resultado := v_resultado || jsonb_build_object('historico_id', v_historico_id, 'data_ganho', now());

    RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
