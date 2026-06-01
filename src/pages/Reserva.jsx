import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, CheckCircle2, UserCircle, UserPlus, ArrowRight, UserCheck, Calendar, Clock, LogOut, Store } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const HORARIOS = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

export default function Reserva() {
  const { slug } = useParams();
  const [estabelecimento, setEstabelecimento] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [etapa, setEtapa] = useState(1);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [isSemCadastro, setIsSemCadastro] = useState(false);

  const [clienteLogado, setClienteLogado] = useState(null);
  const [formLogin, setFormLogin] = useState({ telefone: '' });
  const [formCadastro, setFormCadastro] = useState({ nome: '', telefone: '' });

  const [selecionado, setSelecionado] = useState({ servico: null, data: null, hora: '' });

  useEffect(() => {
    const carregarEstudio = async () => {
      try {
        const currentSlug = slug || 'andreia-moura';
        const { data: est } = await supabase.from('estabelecimentos').select('*').eq('slug', currentSlug).maybeSingle();
        if (est) {
          setEstabelecimento(est);
          const { data: srv } = await supabase.from('servicos').select('*').eq('estabelecimento_id', est.id).order('nome', { ascending: true });
          setServicos(srv || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    carregarEstudio();
    const tel = localStorage.getItem('zello_cliente_tel');
    const nom = localStorage.getItem('zello_cliente_nom');
    if (tel) setClienteLogado({ nome: nom || 'Cliente', telefone: tel });
  }, [slug]);

  const handleAvancarServico = (srv) => { setSelecionado({ ...selecionado, servico: srv }); setEtapa(2); };
  const handleAvancarData = (dt) => { setSelecionado({ ...selecionado, data: dt }); };
  const handleAvancarHora = (hr) => { setSelecionado({ ...selecionado, hora: hr }); setEtapa(clienteLogado || isSemCadastro ? 4 : 3); };

  const handleAcessoRapido = async (e) => {
    e.preventDefault();
    if (!formLogin.telefone) return;
    const { data } = await supabase.from('clientes_fidelidade').select('*').eq('estabelecimento_id', estabelecimento.id).eq('telefone', formLogin.telefone).maybeSingle();
    if (data) {
      localStorage.setItem('zello_cliente_tel', data.telefone);
      localStorage.setItem('zello_cliente_nom', data.nome);
      setClienteLogado(data);
      setEtapa(4);
    } else {
      alert("Telefone não encontrado. Cadastre-se ou continue sem cadastro.");
    }
  };

  const handleCadastroRapido = async (e) => {
    e.preventDefault();
    if (!formCadastro.nome || !formCadastro.telefone) return;
    await supabase.from('clientes_fidelidade').insert([{ ...formCadastro, estabelecimento_id: estabelecimento.id }]);
    localStorage.setItem('zello_cliente_tel', formCadastro.telefone);
    localStorage.setItem('zello_cliente_nom', formCadastro.nome);
    setClienteLogado(formCadastro);
    setEtapa(4);
  };

  const handleConfirmarReservaFinal = async () => {
    try {
      setEnviando(true);
      const payload = {
        estabelecimento_id: estabelecimento.id,
        servico_id: selecionado.servico.id,
        cliente_nome: clienteLogado?.nome || "Cliente Visitante",
        cliente_telefone: clienteLogado?.telefone || "Não informado",
        data_hora: `${format(selecionado.data, 'yyyy-MM-dd')}T${selecionado.hora}:00`,
        status: 'Pendente',
        valor_total: selecionado.servico.preco
      };
      await supabase.from('agendamentos').insert([payload]);
      setEtapa(5);
    } catch (e) {
      console.error(e);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased text-slate-800">
      <header className="bg-slate-900 text-white py-4 px-6 shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-400" />
            <span className="font-black uppercase text-sm tracking-wider">{estabelecimento?.nome_estudio || "Agendamento Online"}</span>
          </div>
          {clienteLogado && <button onClick={() => { localStorage.clear(); setClienteLogado(null); setEtapa(1); }} className="text-xs font-bold text-rose-400 flex items-center gap-1"><LogOut className="w-3.5 h-3.5" /> Sair</button>}
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4">
        {etapa === 1 && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Passo 1: Selecione o Procedimento</h3>
            {servicos.map(s => (
              <Card key={s.id} onClick={() => handleAvancarServico(s)} className="bg-white border border-slate-200 cursor-pointer hover:border-slate-400 transition-all p-4 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900">{s.nome}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{s.duracao_minutos} minutos</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-slate-100 text-slate-800 text-xs font-black px-3 py-1.5 rounded-lg border border-slate-200">R$ {Number(s.preco).toFixed(0)}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {etapa === 2 && (
          <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Passo 2: Escolha o melhor horário</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)).map(dt => (
                <button key={dt.toString()} onClick={() => handleAvancarData(dt)} className={`flex flex-col items-center p-3 rounded-xl min-w-[70px] border transition-all ${selecionado.data && format(selecionado.data,'dd') === format(dt,'dd') ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <span className="text-[9px] font-black uppercase opacity-70">{format(dt, 'EEE', { locale: ptBR })}</span>
                  <span className="text-base font-black mt-0.5">{format(dt, 'dd')}</span>
                </button>
              ))}
            </div>

            {selecionado.data && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-500 mb-3">Horários disponíveis para {format(selecionado.data, "dd 'de' MMMM", { locale: ptBR })}:</p>
                <div className="grid grid-cols-4 gap-2">
                  {HORARIOS.map(hr => <button key={hr} onClick={() => handleAvancarHora(hr)} className="h-10 bg-slate-50 text-slate-800 text-xs font-black rounded-lg border border-slate-200 hover:bg-slate-900 hover:text-white transition-colors">{hr}</button>)}
                </div>
              </div>
            )}
            <Button variant="ghost" onClick={() => setEtapa(1)} className="w-full text-slate-500 mt-4">Voltar</Button>
          </div>
        )}

        {etapa === 3 && (
          <div className="space-y-4 max-w-sm mx-auto">
            <Card className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-xs font-black uppercase text-slate-900 text-center mb-4">Como deseja continuar?</h3>
              <div className="space-y-3">
                <form onSubmit={handleAcessoRapido} className="space-y-2 pb-4 border-b border-slate-100">
                  <Input placeholder="Seu Telefone Cadastrado" value={formLogin.telefone} onChange={(e) => setFormLogin({ ...formLogin, telefone: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 font-bold" />
                  <Button type="submit" className="w-full bg-slate-900 text-white text-xs font-black uppercase h-10 rounded-xl">Acessar com meu número</Button>
                </form>
                <form onSubmit={handleCadastroRapido} className="space-y-2 pt-2">
                  <p className="text-[10px] font-black uppercase text-slate-400 text-center">Primeira vez por aqui?</p>
                  <Input placeholder="Seu Nome Completo" value={formCadastro.nome} onChange={(e) => setFormCadastro({ ...formCadastro, nome: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 font-bold" />
                  <Input placeholder="Seu Telefone Celular" value={formCadastro.telefone} onChange={(e) => setFormCadastro({ ...formCadastro, telefone: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 font-bold" />
                  <Button type="submit" className="w-full bg-slate-100 text-slate-800 border border-slate-200 text-xs font-black uppercase h-10 rounded-xl">Criar Nova Ficha</Button>
                </form>
                <Button onClick={() => { setIsSemCadastro(true); setEtapa(4); }} variant="link" className="w-full text-slate-500 text-xs font-bold uppercase mt-2">Agendar sem cadastro</Button>
              </div>
            </Card>
          </div>
        )}

        {etapa === 4 && (
          <div className="max-w-md mx-auto">
            <Card className="bg-white border border-slate-200 p-6 rounded-2xl shadow-md">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-2 mb-4">Confirme seu Agendamento</h3>
              <div className="space-y-3 text-xs font-bold text-slate-700">
                <div className="flex justify-between border-b border-slate-50 pb-2"><span>Procedimento:</span><span className="text-slate-900 font-black uppercase">{selecionado.servico?.nome}</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-2"><span>Data Escolhida:</span><span className="text-slate-900 font-black">{selecionado.data && format(selecionado.data, 'dd/MM/yyyy')}</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-2"><span>Horário Marcado:</span><span className="text-slate-900 font-black">{selecionado.hora} hs</span></div>
                <div className="flex justify-between pt-1"><span>Valor do Atendimento:</span><span className="text-slate-900 text-sm font-black">R$ {Number(selecionado.servico?.preco).toFixed(2)}</span></div>
              </div>
              <div className="flex gap-2 pt-6">
                <Button variant="outline" onClick={() => setEtapa(2)} className="flex-1 border-slate-200 text-slate-600">Voltar</Button>
                <Button disabled={enviando} onClick={handleConfirmarReservaFinal} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs">Confirmar e Agendar</Button>
              </div>
            </Card>
          </div>
        )}

        {etapa === 5 && (
          <div className="text-center py-12 max-w-sm mx-auto space-y-4 bg-white border border-slate-200 p-8 rounded-3xl shadow-xl">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm"><CheckCircle2 className="w-10 h-10" /></div>
            <h2 className="text-lg font-black uppercase text-slate-900">Horário Reservado!</h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Sua solicitação de agendamento foi salva com sucesso e já está disponível no painel interno do estúdio.</p>
            <Button onClick={() => { setEtapa(1); setSelecionado({ servico: null, data: null, hora: '' }); }} className="w-full bg-slate-900 text-white font-black text-xs uppercase h-11 rounded-xl">Novo Agendamento</Button>
          </div>
        )}
      </main>
    </div>
  );
}