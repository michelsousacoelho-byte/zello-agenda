import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Tag, Clock, User, AlertCircle, Loader2 } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarTelefone(valor) {
  if (!valor) return '';
  const n = valor.replace(/\D/g, '');
  if (n.length <= 10) return n.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return n.substring(0, 11).replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

function corStatus(status) {
  switch (status?.toLowerCase()) {
    case 'concluído':
    case 'concluido':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
    case 'confirmado':
      return 'bg-sky-500/10 text-sky-600 border-sky-200';
    case 'pendente':
      return 'bg-amber-500/10 text-amber-600 border-amber-200';
    case 'cancelado':
      return 'bg-rose-500/10 text-rose-600 border-rose-200';
    case 'falta':
      return 'bg-purple-500/10 text-purple-600 border-purple-200';
    default:
      return 'bg-slate-500/10 text-slate-600 border-slate-200';
  }
}

// ─── Aba Histórico ────────────────────────────────────────────────────────────

function HistoricoCliente({ clienteId }) {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!clienteId) return;

    const buscar = async () => {
      setCarregando(true);
      try {
        const { data, error } = await supabase
          .from('agendamentos')
          .select('*, servicos(*)')
          .eq('cliente_id', clienteId)
          .order('data_hora', { ascending: false })
          .limit(50);

        if (error) throw error;
        setHistorico(data || []);
      } catch (err) {
        console.error('Erro ao buscar histórico:', err);
      } finally {
        setCarregando(false);
      }
    };

    buscar();
  }, [clienteId]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-400 uppercase italic">
          Nenhum atendimento encontrado.
        </p>
      </div>
    );
  }

  // Totais resumidos
  const totalGasto = historico
    .filter(ag => {
      const s = ag.status?.toLowerCase();
      return s === 'concluído' || s === 'concluido';
    })
    .reduce((acc, ag) => acc + Number(ag.servicos?.preco || 0), 0);

  const totalVisitas = historico.filter(ag => {
    const s = ag.status?.toLowerCase();
    return s !== 'cancelado' && s !== 'falta';
  }).length;

  return (
    <div className="space-y-4">
      {/* Resumo rápido */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Presenças</p>
          <p className="text-xl font-black text-slate-800 mt-0.5">{totalVisitas}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Total Investido</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">
            R$ {totalGasto.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Lista de atendimentos */}
      <div className="space-y-2">
        {historico.map((ag) => (
          <div
            key={ag.id}
            className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-sm transition-all gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-slate-900 text-white rounded-lg flex flex-col items-center min-w-[52px] shrink-0">
                <span className="text-[9px] opacity-60 font-medium leading-none">
                  {ag.data_hora
                    ? format(parseISO(ag.data_hora), 'dd/MM', { locale: ptBR })
                    : '--/--'}
                </span>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <Clock className="w-2.5 h-2.5 text-amber-400" />
                  <span className="text-[10px] font-black">
                    {ag.data_hora ? ag.data_hora.split('T')[1]?.substring(0, 5) : '--:--'}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-800 truncate flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                  {ag.servicos?.nome || 'Procedimento'}
                </p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  R$ {Number(ag.servicos?.preco || 0).toFixed(2)}
                </p>
              </div>
            </div>
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${corStatus(ag.status)}`}
            >
              {ag.status || 'Confirmado'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Componente Principal: ClienteHistoricoSheet ──────────────────────────────

/**
 * Props:
 *  - aberto: boolean
 *  - onFechar: () => void
 *  - cliente: { id, nome, telefone } | null
 *  - formularioAgendamento: ReactNode  (passa o form já existente em Agenda.jsx)
 */
export default function ClienteHistoricoSheet({
  aberto,
  onFechar,
  cliente,
  formularioAgendamento,
}) {
  if (!cliente) return null;

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-white border-l border-slate-200 p-0 flex flex-col"
      >
        {/* Cabeçalho */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 rounded-xl text-white">
              <User className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle className="text-sm font-black text-slate-800 uppercase tracking-wide">
                {cliente.nome}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" />
                {formatarTelefone(cliente.telefone) || 'Sem telefone'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="historico" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-6 mt-4 mb-0 bg-slate-100 rounded-xl h-9 shrink-0">
            <TabsTrigger
              value="historico"
              className="flex-1 text-xs font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              Histórico
            </TabsTrigger>
            <TabsTrigger
              value="agendar"
              className="flex-1 text-xs font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              Agendar
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="historico"
            className="flex-1 overflow-y-auto px-6 py-4 mt-0"
          >
            <HistoricoCliente clienteId={cliente.id} />
          </TabsContent>

          <TabsContent
            value="agendar"
            className="flex-1 overflow-y-auto px-6 py-4 mt-0"
          >
            {formularioAgendamento ?? (
              <p className="text-xs text-slate-400 italic text-center py-8">
                Formulário não disponível.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
