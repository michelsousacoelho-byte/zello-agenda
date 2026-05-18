import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Clock, DollarSign, X, Users } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function Servicos() {
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  // Incluído 'capacidade' iniciando em 1 como padrão no estado
  const [novoServico, setNovoServico] = useState({ nome: '', descricao: '', preco: '', duracao: '', capacidade: '1' });
  const [idEmEdicao, setIdEmEdicao] = useState(null); 

  useEffect(() => {
    buscarServicos();
  }, []);

  const buscarServicos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('servicos').select('*').order('nome');
    if (!error) setServicos(data);
    setLoading(false);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    
    // Mapeado com a nova coluna 'capacidade_simultanea' para o Supabase
    const dadosServico = {
      nome: novoServico.nome,
      descricao: novoServico.descricao,
      preco: parseFloat(novoServico.preco),
      duracao_minutos: parseInt(novoServico.duracao),
      capacidade_simultanea: parseInt(novoServico.capacidade) || 1 
    };

    if (idEmEdicao) {
      // MODO EDIÇÃO
      const { error } = await supabase
        .from('servicos')
        .update(dadosServico)
        .eq('id', idEmEdicao);

      if (error) {
        console.error(error);
        toast({ title: "Erro", description: "Erro ao atualizar serviço.", variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Serviço atualizado com sucesso!" });
        cancelarEdicao();
        buscarServicos();
      }
    } else {
      // MODO CADASTRO
      const { error } = await supabase.from('servicos').insert([dadosServico]);

      if (error) {
        console.error(error);
        toast({ title: "Erro", description: "Erro ao salvar serviço.", variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Serviço cadastrado!" });
        setNovoServico({ nome: '', descricao: '', preco: '', duracao: '', capacidade: '1' });
        buscarServicos();
      }
    }
  };

  const handleIniciarEdicao = (servico) => {
    setIdEmEdicao(servico.id);
    setNovoServico({
      nome: servico.nome,
      descricao: servico.descricao || '',
      preco: servico.preco,
      duracao: servico.duracao_minutos,
      // Recupera o valor do banco de dados ou assume 1 se estiver nulo
      capacidade: servico.capacidade_simultanea?.toString() || '1'
    });
  };

  const cancelarEdicao = () => {
    setIdEmEdicao(null);
    setNovoServico({ nome: '', descricao: '', preco: '', duracao: '', capacidade: '1' });
  };

  const handleExcluir = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este serviço?")) {
      const { error } = await supabase.from('servicos').delete().eq('id', id);
      if (!error) {
        toast({ title: "Excluído", description: "Serviço removido com sucesso." });
        if(idEmEdicao === id) cancelarEdicao();
        buscarServicos();
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black text-[#4A3721] tracking-tight uppercase">Gerenciar Serviços</h1>
        <p className="text-[#8A6D3B] font-semibold uppercase tracking-widest text-xs mt-1">Configure o catálogo de procedimentos</p>
      </div>

      {/* Formulário de Cadastro / Edição */}
      <Card className="border-none bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-[#FDF8F2] bg-white flex flex-row items-center justify-between">
          <CardTitle className="text-[#4A3721] text-lg uppercase font-bold flex items-center gap-2">
            {idEmEdicao ? (
              <>
                <Edit2 className="w-5 h-5 text-[#BF953F]" /> Editar Procedimento
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-[#BF953F]" /> Novo Procedimento
              </>
            )}
          </CardTitle>
          {idEmEdicao && (
            <Button type="button" variant="ghost" size="sm" onClick={cancelarEdicao} className="text-[#8A6D3B] gap-1">
              <X className="w-4 h-4" /> Cancelar Edição
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#8A6D3B] uppercase">Nome do Serviço *</label>
              <Input 
                value={novoServico.nome} 
                onChange={e => setNovoServico({...novoServico, nome: e.target.value})}
                placeholder="Ex: Bronzeamento Marquinha de Fita"
                required
                className="rounded-xl border-[#F1E4D1]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#8A6D3B] uppercase">Descrição</label>
              <Input 
                value={novoServico.descricao} 
                onChange={e => setNovoServico({...novoServico, descricao: e.target.value})}
                placeholder="Ex: Bronze natural com acelerador dourado"
                className="rounded-xl border-[#F1E4D1]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#8A6D3B] uppercase">Preço (R$) *</label>
              <Input 
                type="number"
                step="0.01"
                value={novoServico.preco} 
                onChange={e => setNovoServico({...novoServico, preco: e.target.value})}
                placeholder="0.00"
                required
                className="rounded-xl border-[#F1E4D1]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#8A6D3B] uppercase">Duração (minutos) *</label>
              <Input 
                type="number"
                value={novoServico.duracao} 
                onChange={e => setNovoServico({...novoServico, duracao: e.target.value})}
                placeholder="60"
                required
                className="rounded-xl border-[#F1E4D1]"
              />
            </div>
            
            {/* NOVO CAMPO: Capacidade de Atendimentos Simultâneos */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-[#8A6D3B] uppercase">Atendimentos Simultâneos (Vagas por Horário) *</label>
              <Input 
                type="number"
                min="1"
                value={novoServico.capacidade} 
                onChange={e => setNovoServico({...novoServico, capacidade: e.target.value})}
                placeholder="Ex: 1 para cílios, 3 para bronzeamento"
                required
                className="rounded-xl border-[#F1E4D1]"
              />
            </div>

            <div className="md:col-span-2 pt-2 flex gap-2">
              <Button type="submit" className="w-full md:w-auto bg-[#BF953F] hover:bg-[#A67C2D] text-white font-bold py-6 px-10 rounded-2xl transition-all uppercase tracking-widest text-xs">
                {idEmEdicao ? "Salvar Alterações" : "Cadastrar Serviço"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Listagem de Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-[#8A6D3B] animate-pulse">Carregando catálogo...</p>
        ) : servicos.map((s) => (
          <Card key={s.id} className={`border-none bg-white rounded-2xl shadow-sm hover:shadow-md transition-all group ${idEmEdicao === s.id ? 'ring-2 ring-[#BF953F]' : ''}`}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-black text-[#4A3721] uppercase text-lg">{s.nome}</h3>
                <p className="text-sm text-[#8A6D3B] font-medium mb-3">{s.descricao || "Sem descrição"}</p>
                <div className="flex gap-4 flex-wrap">
                  <span className="flex items-center gap-1 text-[#BF953F] font-bold text-sm">
                    <DollarSign className="w-4 h-4" /> R$ {s.preco?.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1 text-[#8A6D3B] font-bold text-sm opacity-60">
                    <Clock className="w-4 h-4" /> {s.duracao_minutos} min
                  </span>
                  {/* Badge visual mostrando a capacidade na listagem de cards */}
                  <span className="flex items-center gap-1 text-amber-800 bg-[#FDF8F2] px-2 py-0.5 rounded-md font-bold text-xs">
                    <Users className="w-3.5 h-3.5" /> {s.capacidade_simultanea || 1} {s.capacidade_simultanea > 1 ? 'vagas' : 'vaga'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleIniciarEdicao(s)} className="text-gray-400 hover:text-[#BF953F] hover:bg-[#FAF7F2] rounded-xl">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleExcluir(s.id)} className="text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}