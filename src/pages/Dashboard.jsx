import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, DollarSign, TrendingUp, Star, Award, Clock } from 'lucide-react';

export default function Dashboard() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [stats, setStats] = useState({ hoje: 0, total: 0, clientes: 0, receitaReal: 0, receitaPrevista: 0 });
  const [carroChefe, setCarroChefe] = useState([]);

  useEffect(() => {
    const carregarDados = async () => {
      const hojeStr = new Date().toISOString().split('T')[0];
      
      // Buscamos agendamentos e serviços para cruzar os nomes
      const { data: agendamentos } = await supabase.from('agendamentos').select('*');
      const { data: servicos } = await supabase.from('servicos').select('*');
      
      if (agendamentos) {
        // 1. Filtra agendamentos do período ignorando cadastros base
        const agendamentosNoPeriodo = agendamentos.filter(a => {
          if (a.status === 'Cadastro Base') return false;
          
          const data = new Date(a.data_hora);
          const anoCorreto = data.getFullYear() === Number(ano);
          if (mes === 'todos') return anoCorreto;
          return anoCorreto && (data.getMonth() + 1) === Number(mes);
        });

        // 2. Filtra agendamentos de hoje válidos (ignora faltas/cancelados)
        const agendamentosHoje = agendamentos.filter(a => 
          a.data_hora.startsWith(hojeStr) && 
          a.status !== 'Cadastro Base' && 
          a.status !== 'Cancelado' && 
          a.status !== 'Falta'
        );

        // 3. Receita Real vs Receita Prevista
        const receitaReal = agendamentosNoPeriodo
          .filter(a => a.status === 'Concluído' || a.status === 'Realizado')
          .reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0);

        const receitaPrevista = agendamentosNoPeriodo
          .filter(a => a.status === 'Confirmado' || a.status === 'Pendente')
          .reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0);

        // 4. Clientes Únicos ativos
        const clientesValidos = agendamentosNoPeriodo.filter(a => a.status !== 'Cancelado' && a.status !== 'Falta');
        const clientesUnicos = [...new Set(clientesValidos.map(a => a.cliente_nome))].length;

        // 5. Total de Atendimentos Efetivos
        const totalAtendimentosValidos = agendamentosNoPeriodo.filter(a => a.status !== 'Cancelado' && a.status !== 'Falta').length;

        // Lógica do Carro-Chefe
        const mapaServicos = {};
        agendamentosNoPeriodo.forEach(a => {
          if (a.status !== 'Cadastro Base' && a.status !== 'Cancelado' && a.status !== 'Falta') {
            const servicoInfo = servicos?.find(s => s.id.toString() === a.servico_id?.toString());
            const nome = servicoInfo ? servicoInfo.nome : (a.nome_procedimento || 'Outros');
            
            if (!mapaServicos[nome]) mapaServicos[nome] = { nome, qtd: 0 };
            mapaServicos[nome].qtd += 1;
          }
        });

        const listaOrdenada = Object.values(mapaServicos)
          .sort((a, b) => b.qtd - a.qtd)
          .slice(0, 5);

        setCarroChefe(listaOrdenada);
        setStats({
          hoje: agendamentosHoje.length,
          total: totalAtendimentosValidos,
          clientes: clientesUnicos,
          receitaReal: receitaReal,
          receitaPrevista: receitaPrevista
        });
      }
    };
    carregarDados();
  }, [mes, ano]);

  const meses = [
    { v: "todos", l: "Todos os Meses" },
    { v: "1", l: "Janeiro" }, { v: "2", l: "Fevereiro" }, { v: "3", l: "Março" },
    { v: "4", l: "Abril" }, { v: "5", l: "Maio" }, { v: "6", l: "Junho" },
    { v: "7", l: "Julho" }, { v: "8", l: "Agosto" }, { v: "9", l: "Setembro" },
    { v: "10", l: "Outubro" }, { v: "11", l: "Novembro" }, { v: "12", l: "Dezembro" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#4A3721] tracking-tight uppercase">Resumo Financeiro</h1>
          <p className="text-[#8A6D3B] font-semibold uppercase tracking-widest text-xs mt-1">Andréia Moura | Bronze & Estética</p>
        </div>

        <div className="flex gap-2">
          <select 
            value={mes} 
            onChange={(e) => setMes(e.target.value)}
            className="bg-white border border-[#F1E4D1] text-[#4A3721] rounded-lg px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-[#BF953F] outline-none cursor-pointer"
          >
            {meses.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>

          <select 
            value={ano} 
            onChange={(e) => setAno(e.target.value)}
            className="bg-white border border-[#F1E4D1] text-[#4A3721] rounded-lg px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-[#BF953F] outline-none cursor-pointer"
          >
            {[2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* CARDS DE ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Atend. Hoje" value={stats.hoje} icon={<Calendar className="w-5 h-5 text-[#BF953F]" />} />
        <StatCard title={mes === 'todos' ? "Atend. no Ano" : "Atend. no Mês"} value={stats.total} icon={<TrendingUp className="w-5 h-5 text-[#BF953F]" />} />
        <StatCard title="Clientes Ativas" value={stats.clientes} icon={<Users className="w-5 h-5 text-[#BF953F]" />} />
        
        {/* CARD RECEITA REAL - CORRIGIDO */}
        <StatCard 
          title="Receita Real (Em Caixa)" 
          value={`R$ ${(stats.receitaReal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />} 
          className="bg-gradient-to-br from-emerald-50/50 to-white border-b-4 border-emerald-500 hover:border-emerald-600"
        />

        {/* CARD RECEITA PREVISTA - CORRIGIDO (Removido o stats.stats duplicado que quebrava o app) */}
        <StatCard 
          title="Receita Prevista" 
          value={`R$ ${(stats.receitaPrevista || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          icon={<Clock className="w-5 h-5 text-amber-600" />} 
          className="bg-gradient-to-br from-amber-50/50 to-white border-b-4 border-amber-500 hover:border-amber-600"
        />
      </div>

      {/* RELATÓRIO DE SERVIÇOS CARRO-CHEFE */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-[#FDF8F2] border-b border-[#F1E4D1]">
            <CardTitle className="text-sm font-black uppercase text-[#4A3721] flex items-center gap-2">
              <Star className="w-4 h-4 text-[#BF953F]" /> Serviços Mais Realizados (Carro-Chefe)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                {carroChefe.length > 0 ? carroChefe.map((s, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#4A3721] uppercase">{s.nome}</span>
                      <span className="text-xs font-black text-[#BF953F]">{s.qtd} atendimentos</span>
                    </div>
                    <div className="w-full bg-[#FDF8F2] h-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#BF953F] h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${stats.total > 0 ? (s.qtd / stats.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs italic text-[#8A6D3B]">Nenhum dado para o período selecionado.</p>
                )}
              </div>
              
              {/* Card de Insight Rápido */}
              <div className="bg-[#4A3721] rounded-2xl p-6 text-white flex flex-col justify-center items-center text-center">
                <Award className="w-12 h-12 text-[#BF953F] mb-4" />
                <h4 className="text-lg font-black uppercase mb-2">Destaque do Período</h4>
                {carroChefe.length > 0 && stats.total > 0 ? (
                  <p className="text-sm opacity-90">
                    O serviço <span className="text-[#BF953F] font-bold">"{carroChefe[0].nome}"</span> é o seu maior sucesso, 
                    representando {Math.round((carroChefe[0].qtd / stats.total) * 100)}% da sua demanda ativa.
                  </p>
                ) : (
                  <p className="text-sm opacity-70">Aguardando dados para análise...</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, className = "" }) {
  return (
    <Card className={`border-none bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all border-b-4 border-transparent hover:border-[#BF953F] ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-[#8A6D3B] uppercase tracking-wider">{title}</p>
          <div className="p-2 bg-[#FDF8F2] rounded-xl">{icon}</div>
        </div>
        <div className="text-2xl font-black text-[#4A3721] whitespace-nowrap">{value}</div>
      </CardContent>
    </Card>
  );
}