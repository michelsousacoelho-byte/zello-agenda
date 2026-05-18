import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no acesso",
          description: "E-mail ou senha incorretos.",
        });
      } else {
        toast({ title: "Bem-vinda, Andréia!", description: "Acesso autorizado." });
        
        // FORÇA O RECONHECIMENTO DO LOGIN
        localStorage.setItem('supabase.auth.token', 'true');

        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(data.user);
        } else {
          window.location.href = '/admin/dashboard';
        }
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] p-4">
      <Card className="w-full max-w-md border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[40px] overflow-hidden bg-[#FBF3E3]">
        <CardHeader className="bg-gradient-to-b from-[#8C6A2D] via-[#4A3721] to-[#4A3721] text-white p-10 text-center relative border-b border-[#D4AF37]/30">
          <div className="w-20 h-20 bg-gradient-to-tr from-[#BF953F] via-[#F3D079] to-[#BF953F] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_8px_15px_rgba(0,0,0,0.3)] border border-[#D4AF37]/50">
            <Lock className="w-10 h-10 text-[#4A3721]" />
          </div>
          <CardTitle className="text-3xl font-black uppercase tracking-tighter text-[#F3D079]">Área Administrativa</CardTitle>
          <p className="text-[#D4AF37] text-[11px] font-bold uppercase tracking-[0.25em] mt-2 opacity-90">Andréia Moura | Bronze & Estética</p>
        </CardHeader>
        <CardContent className="p-10 space-y-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-[#634E2A] ml-1 tracking-wider">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-4 w-5 h-5 text-[#8C6A2D] z-10" />
                <Input 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 rounded-2xl border-[#D4AF37]/30 bg-gradient-to-br from-[#FDF8EE] to-[#EBDCB2] shadow-inner text-[#4A3721]"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-[#634E2A] ml-1 tracking-wider">Senha</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 w-5 h-5 text-[#8C6A2D] z-10" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-14 rounded-2xl border-[#D4AF37]/30 bg-gradient-to-br from-[#FDF8EE] to-[#EBDCB2] shadow-inner text-[#4A3721]"
                  required
                />
              </div>
            </div>
            <Button 
              disabled={loading}
              className="w-full h-14 bg-gradient-to-r from-[#4A3721] via-[#634E2A] to-[#4A3721] text-[#F3D079] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Entrar no Sistema"}
            </Button>
          </form>
          <div className="pt-4 border-t border-[#D4AF37]/10 text-center text-[10px] text-[#8C6A2D] font-bold uppercase tracking-widest opacity-60">Acesso Exclusivo à Gestão</div>
        </CardContent>
      </Card>
    </div>
  );
}