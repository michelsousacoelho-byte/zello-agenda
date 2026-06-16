import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { agruparHorariosPorPeriodo, gerarHorariosDisponiveis, obterDuracaoServico } from '@/lib/scheduling';
import {
  Clock, Phone, Tag, Search, Calendar, Edit2, User,
  Plus, AlertCircle, TrendingUp, X, Trophy, Users, Star, Trash2,
  Upload, Loader2, CheckCircle2, MessageCircle, XCircle, Ban, Merge
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import Papa from 'papaparse';

// ─── Novo componente de histórico ─────────────────────────────────────────────
import ClienteHistoricoSheet from '@/pages/ClienteHistorico';

export default function SistemaGestao() {
  const { slug } = useParams();
  const [estabelecimento, setEstabelecimento] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('agenda');
  const [agendamentos, setAgendamentos] = useState([]);
  const [todosAgendamentos, setTodosAgendamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [vinculosProfissionais, setVinculosProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [tipoFiltroData, setTipoFiltroData] = useState('dia');
  const [filtroData, setFiltroData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [buscaCliente, setBuscaCliente] = useState('');

  const [termoBuscaClienteForm, setTermoBuscaClienteForm] = useState('');
  const [mostrarDropdownClientes, setMostrarDropdownClientes] = useState(false);
  const dropdownRef = useRef(null);

  const [modoEdicao, setModoEdicao] = useState(false);
  const [idAgendamentoEditando, setIdAgendamentoEditando] = useState(null);
  const [formAgendamento, setFormAgendamento] = useState({
    cliente_id: '',
    nome_cliente_manual: '',
    telefone: '',
    servico_id: '',
    profissional_id: '',
    hora: '08:00',
    valor: '',
    status: 'Confirmado'
  });

  const [modoEdicaoCliente, setModoEdicaoCliente] = useState(false);
  const [idClienteEditando, setIdClienteEditando] = useState(null);
  const [formCliente, setFormCliente] = useState({ nome: '', telefone: '' });

  // ── Estado do Sheet de Histórico ─────────────────────────────────────────
  const [sheetAberto, setSheetAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);

  // ── Estado da Importação CSV ─────────────────────────────────────────────
  const [importando, setImportando] = useState(false);
  const inputCsvRef = useRef(null);

  // ── Busca na aba de Clientes Cadastrados ─────────────────────────────────
  const [buscaClientesCadastrados, setBuscaClientesCadastrados] = useState('');

  useEffect(() => {
    function handleClickFora(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMostrarDropdownClientes(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  const formatarTelefone = (valor) => {
    if (!valor) return '';
    const apenasNumeros = valor.replace(/\D/g, '');
    if (apenasNumeros.length <= 2) return apenasNumeros.replace(/^(\d{0,2})/, '($1');
    if (apenasNumeros.length <= 6) return apenasNumeros.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
    if (apenasNumeros.length <= 10) return apenasNumeros.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    return apenasNumeros.substring(0, 11).replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const obterChaveTelefone = (valor) => {
    const apenasNumeros = (valor || '').replace(/\D/g, '');
    return apenasNumeros.length >= 10 ? apenasNumeros.slice(-11) : '';
  };

  const carregarDadosComponente = useCallback(async () => {
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

        let query = supabase
          .from('agendamentos')
          .select('*, clientes(*), servicos(*), profissionais(*)')
          .eq('estabelecimento_id', est.id);

        if (tipoFiltroData === 'dia') {
          query = query.gte('data_hora', `${filtroData}T00:00:00`).lte('data_hora', `${filtroData}T23:59:59`);
        } else if (tipoFiltroData === 'semana') {
          const dataAtual = parseISO(filtroData);
          const inicio = format(startOfWeek(dataAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
          const fim = format(endOfWeek(dataAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
          query = query.gte('data_hora', `${inicio}T00:00:00`).lte('data_hora', `${fim}T23:59:59`);
        } else {
          const dataAtual = parseISO(filtroData);
          const anoMes = format(dataAtual, 'yyyy-MM');
          const inicioMes = `${anoMes}-01`;
          const ultimoDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0).getDate();
          const fimMes = `${anoMes}-${String(ultimoDia).padStart(2, '0')}`;
          query = query.gte('data_hora', `${inicioMes}T00:00:00`).lte('data_hora', `${fimMes}T23:59:59`);
        }

        const { data: ag } = await query.order('data_hora', { ascending: true });
        setAgendamentos(ag || []);

        const { data: todos } = await supabase
          .from('agendamentos')
          .select('*, clientes(*), servicos(*), profissionais(*)')
          .eq('estabelecimento_id', est.id)
          .order('data_hora', { ascending: true });
        setTodosAgendamentos(todos || []);

        const { data: cl } = await supabase
          .from('clientes')
          .select('*')
          .eq('estabelecimento_id', est.id)
          .order('nome', { ascending: true });
        setClientes(cl || []);

        const { data: sv } = await supabase
          .from('servicos')
          .select('*')
          .eq('estabelecimento_id', est.id);
        setServicos(sv || []);

        const { data: prof } = await supabase
          .from('profissionais')
          .select('*')
          .eq('estabelecimento_id', est.id)
          .eq('ativo', true)
          .order('nome', { ascending: true });
        setProfissionais(prof || []);

        const { data: vinc } = await supabase
          .from('servico_profissionais')
          .select('*');
        setVinculosProfissionais(vinc || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filtroData, slug, tipoFiltroData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarDadosComponente();
  }, [carregarDadosComponente]);

  // ── Handlers de Agendamento ──────────────────────────────────────────────
  const handleServicoChange = (id) => {
    const servicoSelecionado = servicos.find(s => s.id === id);
    const profissionaisDoServico = vinculosProfissionais
      .filter(v => String(v.servico_id) === String(id))
      .map(v => profissionais.find(p => String(p.id) === String(v.profissional_id)))
      .filter(Boolean);
    const profissionalInicial = profissionaisDoServico[0] || null;
    const primeiroDisponivel = gerarHorariosDisponiveis({
      data: filtroData,
      servico: servicoSelecionado,
      agendamentos,
      estabelecimento,
      profissional: profissionalInicial,
      idAgendamentoIgnorado: modoEdicao ? idAgendamentoEditando : null,
    }).find(slot => slot.disponivel);

    setFormAgendamento(prev => ({
      ...prev,
      servico_id: id,
      profissional_id: profissionalInicial?.id || '',
      valor: servicoSelecionado ? servicoSelecionado.preco : '',
      hora: primeiroDisponivel?.hora || ''
    }));
  };

  const handleProfissionalChange = (id) => {
    const profissionalSelecionado = profissionais.find(p => String(p.id) === String(id)) || null;
    const servicoSelecionado = servicos.find(s => String(s.id) === String(formAgendamento.servico_id));
    const primeiroDisponivel = gerarHorariosDisponiveis({
      data: filtroData,
      servico: servicoSelecionado,
      agendamentos,
      estabelecimento,
      profissional: profissionalSelecionado,
      idAgendamentoIgnorado: modoEdicao ? idAgendamentoEditando : null,
    }).find(slot => slot.disponivel);

    setFormAgendamento(prev => ({
      ...prev,
      profissional_id: id,
      hora: primeiroDisponivel?.hora || ''
    }));
  };

  const selecionarClienteDaBusca = (cliente) => {
    setFormAgendamento(prev => ({
      ...prev,
      cliente_id: cliente.id,
      nome_cliente_manual: cliente.nome,
      telefone: formatarTelefone(cliente.telefone || '')
    }));
    setTermoBuscaClienteForm(cliente.nome);
    setMostrarDropdownClientes(false);
  };

  const handleDigitacaoCliente = (valor) => {
    setTermoBuscaClienteForm(valor);
    setMostrarDropdownClientes(true);
    setFormAgendamento(prev => ({
      ...prev,
      nome_cliente_manual: valor,
      cliente_id: prev.nome_cliente_manual === valor ? prev.cliente_id : ''
    }));
  };

  const handleSalvarAgendamento = async (e) => {
    e.preventDefault();
    if (!formAgendamento.nome_cliente_manual.trim()) return;
    if (!formAgendamento.servico_id) return;
    const profissionaisVinculados = vinculosProfissionais.filter(v =>
      String(v.servico_id) === String(formAgendamento.servico_id)
    );
    if (profissionaisVinculados.length > 0 && !formAgendamento.profissional_id) {
      toast({
        variant: "destructive",
        title: "Selecione o profissional",
        description: "Este serviço precisa de um profissional responsável."
      });
      return;
    }

    const horarioLivre = gerarHorariosDisponiveis({
      data: filtroData,
      servico: servicos.find(s => String(s.id) === String(formAgendamento.servico_id)),
      agendamentos,
      estabelecimento,
      profissional: profissionais.find(p => String(p.id) === String(formAgendamento.profissional_id)) || null,
      idAgendamentoIgnorado: modoEdicao ? idAgendamentoEditando : null,
    }).some(slot => slot.hora === formAgendamento.hora && slot.disponivel);

    if (!horarioLivre) {
      toast({
        variant: "destructive",
        title: "Horário indisponível",
        description: "Escolha uma das sugestões livres para evitar sobreposição na agenda."
      });
      return;
    }

    const dataHoraIso = `${filtroData}T${formAgendamento.hora}:00`;

    try {
      let finalClienteId = formAgendamento.cliente_id;

      if (!finalClienteId) {
        const telefoneLimpo = formAgendamento.telefone.replace(/\D/g, '');
        const clienteComMesmoTelefone = telefoneLimpo
          ? clientes.find(c => (c.telefone || '').replace(/\D/g, '') === telefoneLimpo)
          : null;

        if (clienteComMesmoTelefone) {
          finalClienteId = clienteComMesmoTelefone.id;
        } else {
          const { data: novoCliente, error: errCliente } = await supabase
            .from('clientes')
            .insert([{
              estabelecimento_id: estabelecimento.id,
              nome: formAgendamento.nome_cliente_manual.trim(),
              telefone: telefoneLimpo
            }])
            .select()
            .single();

          if (errCliente) throw errCliente;
          finalClienteId = novoCliente.id;
        }
      }

      if (modoEdicao) {
        const { error } = await supabase
          .from('agendamentos')
          .update({
            cliente_id: finalClienteId,
            servico_id: formAgendamento.servico_id,
            profissional_id: formAgendamento.profissional_id || null,
            data_hora: dataHoraIso,
            status: formAgendamento.status
          })
          .eq('id', idAgendamentoEditando);

        if (error) throw error;
        toast({ title: "Sucesso!", description: "Agendamento atualizado." });
      } else {
        const { error } = await supabase
          .from('agendamentos')
          .insert([{
            estabelecimento_id: estabelecimento.id,
            cliente_id: finalClienteId,
            servico_id: formAgendamento.servico_id,
            profissional_id: formAgendamento.profissional_id || null,
            data_hora: dataHoraIso,
            status: formAgendamento.status
          }]);

        if (error) throw error;
        toast({ title: "Sucesso!", description: "Agendamento realizado." });
      }

      limparFormAgendamento();
      carregarDadosComponente();
    } catch (err) {
      console.error(err);
    }
  };

  const iniciarEdicao = (ag) => {
    const horaExtraida = ag.data_hora ? ag.data_hora.split('T')[1]?.substring(0, 5) : '08:00';
    setModoEdicao(true);
    setIdAgendamentoEditando(ag.id);
    setTermoBuscaClienteForm(ag.clientes?.nome || '');
    setFormAgendamento({
      cliente_id: ag.cliente_id || '',
      nome_cliente_manual: ag.clientes?.nome || '',
      telefone: formatarTelefone(ag.clientes?.telefone || ''),
      servico_id: ag.servico_id || '',
      profissional_id: ag.profissional_id || '',
      hora: horaExtraida,
      valor: ag.servicos?.preco || '',
      status: ag.status || 'Confirmado'
    });
  };

  const limparFormAgendamento = () => {
    setModoEdicao(false);
    setIdAgendamentoEditando(null);
    setTermoBuscaClienteForm('');
    setFormAgendamento({
      cliente_id: '',
      nome_cliente_manual: '',
      telefone: '',
      servico_id: '',
      profissional_id: '',
      hora: '08:00',
      valor: '',
      status: 'Confirmado'
    });
  };

  // ── Handlers de Cliente ──────────────────────────────────────────────────
  const handleSalvarCliente = async (e) => {
    e.preventDefault();
    if (!formCliente.nome.trim()) return;

    try {
      if (modoEdicaoCliente) {
        const { error } = await supabase
          .from('clientes')
          .update({
            nome: formCliente.nome.trim(),
            telefone: formCliente.telefone.replace(/\D/g, '')
          })
          .eq('id', idClienteEditando);

        if (error) throw error;
        toast({ title: "Sucesso!", description: "Cadastro da cliente atualizado." });
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([{
            estabelecimento_id: estabelecimento.id,
            nome: formCliente.nome.trim(),
            telefone: formCliente.telefone.replace(/\D/g, '')
          }]);

        if (error) throw error;
        toast({ title: "Sucesso!", description: "Nova cliente cadastrada." });
      }

      limparFormCliente();
      carregarDadosComponente();
    } catch (err) {
      console.error(err);
    }
  };

  const iniciarEdicaoCliente = (cliente) => {
    setModoEdicaoCliente(true);
    setIdClienteEditando(cliente.id);
    setFormCliente({
      nome: cliente.nome,
      telefone: formatarTelefone(cliente.telefone || '')
    });
  };

  const limparFormCliente = () => {
    setModoEdicaoCliente(false);
    setIdClienteEditando(null);
    setFormCliente({ nome: '', telefone: '' });
  };

  const handleExcluirCliente = async (id, nome) => {
    const confirmar = window.confirm(`Deseja remover ${nome}?`);
    if (!confirmar) return;

    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) throw error;
      carregarDadosComponente();
    } catch {
      alert("Não é possível remover cliente com histórico de agendamentos.");
    }
  };

  // ── Abrir Sheet de Histórico ─────────────────────────────────────────────
  const abrirHistoricoCliente = (cliente) => {
    setClienteSelecionado(cliente);
    setSheetAberto(true);
  };

  // ── Importação de Clientes via CSV ───────────────────────────────────────
  const handleImportarCSV = (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    // Limpa o input para permitir re-upload do mesmo arquivo
    e.target.value = '';

    Papa.parse(arquivo, {
      header: true,
      skipEmptyLines: true,
      complete: async (resultado) => {
        const linhas = resultado.data;

        if (!linhas || linhas.length === 0) {
          toast({
            title: "Arquivo vazio",
            description: "O CSV não contém dados para importar.",
            variant: "destructive"
          });
          return;
        }

        // Detecta colunas flexivelmente (case-insensitive)
        const primeiraLinha = linhas[0];
        const chaves = Object.keys(primeiraLinha);

        const encontrarChave = (candidatos) =>
          chaves.find(k => candidatos.includes(k.toLowerCase().trim()));

        const chaveNome = encontrarChave(['nome', 'name', 'cliente', 'client']);
        const chaveTelefone = encontrarChave(['telefone', 'phone', 'tel', 'celular', 'whatsapp']);

        if (!chaveNome) {
          toast({
            title: "Formato inválido",
            description: "O CSV precisa de uma coluna 'nome' ou 'name'.",
            variant: "destructive"
          });
          return;
        }

        setImportando(true);

        try {
          // Monta batch de inserção ignorando linhas sem nome
          const registros = linhas
            .filter(linha => linha[chaveNome]?.trim())
            .map(linha => ({
              estabelecimento_id: estabelecimento.id,
              nome: linha[chaveNome].trim(),
              telefone: chaveTelefone
                ? (linha[chaveTelefone] || '').replace(/\D/g, '').substring(0, 11)
                : ''
            }));

          if (registros.length === 0) {
            toast({
              title: "Nenhum registro válido",
              description: "Verifique se a coluna 'nome' está preenchida.",
              variant: "destructive"
            });
            return;
          }

          // Insere em lote (batch) no Supabase
          const { error } = await supabase
            .from('clientes')
            .insert(registros);

          if (error) throw error;

          toast({
            title: "Importação concluída! 🎉",
            description: `${registros.length} cliente(s) importado(s) com sucesso.`
          });

          carregarDadosComponente();
        } catch (err) {
          console.error('Erro na importação:', err);
          toast({
            title: "Erro na importação",
            description: err.message || "Verifique o arquivo e tente novamente.",
            variant: "destructive"
          });
        } finally {
          setImportando(false);
        }
      },
      error: (err) => {
        toast({
          title: "Erro ao ler o CSV",
          description: err.message || "Arquivo inválido ou corrompido.",
          variant: "destructive"
        });
      }
    });
  };

  // ── Ranking ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const carregarTodosAgendamentos = async () => {
      if (!estabelecimento) return;
      const { data } = await supabase
        .from('agendamentos')
        .select('*, clientes(*), servicos(*), profissionais(*)')
        .eq('estabelecimento_id', estabelecimento.id);
      setTodosAgendamentos(data || []);
    };
    carregarTodosAgendamentos();
  }, [estabelecimento]);

  const processarRankingClientes = () => {
    const mapaRanking = {};
    todosAgendamentos.forEach(ag => {
      const nomeCliente = ag.clientes?.nome || 'Cliente Eventual';
      const valorProcedimento = Number(ag.servicos?.preco || 0);
      const statusNorm = ag.status?.toLowerCase();

      if (!mapaRanking[nomeCliente]) {
        mapaRanking[nomeCliente] = {
          nome: nomeCliente,
          visitas: 0,
          totalGasto: 0,
          telefone: formatarTelefone(ag.clientes?.telefone || ''),
          clienteObj: ag.clientes || null
        };
      }

      if (statusNorm !== 'cancelado' && statusNorm !== 'falta') {
        mapaRanking[nomeCliente].visitas += 1;
      }
      if (statusNorm === 'concluído' || statusNorm === 'concluido') {
        mapaRanking[nomeCliente].totalGasto += valorProcedimento;
      }
    });
    return Object.values(mapaRanking).sort((a, b) => b.totalGasto - a.totalGasto);
  };

  const obterCorStatus = (status) => {
    switch (status?.toLowerCase()) {
      case 'concluído': case 'concluido': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'confirmado': return 'bg-sky-500/10 text-sky-600 border-sky-200';
      case 'pendente': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'cancelado': return 'bg-rose-500/10 text-rose-600 border-rose-200';
      case 'falta': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-200';
    }
  };

  const receitaConfirmadaEmCaixa = agendamentos
    .filter(ag => ag.status?.toLowerCase() === 'concluído' || ag.status?.toLowerCase() === 'concluido')
    .reduce((acc, curr) => acc + Number(curr.servicos?.preco || 0), 0);

  const receitaPrevitaPeriodo = agendamentos
    .filter(ag => ag.status?.toLowerCase() === 'confirmado' || ag.status?.toLowerCase() === 'pendente')
    .reduce((acc, curr) => acc + Number(curr.servicos?.preco || 0), 0);

  const agendamentosFiltrados = agendamentos.filter(ag => {
    const nomeCliente = (ag.clientes?.nome || '').toLowerCase();
    return nomeCliente.includes(buscaCliente.toLowerCase());
  });

  const reservasPendentes = useMemo(() => {
    return todosAgendamentos
      .filter(ag => ag.status?.toLowerCase() === 'pendente')
      .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
  }, [todosAgendamentos]);

  const irParaAgendamento = (agendamento) => {
    const dataAgendamento = agendamento.data_hora?.split('T')[0];
    if (!dataAgendamento) return;
    setTipoFiltroData('dia');
    setFiltroData(dataAgendamento);
    setBuscaCliente('');
    setAbaAtiva('agenda');
  };

  const atualizarStatusAgendamento = async (agendamento, novoStatus) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: novoStatus })
        .eq('id', agendamento.id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `${agendamento.clientes?.nome || 'Cliente'} agora está como ${novoStatus}.`
      });
      carregarDadosComponente();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: err.message || "Tente novamente."
      });
    }
  };

  const montarMensagemWhatsApp = (agendamento) => {
    const nomeCliente = agendamento.clientes?.nome || 'tudo bem';
    const servico = agendamento.servicos?.nome || 'seu atendimento';
    const profissional = agendamento.profissionais?.nome
      ? ` com ${agendamento.profissionais.nome}`
      : '';
    const data = agendamento.data_hora
      ? format(parseISO(agendamento.data_hora), "dd/MM/yyyy", { locale: ptBR })
      : '';
    const hora = agendamento.data_hora?.split('T')[1]?.substring(0, 5) || '';
    const estudio = estabelecimento?.nome_estudio || estabelecimento?.nome || 'Zello Agenda';

    return `Olá, ${nomeCliente}! Sua reserva para ${servico}${profissional} em ${data} às ${hora} foi recebida pelo ${estudio}. Podemos confirmar esse horário?`;
  };

  const abrirWhatsAppAgendamento = (agendamento) => {
    const telefone = (agendamento.clientes?.telefone || '').replace(/\D/g, '');
    if (!telefone) {
      toast({
        variant: "destructive",
        title: "Cliente sem telefone",
        description: "Cadastre um telefone para enviar mensagem pelo WhatsApp."
      });
      return;
    }

    const mensagem = encodeURIComponent(montarMensagemWhatsApp(agendamento));
    window.open(`https://wa.me/55${telefone}?text=${mensagem}`, '_blank', 'noopener,noreferrer');
  };

  const clientesFiltradosDropdown = clientes.filter(c =>
    c.nome.toLowerCase().includes(termoBuscaClienteForm.toLowerCase())
  );

  const termoClientesCadastrados = buscaClientesCadastrados.trim().toLowerCase();
  const telefoneBuscaClientesCadastrados = buscaClientesCadastrados.replace(/\D/g, '');
  const clientesFiltrados = clientes.filter((c) => {
    if (!termoClientesCadastrados && !telefoneBuscaClientesCadastrados) return true;

    const nomeCliente = (c.nome || '').toLowerCase();
    const telefoneCliente = (c.telefone || '').replace(/\D/g, '');
    const encontrouPorNome = termoClientesCadastrados
      ? nomeCliente.includes(termoClientesCadastrados)
      : false;
    const encontrouPorTelefone = telefoneBuscaClientesCadastrados
      ? telefoneCliente.includes(telefoneBuscaClientesCadastrados)
      : false;

    return encontrouPorNome || encontrouPorTelefone;
  });

  const duplicatasClientes = useMemo(() => {
    const grupos = {};

    clientes.forEach(cliente => {
      const chave = obterChaveTelefone(cliente.telefone);
      if (!chave) return;
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(cliente);
    });

    return Object.entries(grupos)
      .filter(([, grupo]) => grupo.length > 1)
      .map(([telefone, grupo]) => ({
        telefone,
        clientes: grupo.sort((a, b) => (b.nome || '').length - (a.nome || '').length),
      }));
  }, [clientes]);

  const handleMesclarDuplicatas = async (grupo) => {
    if (!estabelecimento?.id) return;
    const confirmar = window.confirm(`Mesclar ${grupo.clientes.length} fichas com o telefone ${formatarTelefone(grupo.telefone)}?`);
    if (!confirmar) return;

    try {
      const { data, error } = await supabase
        .rpc('mesclar_clientes_por_telefone', {
          p_estabelecimento_id: estabelecimento.id,
          p_telefone: grupo.telefone,
        });

      if (error) throw error;

      toast({
        title: "Clientes mescladas",
        description: `${data?.mesclados || grupo.clientes.length - 1} ficha(s) duplicada(s) foram consolidadas.`
      });
      carregarDadosComponente();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Não foi possível mesclar",
        description: err.message || "Verifique se a migration de confiabilidade foi aplicada."
      });
    }
  };

  const servicoSelecionadoForm = useMemo(
    () => servicos.find(s => String(s.id) === String(formAgendamento.servico_id)),
    [servicos, formAgendamento.servico_id]
  );

  const profissionaisDoServicoForm = useMemo(() => {
    if (!formAgendamento.servico_id) return [];
    return vinculosProfissionais
      .filter(v => String(v.servico_id) === String(formAgendamento.servico_id))
      .map(v => profissionais.find(p => String(p.id) === String(v.profissional_id)))
      .filter(Boolean);
  }, [formAgendamento.servico_id, profissionais, vinculosProfissionais]);

  const profissionalSelecionadoForm = useMemo(
    () => profissionais.find(p => String(p.id) === String(formAgendamento.profissional_id)) || null,
    [formAgendamento.profissional_id, profissionais]
  );

  const horariosInteligentes = useMemo(() => gerarHorariosDisponiveis({
    data: filtroData,
    servico: servicoSelecionadoForm,
    agendamentos,
    estabelecimento,
    profissional: profissionalSelecionadoForm,
    idAgendamentoIgnorado: modoEdicao ? idAgendamentoEditando : null,
  }), [agendamentos, estabelecimento, filtroData, idAgendamentoEditando, modoEdicao, profissionalSelecionadoForm, servicoSelecionadoForm]);

  const horariosAgrupados = useMemo(
    () => agruparHorariosPorPeriodo(horariosInteligentes),
    [horariosInteligentes]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // ── Formulário reutilizável para o Sheet ─────────────────────────────────
  const FormularioAgendamento = (
    <form onSubmit={handleSalvarAgendamento} className="space-y-3">
      <div className="space-y-1 relative" ref={dropdownRef}>
        <label className="text-[10px] font-black uppercase text-slate-500">Nome da Cliente *</label>
        <div className="relative">
          <Input
            placeholder="Digite para buscar..."
            value={termoBuscaClienteForm}
            onChange={(e) => handleDigitacaoCliente(e.target.value)}
            onFocus={() => setMostrarDropdownClientes(true)}
            className="rounded-xl border-slate-300 h-10 text-xs font-bold text-slate-900 bg-white placeholder:text-slate-400 pr-8"
            required
          />
          {formAgendamento.cliente_id && (
            <span className="absolute right-3 top-3 text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-md uppercase">Vinculada</span>
          )}
        </div>
        {mostrarDropdownClientes && termoBuscaClienteForm.trim().length > 0 && (
          <div className="absolute z-50 w-full bg-white mt-1 border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
            {clientesFiltradosDropdown.length > 0 ? (
              clientesFiltradosDropdown.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selecionarClienteDaBusca(c)}
                  className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 font-medium text-slate-800 flex justify-between items-center"
                >
                  <span>{c.nome}</span>
                  <span className="text-[10px] text-slate-400">{formatarTelefone(c.telefone)}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-slate-400 italic bg-slate-50">
                Cliente nova. O sistema criará uma ficha automaticamente.
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase text-slate-500">Telefone de Contato</label>
        <Input placeholder="(00) 00000-0000" value={formAgendamento.telefone} onChange={(e) => setFormAgendamento({ ...formAgendamento, telefone: formatarTelefone(e.target.value) })} className="rounded-xl border-slate-300 h-10 text-xs text-slate-900 bg-white placeholder:text-slate-400" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase text-slate-500">Procedimento *</label>
        <select value={formAgendamento.servico_id} onChange={(e) => handleServicoChange(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-bold focus:outline-none" required>
          <option value="">Selecione o serviço...</option>
          {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase text-slate-500">Profissional *</label>
        <select
          value={formAgendamento.profissional_id}
          onChange={(e) => handleProfissionalChange(e.target.value)}
          className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-bold focus:outline-none"
          required={profissionaisDoServicoForm.length > 0}
          disabled={!formAgendamento.servico_id}
        >
          <option value="">
            {formAgendamento.servico_id ? 'Selecione o profissional...' : 'Escolha o serviço primeiro'}
          </option>
          {profissionaisDoServicoForm.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        {formAgendamento.servico_id && profissionaisDoServicoForm.length === 0 && (
          <p className="text-[10px] font-bold text-amber-600">
            Nenhum profissional vinculado a este serviço. Configure em Operação.
          </p>
        )}
      </div>
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500">Horários sugeridos *</label>
            <p className="text-[10px] font-bold text-slate-400">
              {servicoSelecionadoForm
                ? `${obterDuracaoServico(servicoSelecionadoForm)} min${profissionalSelecionadoForm ? ` com ${profissionalSelecionadoForm.nome}` : ''}`
                : 'Selecione um procedimento para calcular a agenda'}
            </p>
          </div>
          {formAgendamento.hora && (
            <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-black text-slate-800 shadow-sm">
              {formAgendamento.hora}
            </span>
          )}
        </div>

        {servicoSelecionadoForm ? (
          <div className="space-y-3">
            {[
              ['Manhã', horariosAgrupados.manha],
              ['Tarde', horariosAgrupados.tarde],
              ['Noite', horariosAgrupados.noite],
            ].filter(([, slots]) => slots.length > 0).map(([periodo, slots]) => (
              <div key={periodo} className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{periodo}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot.hora}
                      type="button"
                      disabled={!slot.disponivel}
                      onClick={() => setFormAgendamento(prev => ({ ...prev, hora: slot.hora }))}
                      className={`h-10 rounded-xl border text-[11px] font-black transition-all ${
                        formAgendamento.hora === slot.hora
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                          : slot.disponivel
                            ? 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'
                            : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 line-through'
                      }`}
                    >
                      {slot.hora}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {!horariosInteligentes.some(slot => slot.disponivel) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-700">
                Nenhum horário livre para este serviço na data selecionada.
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-center text-[11px] font-bold text-slate-400">
            A sugestão aparece automaticamente após escolher o procedimento.
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase text-slate-500">Valor (R$)</label>
        <Input type="number" placeholder="0" value={formAgendamento.valor} readOnly className="rounded-xl border-slate-200 h-10 text-xs font-bold text-slate-400 bg-slate-50 cursor-not-allowed" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase text-slate-500">Status do Atendimento</label>
        <select value={formAgendamento.status} onChange={(e) => setFormAgendamento({ ...formAgendamento, status: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-black text-slate-800 bg-white">
          <option value="Pendente">Pendente</option>
          <option value="Confirmado">Confirmado</option>
          <option value="Concluído">Concluído</option>
          <option value="Cancelado">Cancelado</option>
          <option value="Falta">Falta</option>
        </select>
      </div>
      <button type="submit" className="w-full h-10 bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs rounded-xl shadow-md uppercase mt-3 transition-colors block">
        {modoEdicao ? 'Salvar Alterações' : 'Confirmar na Agenda'}
      </button>
    </form>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Sheet de Histórico do Cliente ── */}
      <ClienteHistoricoSheet
        aberto={sheetAberto}
        onFechar={() => { setSheetAberto(false); setClienteSelecionado(null); }}
        cliente={clienteSelecionado}
        formularioAgendamento={FormularioAgendamento}
      />

      {/* ── Input CSV oculto ── */}
      <input
        ref={inputCsvRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportarCSV}
      />

      {/* ── Tabs ── */}
      <div className="flex border-b border-slate-200 gap-2 flex-wrap">
        <button onClick={() => setAbaAtiva('agenda')} className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${abaAtiva === 'agenda' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400'}`}>
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Controle da Agenda</div>
        </button>
        <button onClick={() => setAbaAtiva('clientes')} className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${abaAtiva === 'clientes' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400'}`}>
          <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Clientes Cadastrados</div>
        </button>
        <button onClick={() => setAbaAtiva('ranking')} className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${abaAtiva === 'ranking' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400'}`}>
          <div className="flex items-center gap-2"><Trophy className="w-4 h-4" /> Ranking de Fidelidade</div>
        </button>

        {/* ── Botão Importar CSV ── */}
        <div className="ml-auto pb-2 flex items-center">
          <button
            type="button"
            disabled={importando}
            onClick={() => inputCsvRef.current?.click()}
            className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {importando
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importando...</>
              : <><Upload className="w-3.5 h-3.5" /> Importar Clientes</>
            }
          </button>
        </div>
      </div>

      {/* ── Aba: Agenda ── */}
      {abaAtiva === 'agenda' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Faturamento em Caixa</p>
                <h3 className="text-2xl font-black mt-1">R$ {receitaConfirmadaEmCaixa.toFixed(2)}</h3>
                <p className="text-[10px] text-white/50 mt-1">Status: Concluídos</p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl text-white"><TrendingUp className="w-5 h-5" /></div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receita Prevista</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">R$ {receitaPrevitaPeriodo.toFixed(2)}</h3>
                <p className="text-[10px] text-slate-500 mt-1">Status: Confirmados + Pendentes</p>
              </div>
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl"><Clock className="w-5 h-5" /></div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atendimentos no Período</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{agendamentosFiltrados.length}</h3>
                <p className="text-[10px] text-slate-500 mt-1">Compromissos agendados</p>
              </div>
              <div className="p-3 bg-slate-50 text-slate-600 rounded-xl"><Calendar className="w-5 h-5" /></div>
            </CardContent>
          </Card>
        </div>
      )}

      {abaAtiva === 'agenda' && (
        <>
          {reservasPendentes.length > 0 && (
            <Card className="border border-amber-200 shadow-sm bg-amber-50 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                      Reservas pendentes
                    </p>
                    <h3 className="text-sm font-black text-slate-900">
                      {reservasPendentes.length} agendamento(s) aguardando confirmação
                    </h3>
                  </div>
                  <span className="rounded-xl bg-white px-3 py-1 text-[10px] font-black uppercase text-amber-700 shadow-sm">
                    Link público + agenda
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {reservasPendentes.slice(0, 4).map((ag) => (
                    <div key={ag.id} className="rounded-xl border border-amber-100 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black uppercase text-slate-900">
                            {ag.clientes?.nome || 'Cliente'}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ag.data_hora ? `${format(parseISO(ag.data_hora), 'dd/MM', { locale: ptBR })} às ${ag.data_hora.split('T')[1]?.substring(0, 5)}` : '--'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {ag.servicos?.nome || 'Serviço'}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {ag.profissionais?.nome || 'Sem profissional'}
                            </span>
                          </div>
                        </div>
                        <div className="grid shrink-0 grid-cols-1 gap-1.5">
                          <button
                            type="button"
                            onClick={() => atualizarStatusAgendamento(ag, 'Confirmado')}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-emerald-700 flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirWhatsAppAgendamento(ag)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase text-emerald-700 hover:bg-emerald-100 flex items-center justify-center gap-1"
                          >
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => irParaAgendamento(ag)}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-slate-800"
                          >
                            Ver
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-sm bg-white rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <button type="button" onClick={() => setTipoFiltroData('dia')} className={`h-9 rounded-xl text-xs font-bold px-4 transition-all block ${tipoFiltroData === 'dia' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-200 text-slate-800 hover:bg-slate-300 border border-slate-400'}`}>Visão Diária</button>
              <button type="button" onClick={() => setTipoFiltroData('semana')} className={`h-9 rounded-xl text-xs font-bold px-4 transition-all block ${tipoFiltroData === 'semana' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-200 text-slate-800 hover:bg-slate-300 border border-slate-400'}`}>Visão Semanal</button>
              <button type="button" onClick={() => setTipoFiltroData('mes')} className={`h-9 rounded-xl text-xs font-bold px-4 transition-all block ${tipoFiltroData === 'mes' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-200 text-slate-800 hover:bg-slate-300 border border-slate-400'}`}>Visão Mensal</button>
              <Input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="w-40 h-9 rounded-xl border-slate-300 text-xs font-bold text-slate-900 bg-white" />
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar por nome do cliente..." value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)} className="pl-9 h-9 rounded-xl border-slate-300 text-xs text-slate-900 bg-white placeholder:text-slate-400" />
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <Card className="border-none shadow-sm rounded-2xl bg-white">
                <CardContent className="p-6 space-y-3">
                  {agendamentosFiltrados.length > 0 ? (
                    agendamentosFiltrados.map((ag) => (
                      <div key={ag.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-sm transition-all gap-4">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="p-2.5 bg-slate-900 text-white font-black text-xs rounded-xl flex flex-col items-center min-w-[65px]">
                            <span className="text-[10px] opacity-70 font-medium">{ag.data_hora ? format(parseISO(ag.data_hora), 'dd/MM', { locale: ptBR }) : '--/--'}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-amber-400" />
                              {ag.data_hora ? ag.data_hora.split('T')[1]?.substring(0, 5) : '--:--'}
                            </div>
                          </div>
                          {/* ── Nome clicável → abre Sheet ── */}
                          <div>
                            <button
                              type="button"
                              onClick={() => ag.clientes && abrirHistoricoCliente(ag.clientes)}
                              className="text-sm font-black text-slate-800 hover:text-slate-600 hover:underline underline-offset-2 text-left transition-colors"
                            >
                              {ag.clientes?.nome || 'Cliente Eventual'}
                            </button>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] font-bold text-slate-500 uppercase">
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {formatarTelefone(ag.clientes?.telefone || '') || 'Sem telefone'}</span>
                              <span className="flex items-center gap-1"><Tag className="w-3 h-3 text-slate-400" /> {ag.servicos?.nome || 'Procedimento'}</span>
                              <span className="flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /> {ag.profissionais?.nome || 'Sem profissional'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <div className="flex flex-col text-left sm:text-right">
                            <span className="text-xs font-black text-slate-800">R$ {Number(ag.servicos?.preco || 0).toFixed(2)}</span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border mt-1 ${obterCorStatus(ag.status)}`}>{ag.status || 'Confirmado'}</span>
                          </div>
                          <div className="flex flex-wrap justify-end gap-1.5 max-w-[210px]">
                            {ag.status?.toLowerCase() === 'pendente' && (
                              <Button size="sm" onClick={() => atualizarStatusAgendamento(ag, 'Confirmado')} className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2 text-[10px] font-black uppercase">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Confirmar
                              </Button>
                            )}
                            {ag.status?.toLowerCase() === 'confirmado' && (
                              <Button size="sm" onClick={() => atualizarStatusAgendamento(ag, 'Concluído')} className="h-8 rounded-lg bg-slate-900 hover:bg-slate-800 px-2 text-[10px] font-black uppercase">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Concluir
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => abrirWhatsAppAgendamento(ag)} className="h-8 w-8 rounded-lg hover:bg-emerald-50 bg-white border border-emerald-100">
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => iniciarEdicao(ag)} className="h-8 w-8 rounded-lg hover:bg-slate-200 bg-slate-100 border border-slate-200">
                              <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                            </Button>
                            {ag.status?.toLowerCase() !== 'cancelado' && (
                              <Button size="icon" variant="ghost" onClick={() => atualizarStatusAgendamento(ag, 'Cancelado')} className="h-8 w-8 rounded-lg hover:bg-rose-50 bg-white border border-rose-100">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              </Button>
                            )}
                            {ag.status?.toLowerCase() !== 'falta' && (
                              <Button size="icon" variant="ghost" onClick={() => atualizarStatusAgendamento(ag, 'Falta')} className="h-8 w-8 rounded-lg hover:bg-purple-50 bg-white border border-purple-100">
                                <Ban className="w-3.5 h-3.5 text-purple-600" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-400 uppercase italic">Nenhum compromisso agendado.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="border-none shadow-sm rounded-2xl bg-white overflow-visible">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-black uppercase text-slate-700 tracking-wide flex items-center gap-2">
                    {modoEdicao ? <Edit2 className="w-4 h-4 text-slate-500" /> : <Plus className="w-4 h-4 text-slate-500" />}
                    {modoEdicao ? 'Editar Registro' : 'Novo Agendamento'}
                  </CardTitle>
                  {modoEdicao && (
                    <Button variant="ghost" size="icon" onClick={limparFormAgendamento} className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-100">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="overflow-visible">
                  {FormularioAgendamento}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* ── Aba: Clientes ── */}
      {abaAtiva === 'clientes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-none shadow-sm rounded-2xl bg-white">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    Clientes Cadastradas
                    {buscaClientesCadastrados && (
                      <span className="ml-2 text-[10px] font-bold text-slate-400 normal-case">
                        — {clientesFiltrados.length} resultado(s)
                      </span>
                    )}
                  </CardTitle>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      placeholder="Buscar por nome ou telefone..."
                      value={buscaClientesCadastrados}
                      onChange={(e) => setBuscaClientesCadastrados(e.target.value)}
                      className="pl-8 h-9 rounded-xl border-slate-300 text-xs text-slate-900 bg-white placeholder:text-slate-400"
                    />
                    {buscaClientesCadastrados && (
                      <button
                        type="button"
                        onClick={() => setBuscaClientesCadastrados('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {duplicatasClientes.length > 0 && (
                  <div className="mb-4 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                          Revisão de duplicatas
                        </p>
                        <h3 className="text-sm font-black text-slate-900">
                          {duplicatasClientes.length} telefone(s) com mais de uma ficha
                        </h3>
                      </div>
                      <span className="rounded-xl bg-white px-3 py-1 text-[10px] font-black uppercase text-amber-700 shadow-sm">
                        Segurança comercial
                      </span>
                    </div>

                    <div className="space-y-2">
                      {duplicatasClientes.slice(0, 4).map((grupo) => (
                        <div key={grupo.telefone} className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase text-slate-900">
                              {formatarTelefone(grupo.telefone)}
                            </p>
                            <p className="mt-1 truncate text-[11px] font-bold text-slate-500">
                              {grupo.clientes.map(cliente => cliente.nome).join(' / ')}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleMesclarDuplicatas(grupo)}
                            className="h-9 rounded-xl bg-slate-900 px-3 text-[10px] font-black uppercase text-white hover:bg-slate-800"
                          >
                            <Merge className="mr-1.5 h-3.5 w-3.5" />
                            Mesclar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {clientesFiltrados.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-200 rounded-xl text-slate-700"><User className="w-4 h-4" /></div>
                      <div>
                        {/* ── Nome clicável → abre Sheet ── */}
                        <button
                          type="button"
                          onClick={() => abrirHistoricoCliente(c)}
                          className="text-sm font-black text-slate-800 hover:text-slate-600 hover:underline underline-offset-2 text-left transition-colors"
                        >
                          {c.nome}
                        </button>
                        <p className="text-xs text-slate-500 font-medium">{formatarTelefone(c.telefone) || 'Sem telefone'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => iniciarEdicaoCliente(c)} className="h-8 w-8 rounded-lg hover:bg-slate-200 bg-white border border-slate-200"><Edit2 className="w-3.5 h-3.5 text-slate-600" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleExcluirCliente(c.id, c.nome)} className="h-8 w-8 rounded-lg hover:bg-rose-50 hover:border-rose-200 bg-white border border-slate-200"><Trash2 className="w-3.5 h-3.5 text-rose-600" /></Button>
                    </div>
                  </div>
                  ))}
                {clientesFiltrados.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                    <AlertCircle className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase italic">
                      {buscaClientesCadastrados
                        ? `Nenhuma cliente encontrada para "${buscaClientesCadastrados}".`
                        : 'Nenhuma cliente cadastrada ainda.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-none shadow-sm rounded-2xl bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-black uppercase text-slate-700 tracking-wide flex items-center gap-2">
                  {modoEdicaoCliente ? <Edit2 className="w-4 h-4 text-slate-500" /> : <Plus className="w-4 h-4 text-slate-500" />}
                  {modoEdicaoCliente ? 'Editar Cadastro' : 'Cadastrar Nova Cliente'}
                </CardTitle>
                {modoEdicaoCliente && (
                  <Button variant="ghost" size="icon" onClick={limparFormCliente} className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></Button>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSalvarCliente} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500">Nome da Cliente *</label>
                    <Input placeholder="Nome completo" value={formCliente.nome} onChange={(e) => setFormCliente({ ...formCliente, nome: e.target.value })} className="rounded-xl border-slate-300 h-10 text-xs font-bold text-slate-900 bg-white placeholder:text-slate-400" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500">Telefone *</label>
                    <Input placeholder="(00) 00000-0000" value={formCliente.telefone} onChange={(e) => setFormCliente({ ...formCliente, telefone: formatarTelefone(e.target.value) })} className="rounded-xl border-slate-300 h-10 text-xs text-slate-900 bg-white placeholder:text-slate-400" required />
                  </div>
                  <button type="submit" className="w-full h-10 bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs rounded-xl uppercase tracking-wider shadow-md transition-all block">
                    {modoEdicaoCliente ? 'Salvar Alterações' : 'Salvar Cliente'}
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Aba: Ranking ── */}
      {abaAtiva === 'ranking' && (
        <Card className="border-none shadow-sm rounded-2xl bg-white">
          <CardHeader><CardTitle className="text-xs font-black uppercase text-slate-500 tracking-wider">Top Clientes - Engajamento & Faturamento</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {processarRankingClientes().length > 0 ? (
              processarRankingClientes().map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white border border-slate-100 rounded-xl relative overflow-hidden">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shadow-sm ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-100 text-slate-500' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>
                      {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : <span className="text-xs font-black">{index + 1}º</span>}
                    </div>
                    <div>
                      {/* ── Nome clicável → abre Sheet ── */}
                      <button
                        type="button"
                        onClick={() => item.clienteObj && abrirHistoricoCliente(item.clienteObj)}
                        className="text-sm font-black text-slate-800 hover:text-slate-600 hover:underline underline-offset-2 flex items-center gap-2 text-left transition-colors"
                      >
                        {item.nome}
                        {index === 0 && <span className="bg-amber-500/10 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Fidelidade Ouro</span>}
                      </button>
                      <p className="text-[11px] font-bold text-slate-500 uppercase">{item.telefone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">Presenças</span>
                      <span className="text-xs font-black text-slate-700 flex items-center gap-1 justify-center"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {item.visitas}</span>
                    </div>
                    <div className="text-right min-w-[90px]">
                      <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">Total Investido</span>
                      <span className="text-xs font-black text-emerald-600">R$ {item.totalGasto.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-slate-400 italic py-6">Aguardando dados de agendamentos para consolidar o ranking.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
