import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  Plus,
  Clock,
  Users,
  DollarSign,
  Percent,
  AlertCircle,
  Edit2,
  X,
  Settings,
  TimerReset,
  Copy,
  ExternalLink,
  UserCheck,
  BriefcaseBusiness,
  Palette,
  MessageCircle,
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

function obterComissaoPercentual(profissional) {
  const valor = Number(profissional?.comissao_percentual);
  return Number.isFinite(valor) ? valor : 40;
}

export default function Servicos() {
  const { slug } = useParams();
  const [estabelecimento, setEstabelecimento] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [vinculosProfissionais, setVinculosProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [modoEdicaoServico, setModoEdicaoServico] = useState(false);
  const [idServicoEditando, setIdServicoEditando] = useState(null);
  const [modoEdicaoProfissional, setModoEdicaoProfissional] = useState(false);
  const [idProfissionalEditando, setIdProfissionalEditando] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    preco: '',
    duracao: '60',
    capacidade_simultanea: '1'
  });
  const [perfilOperacional, setPerfilOperacional] = useState({
    horario_inicio: '08:00',
    horario_fim: '18:00',
    intervalo_agenda: '30'
  });
  const [branding, setBranding] = useState({
    nome_estudio: '',
    mensagem_publica: '',
    whatsapp: '',
    cor_primaria: '#0f172a',
    cor_secundaria: '#10b981',
    cor_fundo: '#f8fafc'
  });
  const [formProfissional, setFormProfissional] = useState({
    nome: '',
    telefone: '',
    especialidade: '',
    horario_inicio: '',
    horario_fim: '',
    comissao_percentual: '40',
    ativo: true,
    servicos: []
  });
  const linkPublico = `${window.location.origin}/${slug || estabelecimento?.slug || 'studio-demo'}`;

  const carregarDadosEstudioEServicos = useCallback(async () => {
    try {
      setLoading(true);
      const currentSlug = slug || 'studio-demo';
      
      const { data: est } = await supabase
        .from('estabelecimentos')
        .select('*')
        .eq('slug', currentSlug)
        .maybeSingle();

      if (est) {
        setEstabelecimento(est);
        setPerfilOperacional({
          horario_inicio: est.horario_inicio || est.hora_abertura || est.horario_abertura || '08:00',
          horario_fim: est.horario_fim || est.hora_fechamento || est.horario_fechamento || '18:00',
          intervalo_agenda: String(est.intervalo_agenda || est.intervalo_minutos || 30)
        });
        setBranding({
          nome_estudio: est.nome_estudio || est.nome || '',
          mensagem_publica: est.mensagem_publica || 'Escolha seu procedimento e reserve o melhor horário para você.',
          whatsapp: est.whatsapp || est.telefone || '',
          cor_primaria: est.cor_primaria || '#0f172a',
          cor_secundaria: est.cor_secundaria || '#10b981',
          cor_fundo: est.cor_fundo || '#f8fafc'
        });
        
        const { data: sv, error } = await supabase
          .from('servicos')
          .select('*')
          .eq('estabelecimento_id', est.id)
          .order('nome', { ascending: true });
          
        if (!error) setServicos(sv || []);

        const { data: prof, error: errProf } = await supabase
          .from('profissionais')
          .select('*')
          .eq('estabelecimento_id', est.id)
          .order('nome', { ascending: true });

        if (!errProf) setProfissionais(prof || []);

        const { data: vinc, error: errVinc } = await supabase
          .from('servico_profissionais')
          .select('*');

        if (!errVinc) setVinculosProfissionais(vinc || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarDadosEstudioEServicos();
  }, [carregarDadosEstudioEServicos]);

  const handleSalvarServico = async (e) => {
    e.preventDefault();
    
    if (!form.nome.trim() || !form.preco) {
      toast({ variant: "destructive", title: "Atenção", description: "Nome e Preço são obrigatórios." });
      return;
    }

    if (!estabelecimento?.id) {
      toast({ variant: "destructive", title: "Erro de Vínculo", description: "Estúdio não identificado." });
      return;
    }

    try {
      const precoTratado = parseFloat(form.preco);
      const duracaoTratada = parseInt(form.duracao) || 60;
      const capacidadeTratada = parseInt(form.capacidade_simultanea) || 1;

      if (isNaN(precoTratado) || precoTratado <= 0) {
        toast({ variant: "destructive", title: "Preço Inválido", description: "Insira um valor maior que zero." });
        return;
      }

      const payload = {
          estabelecimento_id: estabelecimento.id,
          nome: form.nome.trim(),
          preco: precoTratado,
          duracao: duracaoTratada,
          capacidade_simultanea: capacidadeTratada
      };

      const { error } = modoEdicaoServico
        ? await supabase
            .from('servicos')
            .update(payload)
            .eq('id', idServicoEditando)
        : await supabase
            .from('servicos')
            .insert([payload]);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: modoEdicaoServico ? "Procedimento atualizado com sucesso." : "Procedimento cadastrado com sucesso."
      });
      
      limparFormularioServico();
      carregarDadosEstudioEServicos();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro ao salvar no banco", description: err.message });
    }
  };

  const iniciarEdicaoServico = (servico) => {
    setModoEdicaoServico(true);
    setIdServicoEditando(servico.id);
    setForm({
      nome: servico.nome || '',
      preco: String(servico.preco || ''),
      duracao: String(servico.duracao || servico.duracao_minutos || 60),
      capacidade_simultanea: String(servico.capacidade_simultanea || 1)
    });
  };

  const limparFormularioServico = () => {
    setModoEdicaoServico(false);
    setIdServicoEditando(null);
    setForm({ nome: '', preco: '', duracao: '60', capacidade_simultanea: '1' });
  };

  const handleSalvarPerfilOperacional = async (e) => {
    e.preventDefault();
    if (!estabelecimento?.id) return;

    try {
      const payload = {
        horario_inicio: perfilOperacional.horario_inicio,
        horario_fim: perfilOperacional.horario_fim,
        intervalo_agenda: parseInt(perfilOperacional.intervalo_agenda) || 30
      };

      const { error } = await supabase
        .from('estabelecimentos')
        .update(payload)
        .eq('id', estabelecimento.id);

      if (error) throw error;

      setEstabelecimento(prev => ({ ...prev, ...payload }));
      toast({ title: "Configuração salva", description: "A agenda inteligente usará estes horários." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar",
        description: err.message || "Verifique se as colunas horario_inicio, horario_fim e intervalo_agenda existem no banco."
      });
    }
  };

  const copiarLinkPublico = async () => {
    try {
      await navigator.clipboard.writeText(linkPublico);
      toast({ title: "Link copiado", description: "Envie este link para suas clientes agendarem online." });
    } catch {
      toast({ variant: "destructive", title: "Não foi possível copiar", description: linkPublico });
    }
  };

  const handleSalvarBranding = async (e) => {
    e.preventDefault();
    if (!estabelecimento?.id) return;

    try {
      const payload = {
        nome_estudio: branding.nome_estudio.trim(),
        mensagem_publica: branding.mensagem_publica.trim(),
        whatsapp: branding.whatsapp.replace(/\D/g, ''),
        cor_primaria: branding.cor_primaria,
        cor_secundaria: branding.cor_secundaria,
        cor_fundo: branding.cor_fundo
      };

      const { error } = await supabase
        .from('estabelecimentos')
        .update(payload)
        .eq('id', estabelecimento.id);

      if (error) throw error;

      setEstabelecimento(prev => ({ ...prev, ...payload }));
      toast({ title: "Marca atualizada", description: "O link público já usa essa identidade." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar a marca",
        description: err.message || "Verifique se as colunas de branding existem no banco."
      });
    }
  };

  const limparFormularioProfissional = () => {
    setModoEdicaoProfissional(false);
    setIdProfissionalEditando(null);
    setFormProfissional({
      nome: '',
      telefone: '',
      especialidade: '',
      horario_inicio: '',
      horario_fim: '',
      comissao_percentual: '40',
      ativo: true,
      servicos: []
    });
  };

  const iniciarEdicaoProfissional = (profissional) => {
    const servicosDoProfissional = vinculosProfissionais
      .filter(v => String(v.profissional_id) === String(profissional.id))
      .map(v => String(v.servico_id));

    setModoEdicaoProfissional(true);
    setIdProfissionalEditando(profissional.id);
    setFormProfissional({
      nome: profissional.nome || '',
      telefone: profissional.telefone || '',
      especialidade: profissional.especialidade || '',
      horario_inicio: profissional.horario_inicio || '',
      horario_fim: profissional.horario_fim || '',
      comissao_percentual: String(obterComissaoPercentual(profissional)),
      ativo: profissional.ativo !== false,
      servicos: servicosDoProfissional
    });
  };

  const alternarServicoProfissional = (servicoId) => {
    setFormProfissional(prev => {
      const id = String(servicoId);
      const existe = prev.servicos.includes(id);
      return {
        ...prev,
        servicos: existe
          ? prev.servicos.filter(item => item !== id)
          : [...prev.servicos, id]
      };
    });
  };

  const handleSalvarProfissional = async (e) => {
    e.preventDefault();
    if (!estabelecimento?.id || !formProfissional.nome.trim()) return;

    try {
      const payload = {
        estabelecimento_id: estabelecimento.id,
        nome: formProfissional.nome.trim(),
        telefone: formProfissional.telefone.replace(/\D/g, ''),
        especialidade: formProfissional.especialidade.trim(),
        horario_inicio: formProfissional.horario_inicio || null,
        horario_fim: formProfissional.horario_fim || null,
        ativo: formProfissional.ativo
      };

      const comissaoPercentual = Number(formProfissional.comissao_percentual);
      if (Number.isFinite(comissaoPercentual)) {
        payload.comissao_percentual = Math.min(Math.max(comissaoPercentual, 0), 100);
      }

      const query = modoEdicaoProfissional
        ? await supabase
            .from('profissionais')
            .update(payload)
            .eq('id', idProfissionalEditando)
            .select()
            .single()
        : await supabase
            .from('profissionais')
            .insert([payload])
            .select()
            .single();

      if (query.error) throw query.error;

      const profissionalId = query.data.id;

      await supabase
        .from('servico_profissionais')
        .delete()
        .eq('profissional_id', profissionalId);

      if (formProfissional.servicos.length > 0) {
        const novosVinculos = formProfissional.servicos.map(servicoId => ({
          servico_id: servicoId,
          profissional_id: profissionalId
        }));

        const { error: errVinculos } = await supabase
          .from('servico_profissionais')
          .insert(novosVinculos);

        if (errVinculos) throw errVinculos;
      }

      toast({
        title: "Profissional salvo",
        description: "A agenda inteligente já considera essa configuração."
      });
      limparFormularioProfissional();
      carregarDadosEstudioEServicos();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar profissional",
        description: err.message
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulário de Cadastro */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Link público
                </p>
                <p className="mt-1 truncate text-xs font-bold text-slate-700">
                  {linkPublico}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copiarLinkPublico}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </button>
              <a
                href={linkPublico}
                target="_blank"
                rel="noreferrer"
                className="h-10 rounded-xl bg-slate-900 text-[10px] font-black uppercase tracking-wider text-white hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase text-slate-700 tracking-wide flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-800" /> Operação do Estúdio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalvarPerfilOperacional} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Abre às</label>
                  <Input
                    type="time"
                    value={perfilOperacional.horario_inicio}
                    onChange={(e) => setPerfilOperacional({ ...perfilOperacional, horario_inicio: e.target.value })}
                    className="rounded-xl border-slate-300 h-11 text-xs text-slate-900 bg-white font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Fecha às</label>
                  <Input
                    type="time"
                    value={perfilOperacional.horario_fim}
                    onChange={(e) => setPerfilOperacional({ ...perfilOperacional, horario_fim: e.target.value })}
                    className="rounded-xl border-slate-300 h-11 text-xs text-slate-900 bg-white font-bold"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Intervalo entre sugestões</label>
                <select
                  value={perfilOperacional.intervalo_agenda}
                  onChange={(e) => setPerfilOperacional({ ...perfilOperacional, intervalo_agenda: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-bold focus:outline-none"
                >
                  <option value="15">A cada 15 minutos</option>
                  <option value="30">A cada 30 minutos</option>
                  <option value="45">A cada 45 minutos</option>
                  <option value="60">A cada 60 minutos</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full h-11 bg-slate-900 text-white font-bold rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <TimerReset className="w-4 h-4" />
                Salvar Operação
              </button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase text-slate-700 tracking-wide flex items-center gap-2">
              <Palette className="w-4 h-4 text-slate-800" /> Marca no Link Público
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalvarBranding} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nome exibido</label>
                <Input
                  value={branding.nome_estudio}
                  onChange={(e) => setBranding({ ...branding, nome_estudio: e.target.value })}
                  placeholder="Nome comercial do estúdio"
                  className="rounded-xl border-slate-300 h-11 text-xs text-slate-900 bg-white font-bold placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Mensagem de apresentação</label>
                <textarea
                  value={branding.mensagem_publica}
                  onChange={(e) => setBranding({ ...branding, mensagem_publica: e.target.value })}
                  rows={3}
                  maxLength={160}
                  placeholder="Uma frase curta para receber suas clientes"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">WhatsApp principal</label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={branding.whatsapp}
                    onChange={(e) => setBranding({ ...branding, whatsapp: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="h-11 rounded-xl border-slate-300 bg-white pl-9 text-xs font-bold text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ['cor_primaria', 'Principal'],
                  ['cor_secundaria', 'Destaque'],
                  ['cor_fundo', 'Fundo'],
                ].map(([campo, label]) => (
                  <label key={campo} className="space-y-1.5">
                    <span className="ml-1 block text-[9px] font-black uppercase text-slate-500">{label}</span>
                    <input
                      type="color"
                      value={branding[campo]}
                      onChange={(e) => setBranding({ ...branding, [campo]: e.target.value })}
                      className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                    />
                  </label>
                ))}
              </div>

              <div
                className="rounded-2xl border border-slate-200 p-4 text-white"
                style={{ background: branding.cor_primaria }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Prévia pública</p>
                <h4 className="mt-1 text-sm font-black uppercase">{branding.nome_estudio || 'Nome do estúdio'}</h4>
                <p className="mt-2 text-xs font-bold opacity-80">{branding.mensagem_publica || 'Mensagem de apresentação'}</p>
                <div className="mt-3 inline-flex rounded-xl px-3 py-2 text-[10px] font-black uppercase text-slate-950" style={{ background: branding.cor_secundaria }}>
                  Agendar horário
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-slate-900 text-white font-bold rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-slate-800 transition-colors block"
              >
                Salvar Marca Pública
              </button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black uppercase text-slate-700 tracking-wide flex items-center gap-2">
              {modoEdicaoProfissional ? <Edit2 className="w-4 h-4 text-slate-800" /> : <UserCheck className="w-4 h-4 text-slate-800" />}
              {modoEdicaoProfissional ? 'Editar Profissional' : 'Novo Profissional'}
            </CardTitle>
            {modoEdicaoProfissional && (
              <button
                type="button"
                onClick={limparFormularioProfissional}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalvarProfissional} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nome *</label>
                <Input
                  placeholder="Ex: Camila Santos"
                  value={formProfissional.nome}
                  onChange={(e) => setFormProfissional({ ...formProfissional, nome: e.target.value })}
                  className="rounded-xl border-slate-300 h-11 text-xs text-slate-900 bg-white font-bold placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Telefone</label>
                  <Input
                    placeholder="WhatsApp"
                    value={formProfissional.telefone}
                    onChange={(e) => setFormProfissional({ ...formProfissional, telefone: e.target.value })}
                    className="rounded-xl border-slate-300 h-11 text-xs text-slate-900 bg-white font-bold placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Especialidade</label>
                  <Input
                    placeholder="Ex: cílios"
                    value={formProfissional.especialidade}
                    onChange={(e) => setFormProfissional({ ...formProfissional, especialidade: e.target.value })}
                    className="rounded-xl border-slate-300 h-11 text-xs text-slate-900 bg-white font-bold placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Início</label>
                  <Input
                    type="time"
                    value={formProfissional.horario_inicio}
                    onChange={(e) => setFormProfissional({ ...formProfissional, horario_inicio: e.target.value })}
                    className="rounded-xl border-slate-300 h-11 text-xs text-slate-900 bg-white font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Fim</label>
                  <Input
                    type="time"
                    value={formProfissional.horario_fim}
                    onChange={(e) => setFormProfissional({ ...formProfissional, horario_fim: e.target.value })}
                    className="rounded-xl border-slate-300 h-11 text-xs text-slate-900 bg-white font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Comissão padrão (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formProfissional.comissao_percentual}
                    onChange={(e) => setFormProfissional({ ...formProfissional, comissao_percentual: e.target.value })}
                    className="h-11 rounded-xl border-slate-300 bg-white pl-9 text-xs font-bold text-slate-900"
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400">
                  Usada no Financeiro para calcular comissão sobre atendimentos concluídos.
                </p>
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Serviços atendidos
                </p>
                {servicos.length > 0 ? (
                  <div className="space-y-2">
                    {servicos.map(servico => (
                      <label key={servico.id} className="flex items-center gap-2 rounded-xl bg-white border border-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={formProfissional.servicos.includes(String(servico.id))}
                          onChange={() => alternarServicoProfissional(servico.id)}
                          className="h-4 w-4 accent-slate-900"
                        />
                        <span className="truncate">{servico.nome}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-slate-400">Cadastre serviços antes de vincular.</p>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={formProfissional.ativo}
                  onChange={(e) => setFormProfissional({ ...formProfissional, ativo: e.target.checked })}
                  className="h-4 w-4 accent-slate-900"
                />
                Profissional ativo para agendamentos
              </label>

              <button
                type="submit"
                className="w-full h-11 bg-slate-900 text-white font-bold rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-slate-800 transition-colors block"
              >
                {modoEdicaoProfissional ? 'Salvar Profissional' : 'Cadastrar Profissional'}
              </button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl lg:sticky lg:top-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black uppercase text-slate-700 tracking-wide flex items-center gap-2">
              {modoEdicaoServico ? <Edit2 className="w-4 h-4 text-slate-800" /> : <Plus className="w-4 h-4 text-slate-800" />}
              {modoEdicaoServico ? 'Editar Procedimento' : 'Novo Procedimento'}
            </CardTitle>
            {modoEdicaoServico && (
              <button
                type="button"
                onClick={limparFormularioServico}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalvarServico} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nome do Serviço *</label>
                <Input 
                  placeholder="Ex: Extensão de Cílios, Bronzeamento..."
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="rounded-xl border-slate-300 h-11 text-xs text-slate-900 bg-white font-bold placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Preço (R$) *</label>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="150"
                    value={form.preco}
                    onChange={(e) => setForm({ ...form, preco: e.target.value })}
                    className="rounded-xl border-slate-300 h-11 text-xs text-slate-900 bg-white font-bold placeholder:text-slate-400"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Duração (Min) *</label>
                  <Input 
                    type="number" 
                    value={form.duracao}
                    onChange={(e) => setForm({ ...form, duracao: e.target.value })}
                    className="rounded-xl border-slate-300 h-11 text-xs text-slate-900 bg-white font-bold placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Atendimentos Simultâneos (Vagas) *</label>
                <Input 
                  type="number" 
                  min="1"
                  value={form.capacidade_simultanea}
                  onChange={(e) => setForm({ ...form, capacidade_simultanea: e.target.value })}
                  className="rounded-xl border-slate-300 h-11 text-xs text-slate-900 bg-white font-bold placeholder:text-slate-400"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="w-full h-11 bg-slate-900 text-white font-bold rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-slate-800 transition-colors block"
              >
                {modoEdicaoServico ? 'Salvar Alterações' : 'Cadastrar Serviço'}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Exibição */}
      <div className="lg:col-span-2">
        <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
              <BriefcaseBusiness className="w-4 h-4" />
              Equipe e atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profissionais.length > 0 ? (
              profissionais.map((profissional) => {
                const servicosDoProfissional = vinculosProfissionais
                  .filter(v => String(v.profissional_id) === String(profissional.id))
                  .map(v => servicos.find(s => String(s.id) === String(v.servico_id))?.nome)
                  .filter(Boolean);

                return (
                  <div key={profissional.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900 uppercase truncate">
                          {profissional.nome}
                        </h3>
                        <span className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${
                          profissional.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {profissional.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {profissional.especialidade || 'Sem especialidade'} · {profissional.horario_inicio || perfilOperacional.horario_inicio} às {profissional.horario_fim || perfilOperacional.horario_fim}
                      </p>
                      <p className="mt-1 text-[11px] font-black uppercase text-emerald-600">
                        Comissão: {obterComissaoPercentual(profissional).toFixed(1).replace('.0', '')}%
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-slate-400">
                        {servicosDoProfissional.length > 0 ? servicosDoProfissional.join(', ') : 'Nenhum serviço vinculado'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => iniciarEdicaoProfissional(profissional)}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-100 p-8 text-center">
                <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400 uppercase italic">
                  Cadastre profissionais para ativar a agenda multi-profissional.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servicos.length > 0 ? (
            servicos.map((servico) => (
              <Card key={servico.id} className="border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl flex flex-col justify-between overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    {/* AJUSTE FINO: Ícone alterado de text-amber-400 para text-slate-100 (Branco Suave) */}
                    <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-md border border-slate-800 flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-slate-100" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-800 leading-tight">
                        {servico.nome}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-100 text-[10px] font-black uppercase tracking-tight">
                    <div className="flex flex-col items-center bg-slate-50 p-2 rounded-xl text-center border border-slate-100/50">
                      <Clock className="w-3.5 h-3.5 mb-1 text-slate-700" />
                      <span className="text-slate-700 font-bold">{servico.duracao || 60} min</span>
                    </div>

                    <div className="flex flex-col items-center bg-slate-50 p-2 rounded-xl text-center border border-slate-100/50">
                      <Users className="w-3.5 h-3.5 mb-1 text-slate-700" />
                      <span className="text-slate-700 font-bold">Vagas: {servico.capacidade_simultanea || 1}</span>
                    </div>
                    
                    <div className="flex flex-col items-center bg-slate-900 p-2 rounded-xl text-center text-white shadow-md">
                      <DollarSign className="w-3.5 h-3.5 mb-1 text-slate-300" />
                      <span className="text-white font-black">R$ {Number(servico.preco).toFixed(0)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => iniciarEdicaoServico(servico)}
                    className="mt-3 w-full h-9 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar Serviço
                  </button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-2 text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-100">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400 uppercase italic">Nenhum serviço cadastrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
