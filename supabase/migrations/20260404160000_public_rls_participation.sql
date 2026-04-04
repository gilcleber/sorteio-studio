-- RLS Público para PaginaParticipacao
CREATE POLICY "Allow public select app_historico" ON public.app_historico FOR SELECT USING (true);
CREATE POLICY "Allow public select app_brindes" ON public.app_brindes FOR SELECT USING (true);
CREATE POLICY "Allow public select app_patrocinadores" ON public.app_patrocinadores FOR SELECT USING (true);
CREATE POLICY "Allow public select app_formulario_config" ON public.app_formulario_config FOR SELECT USING (true);
CREATE POLICY "Allow public insert app_participantes" ON public.app_participantes FOR INSERT WITH CHECK (true);
