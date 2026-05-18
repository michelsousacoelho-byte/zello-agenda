import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, Clock, Phone, Plus, Tag, User, Users, 
  ChevronDown, History, X, Search, Filter, Trophy, Star, Medal, Crown, 
  DollarSign, Trash2, CheckCircle 
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function SistemaGestao() {
  const [abaAtiva, setAbaAtiva] = useState('agenda');
  const [agendamentos, setAgendamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [clienteExpandido, setClienteExpandido] = useState(null);
  const [mostrarNovoCliente, setMostrarNovoCliente] = useState(false);
  const [sugestoesClientes, setSugestoesClientes] = useState([]);
  
  // ESTADOS DE FILTRO
  const [filtroData, setFiltroData] = useState('');
  const [buscaAgenda, setBuscaAgenda] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [anoFidelidade, setAnoFidelidade] = useState(new Date().getFullYear().toString());
  
  const dateInputRef = useRef(null); 
  const { toast } = useToast();

  const [form, setForm] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    data_hora: '',
    valor_total: '',
    servico_id: '',
    status: 'Pendente'
  });

  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '' });

  useEffect(() => {
    buscarDados();
  }, [abaAtiva]);

  const aplicarMascaraTelefone = (valor) => {
    if (!valor) return "";
    valor = valor.replace(/\D/g, "");
    valor = valor.replace(/^(\d{2})(\d)/g, "($1) $2");
    valor = valor.replace(/(\d{5})(\d)/, "$1-$2");
    return valor.substring(0, 15);
  };

  const aplicarMascaraMoeda = (valor) => {
    if (!valor) return "";
    let v = valor.replace(/\D/g, '');
    v = (Number(v) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return v;
  };

  const buscarDados = async () => {
    setLoading(true);
    try {
      const { data: sData } = await supabase.from('servicos').select('*');
      const { data: aData, error: aError } = await supabase.from('agendamentos').select('*').order('data_hora', { ascending: false });

      if (aError) throw aError;

      const formatados = (aData || []).map(agenda => ({
        ...agenda,
        nome_procedimento: sData?.find(s => s.id.toString() === agenda.servico_id?.toString())?.nome || 'Lançamento Direto'
      }));

      setAgendamentos(formatados);
      setServicos(sData || []);

      const mapaClientes = {};
      formatados.forEach(item => {
        const nome = item.cliente_nome || 'Sem Nome';
        if (!mapaClientes[nome]) {
          mapaClientes[nome] = { nome: nome, telefone: item.cliente_telefone, totalGasto: 0, visitas: [] };
        }
        
        // CORREÇÃO CRÍTICA DE FATURAMENTO: 
        // Só soma na receita se o atendimento estiver de fato Concluído ou Confirmado.
        // Se estiver Pendente, Falta ou Cancelado, NÃO entra no saldo do cliente.
        if (item.status === 'Concluído' || item.status === 'Confirmado' || item.status === 'Realizado') {
          mapaClientes[nome].totalGasto += Number(item.valor_total || 0);
        }
        
        mapaClientes[nome].visitas.push(item);
      });
      setClientes(Object.values(mapaClientes).sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const mostrarAviso = (titulo, desc, variante = "default") => {
    toast({ title: titulo, description: desc, variant: variante });
  };

  const selecionarClienteExistente = (cliente) => {
    setForm({ ...form, cliente_nome: cliente.nome, cliente_telefone: cliente.telefone || '' });
    setSugestoesClientes([]);
  };

  const handleNomeChange = (valor) => {
    setForm({ ...form, cliente_nome: valor });
    if (valor.length > 1) {
      const filtrados = clientes.filter(c => c.nome.toLowerCase().includes(valor.toLowerCase()));
      setSugestoesClientes(filtrados);
    } else {
      setSugestoesClientes([]);
    }
  };

  const salvarAgendamento = async (e) => {
    e.preventDefault();

    if (editandoId && !window.confirm("Deseja salvar as alterações neste agendamento?")) return;

    if (form.servico_id && form.data_hora) {
      const servicoSelecionado = servicos.find(s => s.id.toString() === form.servico_id.toString());
      const limiteMaximo = servicoSelecionado?.capacidade_simultanea || 1;

      const agendamentosConcorrentes = agendamentos.filter(a => 
        a.status !== 'Cadastro Base' &&
        a.status !== 'Cancelado' &&
        a.status !== 'Falta' &&
        a.servico_id?.toString() === form.servico_id.toString() &&
        a.data_hora.slice(0, 16) === form.data_hora.slice(0, 16) &&
        a.id !== editandoId
      );

      if (form.status !== 'Cancelado' && form.status !== 'Falta' && agendamentosConcorrentes.length >= limiteMaximo) {
        mostrarAviso(
          "Horário Esgotado", 
          `O serviço "${servicoSelecionado.nome}" já atingiu o limite de ${limiteMaximo} atendimentos simultâneos para este horário.`, 
          "destructive"
        );
        return;
      }
    }

    const valorParaSalvar = typeof form.valor_total === 'string' 
      ? parseFloat(form.valor_total.replace(/\./g, '').replace(',', '.')) 
      : form.valor_total;

    const payload = {
      cliente_nome: form.cliente_nome,
      cliente_telefone: form.cliente_telefone,
      data_hora: form.data_hora,
      valor_total: valorParaSalvar || 0,
      servico_id: form.servico_id ? parseInt(form.servico_id) : null,
      status: form.status
    };

    const { error } = editandoId 
      ? await supabase.from('agendamentos').update(payload).eq('id', editandoId)
      : await supabase.from('agendamentos').insert([{ ...payload, status: payload.status || 'Confirmado' }]);

    if (!error) {
      mostrarAviso("Sucesso", editandoId ? "Alterações salvas." : "Agendamento realizado.");
      setEditandoId(null);
      setForm({ cliente_nome: '', cliente_telefone: '', data_hora: '', valor_total: '', servico_id: '', status: 'Pendente' });
      setSugestoesClientes([]);
      buscarDados();
    }
  };

  const excluirAgendamento = async (e, id) => {
    e.stopPropagation(); 
    if (window.confirm("⚠️ ATENÇÃO: Tem certeza que deseja excluir este agendamento?")) {
      const { error } = await supabase.from('agendamentos').delete().eq('id', id);
      if (!error) {
        mostrarAviso("Excluído", "Registro removido com sucesso.");
        buscarDados();
      }
    }
  };

  const cadastrarApenasCliente = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('agendamentos').insert([{
      cliente_nome: novoCliente.nome,
      cliente_telefone: aplicarMascaraTelefone(novoCliente.telefone),
      status: 'Cadastro Base',
      valor_total: 0,
      data_hora: new Date().toISOString()
    }]);

    if (!error) {
      mostrarAviso("Cliente Cadastrada", "Base de dados atualizada.");
      setNovoCliente({ nome: '', telefone: '' });
      setMostrarNovoCliente(false);
      buscarDados();
    }
  };

  const agendamentosFiltrados = agendamentos.filter(a => {
    if (a.status === 'Cadastro Base') return false;
    const atendeData = filtroData ? a.data_hora.split('T')[0] === filtroData : true;
    const atendeNome = buscaAgenda ? a.cliente_nome.toLowerCase().includes(buscaAgenda.toLowerCase()) : true;
    return atendeData && atendeNome;
  });

  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  );

  const rankingFidelidade = clientes.map(c => {
    // Apenas atendimentos concluídos ou confirmados entram para a contagem de estrelas/fidelidade do ano
    const visitasNoAno = c.visitas.filter(v => 
      v.status !== 'Cadastro Base' && 
      v.status !== 'Cancelado' && 
      v.status !== 'Falta' &&
      v.status !== 'Pendente' &&
      v.data_hora.startsWith(anoFidelidade)
    ).length;
    
    const gastoNoAno = c.visitas
      .filter(v => v.status !== 'Cadastro Base' && v.status !== 'Cancelado' && v.status !== 'Falta' && v.status !== 'Pendente' && v.data_hora.startsWith(anoFidelidade))
      .reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);

    return { ...c, visitasNoAno, gastoNoAno };
  }).filter(c => c.visitasNoAno > 0)
    .sort((a, b) => b.visitasNoAno - a.visitasNoAno || b.gastoNoAno - a.gastoNoAno);

  // --- LOGICA DO CARD RECEITA REAL DA AGENDA ---
  // Calcula dinamicamente o valor total com base nos agendamentos da lista atual (filtrados ou do dia)
  const receitaRealFiltro = agendamentosFiltrados
    .filter(item => item.status === 'Concluído' || item.status === 'Realizado')
    .reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);

  const receitaPrevistaFiltro = agendamentosFiltrados
    .filter(item => item.status === 'Confirmado' || item.status === 'Pendente')
    .reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-center bg-[#4A3721] p-6 rounded-3xl text-white shadow-xl gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Andréia Moura</h1>
          <p className="text-[#BF953F] text-[10px] font-bold uppercase tracking-[0.2em]">Bronze & Estética</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 bg-white/10 p-1 rounded-xl w-full md:w-auto">
          <Button variant={abaAtiva === 'agenda' ? 'secondary' : 'ghost'} onClick={() => setAbaAtiva('agenda')} className="h-9 text-xs font-bold uppercase text-white">Agenda</Button>
          <Button variant={abaAtiva === 'clientes' ? 'secondary' : 'ghost'} onClick={() => setAbaAtiva('clientes')} className="h-9 text-xs font-bold uppercase text-white">Clientes</Button>
          <Button variant={abaAtiva === 'fidelidade' ? 'secondary' : 'ghost'} onClick={() => setAbaAtiva('fidelidade')} className="h-9 text-xs font-bold uppercase text-white flex gap-2">
            <Trophy className="w-3 h-3" /> Ranking
          </Button>
        </div>
      </header>

      {abaAtiva === 'agenda' && (
        <>
          <Card className="border-none shadow-sm rounded-2xl overflow-visible bg-white relative z-50">
            <CardHeader className="bg-[#FDF8F2] border-b border-[#F1E4D1]">
              <CardTitle className="text-sm font-bold uppercase text-[#4A3721] flex items-center gap-2">
                {editandoId ? <History className="w-4 h-4 text-[#BF953F]" /> : <Plus className="w-4 h-4 text-[#BF953F]" />}
                {editandoId ? 'Editar / Atualizar Atendimento' : 'Novo Agendamento'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={salvarAgendamento} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-end">
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black uppercase text-[#8A6D3B]">Nome Cliente</label>
                  <div className="relative">
                    <Input value={form.cliente_nome} onChange={e => handleNomeChange(e.target.value)} required className="rounded-lg border-[#F1E4D1] h-11 bg-white pr-8" placeholder="Buscar..." />
                    <Search className="w-4 h-4 absolute right-3 top-3.5 text-[#BF953F] opacity-50" />
                  </div>
                  {sugestoesClientes.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border border-[#F1E4D1] shadow-2xl rounded-lg mt-1 overflow-hidden z-[100] max-h-48 overflow-y-auto">
                      {sugestoesClientes.map((c, i) => (
                        <div key={i} onClick={() => selecionarClienteExistente(c)} className="p-3 text-sm hover:bg-[#FDF8F2] cursor-pointer border-b border-[#FDF8F2] last:border-0 flex flex-col">
                          <span className="font-bold text-[#4A3721]">{c.nome}</span>
                          <span className="text-[10px] text-[#8A6D3B]">{c.telefone || 'Sem telefone'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[#8A6D3B]">Telefone</label>
                  <Input 
                    value={form.cliente_telefone} 
                    onChange={e => setForm({...form, cliente_telefone: aplicarMascaraTelefone(e.target.value)})} 
                    placeholder="(00) 00000-0000" 
                    className="rounded-lg border-[#F1E4D1] h-11 bg-white" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[#8A6D3B]">Procedimento</label>
                  <select 
                    value={form.servico_id} 
                    onChange={e => { 
                      const s = servicos.find(x => x.id.toString() === e.target.value); 
                      setForm({...form, servico_id: e.target.value, valor_total: s ? s.preco.toString() : form.valor_total}); 
                    }} 
                    className="w-full h-11 rounded-lg border border-[#F1E4D1] text-sm px-3 outline-none bg-white"
                  >
                    <option value="">Selecione...</option>
                    {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} {s.capacidade_simultanea > 1 ? `(Max: ${s.capacidade_simultanea})` : ''}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[#8A6D3B]">Data/Hora</label>
                  <div className="relative flex items-center">
                    <input ref={dateInputRef} type="datetime-local" value={form.data_hora} onChange={e => setForm({...form, data_hora: e.target.value})} required className="flex w-full rounded-lg border border-[#F1E4D1] bg-white px-3 h-11 text-sm outline-none" />
                    <button type="button" onClick={() => dateInputRef.current?.showPicker()} className="absolute right-2 p-1 text-[#BF953F]"><CalendarIcon className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[#8A6D3B]">Valor (R$)</label>
                  <Input 
                    value={form.valor_total} 
                    onChange={e => setForm({...form, valor_total: aplicarMascaraMoeda(e.target.value)})} 
                    placeholder="0,00" 
                    className="rounded-lg border-[#F1E4D1] h-11 bg-white" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-[#8A6D3B]">Status</label>
                  <select 
                    value={form.status || 'Pendente'} 
                    onChange={e => setForm({...form, status: e.target.value})} 
                    className="w-full h-11 rounded-lg border border-[#F1E4D1] text-sm px-3 font-bold outline-none bg-white text-[#4A3721]"
                  >
                    <option value="Pendente">⏳ Pendente</option>
                    <option value="Confirmado">✅ Confirmado</option>
                    <option value="Concluído">💙 Concluído</option>
                    <option value="Falta">❌ Falta</option>
                    <option value="Cancelado">🚫 Cancelado</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-[#4A3721] hover:bg-[#2D2114] text-white font-bold h-11 rounded-lg uppercase text-[10px]">{editandoId ? 'Atualizar' : 'Confirmar'}</Button>
                  {editandoId && (<Button onClick={() => {setEditandoId(null); setForm({cliente_nome:'', cliente_telefone:'', data_hora:'', valor_total:'', servico_id:'', status: 'Pendente'})}} variant="outline" className="h-11 rounded-lg border-red-200 text-red-500"><X className="w-4 h-4"/></Button>)}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* NOVO PAINEL DE VISÃO DE CAIXA REAL (Sincronizado com os Filtros da Agenda) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Receita Confirmada (Em Caixa)</p>
                <h3 className="text-2xl font-black text-emerald-900 mt-1">R$ {receitaRealFiltro.toFixed(2)}</h3>
              </div>
              <div className="bg-emerald-500 text-white p-3 rounded-xl"><DollarSign className="w-5 h-5" /></div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-white p-4 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Receita Prevista (Agenda Ativa)</p>
                <h3 className="text-2xl font-black text-amber-900 mt-1">R$ {receitaPrevistaFiltro.toFixed(2)}</h3>
              </div>
              <div className="bg-amber-500 text-white p-3 rounded-xl"><Clock className="w-5 h-5" /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#FDF8F2] p-4 rounded-2xl border border-[#F1E4D1]">
            <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-xl border border-[#F1E4D1]"><Search className="w-4 h-4 text-[#BF953F]" /><input type="text" placeholder="Buscar na agenda..." value={buscaAgenda} onChange={(e) => setBuscaAgenda(e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none text-[#4A3721] placeholder:text-[#8A6D3B]/50" />{buscaAgenda && <X onClick={() => setBuscaAgenda('')} className="w-4 h-4 text-red-400 cursor-pointer" />}</div>
            <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-xl border border-[#F1E4D1]"><CalendarIcon className="w-4 h-4 text-[#BF953F]" /><input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none text-[#4A3721]" />{filtroData && <X onClick={() => setFiltroData('')} className="w-4 h-4 text-red-400 cursor-pointer" />}</div>
          </div>

          <div className="grid gap-3 relative z-10">
            {agendamentosFiltrados.length > 0 ? (
              agendamentosFiltrados.map((item) => (
                <Card key={item.id} onClick={() => { setEditandoId(item.id); setForm({ ...item, data_hora: item.data_hora.slice(0,16), servico_id: item.servico_id?.toString() || '', valor_total: item.valor_total.toString().replace('.', ','), status: item.status || 'Pendente' }); window.scrollTo({top:0, behavior:'smooth'}); }} className="border-none shadow-sm hover:shadow-md cursor-pointer transition-all bg-white rounded-xl border-l-4 border-transparent hover:border-[#BF953F] group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-[#FDF8F2] p-3 rounded-xl text-[#BF953F]"><CalendarIcon className="w-5 h-5" /></div>
                      <div>
                        <h3 className="font-bold text-[#4A3721] uppercase text-sm">{item.cliente_nome}</h3>
                        <div className="flex flex-wrap gap-3 text-[10px] font-bold text-[#8A6D3B] mt-1">
                          <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {item.nome_procedimento}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(item.data_hora), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className={`text-[9px] uppercase font-bold px-2 py-1 rounded-full ${
                        item.status === 'Concluído' || item.status === 'Realizado' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        item.status === 'Confirmado' ? 'bg-green-50 text-green-700 border border-green-200' :
                        item.status === 'Falta' || item.status === 'Cancelado' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.status || 'Pendente'}
                      </span>
                      <p className={`text-sm font-black ${item.status === 'Falta' || item.status === 'Cancelado' ? 'text-red-400 line-through opacity-60' : 'text-[#4A3721]'}`}>
                        R$ {Number(item.valor_total).toFixed(2)}
                      </p>
                      <button onClick={(e) => excluirAgendamento(e, item.id)} className="p-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (<div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-[#F1E4D1]"><p className="text-xs font-bold text-[#8A6D3B] uppercase italic">Nenhum agendamento encontrado.</p></div>)}
          </div>
        </>
      )}

      {abaAtiva === 'clientes' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center px-2 gap-4">
            <h2 className="text-[#4A3721] font-black uppercase text-lg flex items-center gap-2"><Users className="w-5 h-5 text-[#BF953F]" /> Gestão de Clientes</h2>
            <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-full border border-[#F1E4D1] shadow-sm w-full md:w-64"><Search className="w-4 h-4 text-[#BF953F]" /><input type="text" placeholder="Procurar cliente..." value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none text-[#4A3721] placeholder:text-[#8A6D3B]/50" />{buscaCliente && <X onClick={() => setBuscaCliente('')} className="w-4 h-4 text-red-400 cursor-pointer" />}</div>
            <Button onClick={() => setMostrarNovoCliente(!mostrarNovoCliente)} className="bg-[#BF953F] text-white rounded-full h-10 px-4 text-xs font-bold uppercase flex items-center gap-2 shadow-lg w-full md:w-auto"><Plus className="w-4 h-4" /> Cadastrar Cliente</Button>
          </div>
          {mostrarNovoCliente && (<Card className="border-2 border-dashed border-[#BF953F] bg-[#FDF8F2] rounded-2xl animate-in slide-in-from-top duration-300"><CardContent className="p-6"><form onSubmit={cadastrarApenasCliente} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"><div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#8A6D3B]">Nome Completo</label><Input value={novoCliente.nome} onChange={e => setNovoCliente({...novoCliente, nome: e.target.value})} required className="bg-white rounded-lg border-[#F1E4D1] h-11" /></div><div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#8A6D3B]">WhatsApp / Telefone</label><Input value={novoCliente.telefone} onChange={e => setNovoCliente({...novoCliente, telefone: aplicarMascaraTelefone(e.target.value)})} placeholder="(00) 00000-0000" className="bg-white rounded-lg border-[#F1E4D1] h-11" /></div><div className="flex gap-2"><Button type="submit" className="flex-1 bg-[#4A3721] text-white font-bold h-11 rounded-lg uppercase text-[10px]">Salvar Cadastro</Button><Button onClick={() => setMostrarNovoCliente(false)} variant="ghost" className="h-11 text-red-500">Cancelar</Button></div></form></CardContent></Card>)}
          <div className="grid grid-cols-1 gap-3">
            {clientesFiltrados.length > 0 ? (clientesFiltrados.map((c, i) => (
              <Card key={i} className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-[#FDF8F2] transition-colors" onClick={() => setClienteExpandido(clienteExpandido === c.nome ? null : c.nome)}><div className="flex items-center gap-4"><div className="bg-[#4A3721] text-[#BF953F] p-3 rounded-full shadow-inner"><User className="w-5 h-5" /></div><div><h3 className="font-bold text-[#4A3721] uppercase text-sm">{c.nome}</h3><p className="text-[10px] text-[#8A6D3B] font-bold flex items-center gap-1 uppercase tracking-tighter"><Phone className="w-3 h-3" /> {c.telefone || 'Sem contato'}</p></div></div><div className="flex items-center gap-4"><div className="text-right hidden md:block"><p className="text-[9px] font-bold text-[#8A6D3B] uppercase">Gasto Real Confirmado</p><p className="text-sm font-black text-[#4A3721]">R$ {c.totalGasto.toFixed(2)}</p></div><ChevronDown className={`w-5 h-5 text-[#BF953F] transition-transform ${clienteExpandido === c.nome ? 'rotate-180' : ''}`} /></div></div>
                {clienteExpandido === c.nome && (
                  <div className="px-5 pb-5 pt-2 bg-[#FDF8F2]/30 border-t border-[#F1E4D1] animate-in slide-in-from-top duration-200">
                    <div className="space-y-2 mt-2">
                      {c.visitas.filter(v => v.status !== 'Cadastro Base').length > 0 ? (
                        c.visitas.filter(v => v.status !== 'Cadastro Base').map((v, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg text-xs shadow-sm border border-[#F1E4D1]/30">
                            <div>
                              <p className="font-bold text-[#4A3721] uppercase text-[10px]">{v.nome_procedimento}</p>
                              <p className="text-[#8A6D3B] text-[9px] font-bold uppercase">{format(parseISO(v.data_hora), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                v.status === 'Concluído' ? 'bg-blue-50 text-blue-700' :
                                v.status === 'Falta' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                              }`}>{v.status}</span>
                              <p className={`font-black ${v.status === 'Falta' || v.status === 'Cancelado' ? 'text-red-400 line-through opacity-50' : 'text-[#4A3721]'}`}>
                                R$ {Number(v.valor_total).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (<div className="py-8 text-center text-[10px] text-[#8A6D3B] font-bold uppercase italic">Nenhum histórico de visitas.</div>)}
                    </div>
                  </div>
                )}
              </Card>
            ))) : (<div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-[#F1E4D1]"><p className="text-xs font-bold text-[#8A6D3B] uppercase italic">Cliente não encontrado.</p></div>)}
          </div>
        </div>
      )}

      {abaAtiva === 'fidelidade' && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
            <div>
              <h2 className="text-[#4A3721] font-black uppercase text-xl flex items-center gap-2"><Trophy className="w-6 h-6 text-[#BF953F]" /> Ranking de Fidelidade</h2>
              <p className="text-[10px] text-[#8A6D3B] font-bold uppercase tracking-widest mt-1">As estrelas que mais brilham no studio</p>
            </div>
            <div className="flex items-center gap-2 bg-white border border-[#F1E4D1] px-4 py-2 rounded-xl shadow-sm">
              <Filter className="w-3 h-3 text-[#BF953F]" />
              <select value={anoFidelidade} onChange={(e) => setAnoFidelidade(e.target.value)} className="bg-transparent text-xs font-black text-[#4A3721] outline-none">
                {['2024', '2025', '2026', '2027'].map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-3">
            {rankingFidelidade.length > 0 ? (
              rankingFidelidade.map((cliente, index) => (
                <Card key={index} className={`border-none shadow-sm rounded-2xl overflow-hidden transition-all ${index === 0 ? 'bg-gradient-to-r from-[#FFFBF2] to-white border-l-8 border-[#BF953F]' : 'bg-white'}`}>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center w-10">
                        {index === 0 && <Crown className="w-8 h-8 text-[#BF953F] animate-bounce" />}
                        {index === 1 && <Medal className="w-7 h-7 text-slate-400" />}
                        {index === 2 && <Medal className="w-7 h-7 text-amber-700" />}
                        {index > 2 && <span className="text-lg font-black text-[#F1E4D1]">#{index + 1}</span>}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#4A3721] uppercase text-sm flex items-center gap-2">
                          {cliente.nome}
                          {index === 0 && <span className="bg-[#BF953F] text-white text-[8px] px-2 py-0.5 rounded-full">ESTRELA Nº 1</span>}
                        </h3>
                        <div className="flex gap-4 mt-1">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-[#8A6D3B] uppercase"><Star className="w-3 h-3 fill-[#BF953F] text-[#BF953F]" /> {cliente.visitasNoAno} Visitas</span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-[#8A6D3B] uppercase"><DollarSign className="w-3 h-3 text-[#BF953F]" /> R$ {cliente.gastoNoAno.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] font-black text-[#BF953F] uppercase">Ranking {anoFidelidade}</p>
                      <p className="text-[10px] font-bold text-[#4A3721] uppercase">Fidelidade Máxima</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-[#F1E4D1]">
                <Trophy className="w-12 h-12 mx-auto opacity-10 mb-4 text-[#4A3721]" />
                <p className="text-xs font-bold text-[#8A6D3B] uppercase italic">Nenhum dado de fidelidade para este ano.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}