import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sun } from "lucide-react";

export default function PageNotFound() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#FDF8F2] flex flex-col items-center justify-center p-4 text-center">
      <div className="mb-6">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sun className="w-10 h-10 text-[#BF953F]" />
        </div>
        <h1 className="text-6xl font-black text-[#4A3721]">404</h1>
        <p className="text-xl font-bold text-[#8A6D3B] mt-2">Ops! Página não encontrada.</p>
      </div>

      <p className="text-muted-foreground max-w-xs mb-8">
        Parece que o endereço <code className="bg-white px-1 py-0.5 rounded text-[#4A3721] text-xs">{location.pathname}</code> não existe no sistema da Andréia Moura.
      </p>

      <Link to="/">
        <Button className="bg-[#BF953F] hover:bg-[#8A6D3B] text-white px-8 h-12 shadow-md">
          Voltar para o Início
        </Button>
      </Link>

      <p className="text-[10px] text-[#8A6D3B] mt-12 uppercase tracking-widest opacity-50">
        Andréia Moura | Bronze & Estética
      </p>
    </div>
  );
}