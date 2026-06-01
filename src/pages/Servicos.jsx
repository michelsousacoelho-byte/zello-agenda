import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, Plus, Clock, Users, DollarSign, AlertCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function Servicos() {
  const { slug } = useParams();
  const [estabelecimento, setEstabelecimento] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [form, setForm] = useState({
    nome: '',
    preco: '',
    duracao: '60',
    capacidade_simultanea: '1'
  });

  useEffect(() => {
    carregarDadosEstudioEServicos();
  }, [slug]);

  const carregarDadosEstudioEServicos = async () => {
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
        
        const { data: sv, error } = await supabase
          .from('servicos')
          .select('*')
          .eq('estabelecimento_id', est.id)
          .order('nome', { ascending: true });
          
        if (!error) setServicos(sv || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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

      const { error } = await supabase
        .from('servicos')
        .insert([{
          estabelecimento_id: estabelecimento.id,
          nome: form.nome.trim(),
          preco: precoTratado,
          duracao: duracaoTratada,
          capacidade_simultanea: capacidadeTratada
        }]);

      if (error) throw error;

      toast({ title: "Sucesso!", description: "Procedimento cadastrado com sucesso." });
      
      setForm({ nome: '', preco: '', duracao: '60', capacidade_simultanea: '1' });
      carregarDadosEstudioEServicos();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro ao salvar no banco", description: err.message });
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
      <div className="lg:col-span-1">
        <Card className="border-none shadow-sm bg-white rounded-2xl sticky top-6">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase text-slate-700 tracking-wide flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-800" /> Novo Procedimento
            </CardTitle>
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
                Cadastrar Serviço
              </button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Exibição */}
      <div className="lg:col-span-2">
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