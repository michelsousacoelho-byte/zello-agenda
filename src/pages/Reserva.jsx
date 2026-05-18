import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, CheckCircle2, UserCircle, UserPlus, ArrowRight, UserCheck, Calendar, Clock, LogOut } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const HORARIOS = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

export default function Reserva() {
  const [viewMode, setViewMode] = useState('escolha_inicial'); 
  const [subEtapaCadastro, setSubEtapaCadastro] = useState('decisao'); 
  const [etapaAgendamento, setEtapaAgendamento] = useState(1); 
  const [isSemCadastro, setIsSemCadastro] = useState(false);

  const [servicos, setServicos] = useState([]);
  const [agendamentosExistentes, setAgendamentosExistentes] = useState([]);
  const [historicoCliente, setHistoricoCliente] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  const [clienteLogada, setClienteLogada] = useState(null);

  const [formCadastro, setFormCadastro] = useState({ nome: '', telefone: '' });
  const [formLogin, setFormLogin] = useState({ telefone: '' });

  const [selecionado, setSelecionado] = useState({
    servico: null,
    data: null,
    hora: null,
    nome: '',
    telefone: '',
  });

  useEffect(() => {
    carregarDadosIniciais();
    const clienteSalva = localStorage.getItem('andreia_moura_cliente');
    if (clienteSalva) {
      const clienteObj = JSON.parse(clienteSalva);
      setClienteLogada(clienteObj);
      setViewMode('portal_logado');
      carregarHistoricoCliente(clienteObj.telefone);
    }
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      const [resServicos, resAgendamentos] = await Promise.all([
        supabase.from('servicos').select('*').eq('ativo', true),
        supabase.from('agendamentos').select('data_hora, servico_id').neq('status', 'cancelado'),
      ]);
      setServicos(resServicos.data || []);
      setAgendamentosExistentes(resAgendamentos.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // FUNÇÃO CORRIGIDA: Busca simplificada para evitar falha de junção de tabelas
  const carregarHistoricoCliente = async (telefone) => {
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('cliente_telefone', telefone)
        .not('servico_id', 'is', null) // Traz apenas agendamentos reais
        .order('data_hora', { ascending: false });
      
      if (error) throw error;
      setHistoricoCliente(data || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  // Auxiliar para encontrar o nome do serviço localmente
  const obterNomeServico = (servicoId) => {
    const serv = servicos.find(s => s.id?.toString() === servicoId?.toString());
    return serv ? serv.nome : 'Procedimento';
  };

  const aplicarMascaraTelefone = (valor) => {
    if (!valor) return "";
    valor = valor.replace(/\D/g, "");
    valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
    valor = valor.replace(/(\d{5})(\d)/, "$1-$2");
    return valor.substring(0, 15);
  };

  const isHorarioOcupado = (data, hora) => {
    if (!data || !selecionado.servico) return false;
    const checkStr = `${format(data, 'yyyy-MM-dd')}T${hora}`;
    const concorrentes = agendamentosExistentes.filter(a => 
      a.data_hora.includes(checkStr) && a.servico_id?.toString() === selecionado.servico.id?.toString()
    );
    const limiteMaximo = selecionado.servico.capacidade_simultanea || 1;
    return concorrentes.length >= limiteMaximo;
  };

  const handleCriarConta = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErroFormulario('');

    try {
      const { data: existentes } = await supabase
        .from('agendamentos')
        .select('cliente_nome, cliente_telefone')
        .eq('cliente_telefone', formCadastro.telefone)
        .limit(1);

      if (existentes && existentes.length > 0) {
        setErroFormulario('Este número de WhatsApp já possui uma conta cadastrada. Vá em "Quero entrar".');
        setEnviando(false);
        return;
      }

      const { error: errInsert } = await supabase.from('agendamentos').insert([{
        cliente_nome: formCadastro.nome,
        cliente_telefone: formCadastro.telefone,
        status: 'Pendente', 
        valor_total: 0,
        data_hora: new Date().toISOString()
      }]);

      if (errInsert) throw errInsert;

      const clienteSessao = { nome: formCadastro.nome, telefone: formCadastro.telefone };
      localStorage.setItem('andreia_moura_cliente', JSON.stringify(clienteSessao));
      setClienteLogada(clienteSessao);
      setViewMode('portal_logado');
      setHistoricoCliente([]);
    } catch (error) {
      setErroFormulario('Erro ao criar conta. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const handleLoginPortal = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErroFormulario('');

    try {
      const { data } = await supabase
        .from('agendamentos')
        .select('cliente_nome, cliente_telefone')
        .eq('cliente_telefone', formLogin.telefone)
        .limit(1);

      if (data && data.length > 0) {
        const clienteSessao = { nome: data[0].cliente_nome, telefone: data[0].cliente_telefone };
        localStorage.setItem('andreia_moura_cliente', JSON.stringify(clienteSessao));
        setClienteLogada(clienteSessao);
        setViewMode('portal_logado');
        carregarHistoricoCliente(data[0].cliente_telefone);
      } else {
        setErroFormulario('WhatsApp não encontrado. Crie uma nova conta.');
      }
    } catch (error) {
      setErroFormulario('Erro ao realizar acesso.');
    } finally {
      setEnviando(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('andreia_moura_cliente');
    setClienteLogada(null);
    setViewMode('escolha_inicial');
    setSubEtapaCadastro('decisao');
    setIsSemCadastro(false);
  };

  const iniciarAgendamentoLogado = () => {
    setIsSemCadastro(false);
    setSelecionado({
      servico: null,
      data: null,
      hora: null,
      nome: clienteLogada.nome,
      telefone: clienteLogada.telefone,
    });
    setEtapaAgendamento(1);
    setViewMode('fluxo_agendamento');
  };

  const iniciarAgendamentoSemCadastro = () => {
    setIsSemCadastro(true);
    setSelecionado({ servico: null, data: null, hora: null, nome: '', telefone: '' });
    setEtapaAgendamento(1);
    setViewMode('fluxo_agendamento');
  };

  const handleConfirmarReservaFinal = async () => {
    setEnviando(true);
    try {
      const dataHoraIso = `${format(selecionado.data, 'yyyy-MM-dd')}T${selecionado.hora}:00`;
      const { error } = await supabase.from('agendamentos').insert([{
        cliente_nome: selecionado.nome,
        cliente_telefone: selecionado.telefone,
        servico_id: selecionado.servico.id,
        data_hora: dataHoraIso,
        valor_total: selecionado.servico.preco,
        status: 'Pendente'
      }]);
      if (error) throw error;
      setSucesso(true);
    } catch (error) {
      alert('Erro ao processar reserva.');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#FDF8F2] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#4A3721] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (sucesso) return (
    <div className="min-h-screen bg-[#FDF8F2] flex items-center justify-center p-4 text-center">
      <div className="max-w-md animate-in zoom-in-95">
        <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-[#4A3721] mb-2">Reserva Confirmada!</h2>
        <p className="text-[#8A6D3B] mb-6">Obrigada, {selecionado.nome}! Seu pedido de agendamento foi enviado com sucesso.</p>
        <Button onClick={() => window.location.reload()} className="bg-[#4A3721] text-white font-bold px-6 py-3 rounded-xl">Voltar ao Início</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDF8F2]">
      <div className="bg-gradient-to-r from-[#4A3721] to-[#8A6D3B] text-white py-8 px-4 text-center shadow-lg relative">
        <Link to="/admin/dashboard" className="absolute top-4 right-4 opacity-10 hover:opacity-100 transition-opacity">
          <UserCircle className="w-5 h-5 text-white" />
        </Link>
        <div className="flex flex-col items-center gap-2 mb-1">
          <img src="/favicon.png" alt="Logo Andréia Moura" className="w-14 h-14 object-contain mb-1 fallback-logo" onError={(e) => { e.target.src = '/logo.png'; }} />
          <h1 className="text-xl font-bold tracking-tight uppercase">ANDRÉIA MOURA</h1>
        </div>
        <p className="text-xs opacity-80 uppercase tracking-widest font-light">Bronze & Estética — Agendar Online</p>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 pb-16">
        
        {viewMode === 'escolha_inicial' && (
          <div className="space-y-4">
            {subEtapaCadastro === 'decisao' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#4A3721] text-center mb-2 uppercase tracking-wide">Seja bem-vinda (o)!</h2>
                
                <Card className="border-[#F1E4D1] bg-white hover:border-[#BF953F] transition-all cursor-pointer shadow-sm" onClick={() => setSubEtapaCadastro('formulario_cadastro')}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-[#FDF8F2] text-[#BF953F] rounded-xl"><UserPlus className="w-6 h-6" /></div>
                    <div className="flex-1 text-left">
                      <h4 className="font-bold text-[#4A3721] text-sm uppercase">Criar Minha Conta / Entrar</h4>
                      <p className="text-xs text-[#8A6D3B]">Acesse seu histórico de procedimentos e agende com 1 clique.</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#BF953F]" />
                  </CardContent>
                </Card>

                <Card className="border-[#F1E4D1] bg-white hover:border-[#4A3721] transition-all cursor-pointer shadow-sm" onClick={iniciarAgendamentoSemCadastro}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-gray-50 text-gray-500 rounded-xl"><UserCircle className="w-6 h-6" /></div>
                    <div className="flex-1 text-left">
                      <h4 className="font-bold text-gray-700 text-sm uppercase">Continuar sem conta</h4>
                      <p className="text-xs text-gray-400">Agende de forma rápida preenchendo dados apenas no final.</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </CardContent>
                </Card>
              </div>
            )}

            {subEtapaCadastro === 'formulario_cadastro' && (
              <form onSubmit={handleCriarConta} className="bg-white p-6 rounded-2xl shadow-sm border border-[#F1E4D1] space-y-4">
                <h3 className="font-bold text-[#4A3721] text-base uppercase">Criar Nova Conta</h3>
                {erroFormulario && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 font-medium">{erroFormulario}</p>}
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[#8A6D3B] px-1">Nome Completo</label>
                    <Input required placeholder="Ex: Maria Silva" value={formCadastro.nome} onChange={e => setFormCadastro({...formCadastro, nome: e.target.value})} className="h-11 rounded-xl border-[#F1E4D1]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[#8A6D3B] px-1">WhatsApp / Telefone</label>
                    <Input required placeholder="(00) 00000-0000" value={formCadastro.telefone} onChange={e => setFormCadastro({...formCadastro, telefone: aplicarMascaraTelefone(e.target.value)})} className="h-11 rounded-xl border-[#F1E4D1]" />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button type="submit" className="w-full bg-[#BF953F] hover:bg-[#A67C2D] text-white font-bold h-11 rounded-xl uppercase tracking-wider text-xs" disabled={enviando || formCadastro.telefone.length < 14}>
                    {enviando ? 'Criando Conta...' : 'Cadastrar e Entrar'}
                  </Button>
                  <button type="button" onClick={() => setSubEtapaCadastro('formulario_login')} className="text-xs text-[#8A6D3B] font-bold underline uppercase pt-1">Já tenho cadastro, quero entrar</button>
                  <Button type="button" variant="ghost" onClick={() => setSubEtapaCadastro('decisao')} className="text-gray-400 text-xs uppercase mt-1">Voltar</Button>
                </div>
              </form>
            )}

            {subEtapaCadastro === 'formulario_login' && (
              <form onSubmit={handleLoginPortal} className="bg-white p-6 rounded-2xl shadow-sm border border-[#F1E4D1] space-y-4">
                <h3 className="font-bold text-[#4A3721] text-base uppercase">Acessar Minha Conta</h3>
                {erroFormulario && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 font-medium">{erroFormulario}</p>}
                
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#8A6D3B] px-1">Informe seu WhatsApp cadastrado</label>
                  <Input required placeholder="(00) 00000-0000" value={formLogin.telefone} onChange={e => setFormLogin({ telefone: aplicarMascaraTelefone(e.target.value) })} className="h-11 rounded-xl border-[#F1E4D1]" />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button type="submit" className="w-full bg-[#4A3721] hover:bg-[#2D2114] text-white font-bold h-11 rounded-xl uppercase tracking-wider text-xs" disabled={enviando || formLogin.telefone.length < 14}>
                    {enviando ? 'Verificando...' : 'Entrar no Painel'}
                  </Button>
                  <button type="button" onClick={() => setSubEtapaCadastro('formulario_cadastro')} className="text-xs text-[#BF953F] font-bold underline uppercase pt-1">Não tenho conta, quero me cadastrar</button>
                  <Button type="button" variant="ghost" onClick={() => setSubEtapaCadastro('decisao')} className="text-gray-400 text-xs uppercase mt-1">Voltar</Button>
                </div>
              </form>
            )}
          </div>
        )}

        {viewMode === 'portal_logado' && clienteLogada && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#F1E4D1] shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase text-[#8A6D3B]">Cliente Conectada</p>
                <h3 className="font-black text-[#4A3721] text-base uppercase tracking-tight">{clienteLogada.nome}</h3>
              </div>
              <button onClick={handleLogout} className="text-red-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-all flex items-center gap-1 text-xs font-bold uppercase">
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>

            <Button onClick={iniciarAgendamentoLogado} className="w-full bg-[#BF953F] hover:bg-[#A67C2D] text-white font-bold h-14 rounded-2xl uppercase tracking-widest text-xs shadow-md gap-2">
              <Calendar className="w-5 h-5" /> Agendar Novo Procedimento
            </Button>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#4A3721] uppercase tracking-wider">Meu Histórico de Atendimentos</h4>
              {historicoCliente.length === 0 ? (
                <p className="text-xs text-[#8A6D3B] bg-white p-6 rounded-xl border border-dashed border-[#F1E4D1] text-center">Você ainda não possui agendamentos finalizados ou pendentes.</p>
              ) : (
                <div className="space-y-2.5">
                  {historicoCliente.map((hist) => (
                    <Card key={hist.id} className="border-none bg-white shadow-sm rounded-xl overflow-hidden">
                      <CardContent className="p-4 flex justify-between items-center">
                        <div className="space-y-1">
                          {/* RENDERIZAÇÃO CORRIGIDA: Puxa o nome mapeando localmente */}
                          <span className="block font-black text-[#4A3721] text-sm uppercase">
                            {obterNomeServico(hist.servico_id)}
                          </span>
                          <div className="flex gap-3 text-[11px] text-[#8A6D3B] font-semibold">
                            <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" /> {format(new Date(hist.data_hora), 'dd/MM/yyyy')}</span>
                            <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {format(new Date(hist.data_hora), 'HH:mm')}h</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block font-black text-xs text-[#BF953F] mb-1">R$ {Number(hist.valor_total).toFixed(2)}</span>
                          <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            hist.status === 'Concluído' || hist.status === 'Realizado' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            hist.status === 'Confirmado' ? 'bg-green-50 text-green-700 border border-green-200' :
                            hist.status === 'Falta' || hist.status === 'Cancelado' ? 'bg-red-50 text-red-700 border border-red-200' :
                            hist.status === 'Pendente' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {hist.status}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'fluxo_agendamento' && (
          <div>
            <div className="flex items-center justify-between mb-8 relative">
              {[1, 2, 3].map((step) => (
                <div key={step} className={`z-10 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${etapaAgendamento >= step ? 'bg-[#BF953F] border-[#BF953F] text-white' : 'bg-white border-[#F1E4D1] text-[#8A6D3B]'}`}>
                  {step}
                </div>
              ))}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-[#F1E4D1] -z-0" />
            </div>

            {etapaAgendamento === 1 && (
              <div className="space-y-3">
                <h2 className="text-base font-bold text-[#4A3721] uppercase tracking-wide">Escolha o Serviço</h2>
                {servicos.map(s => (
                  <button key={s.id} onClick={() => setSelecionado({...selecionado, servico: s})} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selecionado.servico?.id === s.id ? 'border-[#BF953F] bg-[#BF953F]/5' : 'border-[#F1E4D1] bg-white'}`}>
                    <div className="flex justify-between items-center font-bold text-[#4A3721]">
                      <div>
                        <span className="block text-sm uppercase font-black">{s.nome}</span>
                        {s.capacidade_simultanea > 1 && <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded mt-1 inline-block font-bold uppercase tracking-wider">Vagas simultâneas livres</span>}
                      </div>
                      <span className="text-sm text-[#8A6D3B]">R$ {Number(s.preco).toFixed(2)}</span>
                    </div>
                  </button>
                ))}
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="rounded-xl border-[#F1E4D1]" onClick={() => { setViewMode(clienteLogada ? 'portal_logado' : 'escolha_inicial'); }}>Cancelar</Button>
                  <Button className="flex-1 bg-[#BF953F] hover:bg-[#A67C2D] text-white font-bold h-11 rounded-xl uppercase tracking-wider text-xs" disabled={!selecionado.servico} onClick={() => setEtapaAgendamento(2)}>Escolher Data <ChevronRight className="ml-1 w-4 h-4" /></Button>
                </div>
              </div>
            )}

            {etapaAgendamento === 2 && (
              <div>
                <h2 className="text-base font-bold text-[#4A3721] mb-4 uppercase tracking-wide">Escolha a Data e Horário</h2>
                <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
                  {Array.from({ length: 30 }, (_, i) => addDays(new Date(), i + 1)).map(dia => (
                    <button key={dia.toISOString()} onClick={() => setSelecionado({...selecionado, hora: null, data: dia})}
                      className={`flex-shrink-0 p-3 rounded-xl border-2 min-w-[65px] flex flex-col items-center transition-all ${selecionado.data && format(selecionado.data, 'yyyy-MM-dd') === format(dia, 'yyyy-MM-dd') ? 'bg-[#BF953F] text-white border-[#BF953F]' : 'bg-white text-[#4A3721] border-[#F1E4D1]'}`}>
                      <span className="text-[9px] uppercase font-bold">{format(dia, 'EEE', { locale: ptBR })}</span>
                      <span className="text-lg font-black">{format(dia, 'd')}</span>
                    </button>
                  ))}
                </div>
                {selecionado.data && (
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {HORARIOS.map(hora => (
                      <button key={hora} disabled={isHorarioOcupado(selecionado.data, hora)} onClick={() => setSelecionado({...selecionado, hora})}
                        className={`py-2.5 rounded-lg border text-xs font-bold transition-all ${isHorarioOcupado(selecionado.data, hora) ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through' : selecionado.hora === hora ? 'bg-[#4A3721] text-white' : 'bg-white border-[#F1E4D1] text-[#4A3721] hover:border-[#BF953F]'}`}>
                        {hora}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl border-[#F1E4D1]" onClick={() => setEtapaAgendamento(1)}>Voltar</Button>
                  <Button className="flex-1 bg-[#BF953F] hover:bg-[#A67C2D] text-white font-bold rounded-xl uppercase tracking-wider text-xs" disabled={!selecionado.hora} onClick={() => setEtapaAgendamento(3)}>Avançar</Button>
                </div>
              </div>
            )}

            {etapaAgendamento === 3 && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-[#4A3721] uppercase tracking-wide">Revisar e Finalizar</h2>
                
                {isSemCadastro && (
                  <Card className="border-[#F1E4D1] bg-white rounded-xl p-4 space-y-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-[#8A6D3B] border-b pb-1">Seus Dados de Contato</p>
                    <div className="space-y-2.5">
                      <Input placeholder="Nome Completo" required value={selecionado.nome} onChange={e => setSelecionado({...selecionado, nome: e.target.value})} className="h-11 rounded-xl border-[#F1E4D1]" />
                      <Input placeholder="WhatsApp" required value={selecionado.telefone} onChange={e => setSelecionado({...selecionado, telefone: aplicarMascaraTelefone(e.target.value)})} className="h-11 rounded-xl border-[#F1E4D1]" />
                    </div>
                  </Card>
                )}

                <Card className="border-[#F1E4D1] bg-white rounded-xl overflow-hidden shadow-sm">
                  <CardContent className="p-5 space-y-3 text-xs text-[#4A3721]">
                    {!isSemCadastro && (
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-lg flex items-center gap-1.5 font-medium mb-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Conta vinculada: {selecionado.nome}
                      </div>
                    )}
                    <div className="flex justify-between border-b pb-2"><span>Procedimento:</span><span className="font-bold uppercase">{selecionado.servico?.nome}</span></div>
                    <div className="flex justify-between border-b pb-2"><span>Agendamento:</span><span className="font-bold">{format(selecionado.data, 'dd/MM/yyyy')} às {selecionado.hora}h</span></div>
                    <div className="flex justify-between pt-1 font-bold text-sm"><span>Total:</span><span className="text-[#8A6D3B] font-black">R$ {Number(selecionado.servico?.preco).toFixed(2)}</span></div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl border-[#F1E4D1]" onClick={() => setEtapaAgendamento(2)} disabled={enviando}>Voltar</Button>
                  <Button className="flex-1 bg-[#4A3721] hover:bg-[#2D2114] text-white h-11 font-bold rounded-xl uppercase tracking-wider text-xs" onClick={handleConfirmarReservaFinal} disabled={enviando || (isSemCadastro && (!selecionado.nome || selecionado.telefone.length < 14))}>
                    {enviando ? 'Confirmando...' : 'Confirmar Agendamento'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}