import React, { useState } from "react";
import { motion } from "motion/react";
import { BookOpen, Key, Mail, User, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import { User as UserType } from "../types";

interface AuthScreenProps {
  onAuthSuccess: (user: UserType) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("tutojose1@gmail.com"); // default for testing convenience
  const [password, setPassword] = useState("123456"); // default for testing convenience
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isForgot) {
        // Recovery logic
        if (!email) throw new Error("Por favor, digite seu e-mail.");
        // Simulate recover sending
        setTimeout(() => {
          setMessage("Se o e-mail estiver cadastrado, você receberá um link de redefinição de senha em instantes.");
          setLoading(false);
        }, 1200);
        return;
      }

      if (isLogin) {
        // Login API
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Credenciais incorretas");
        
        onAuthSuccess(data.user);
      } else {
        // Register API
        if (!name) throw new Error("O nome de usuário é obrigatório.");
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao registrar usuário");
        
        setMessage("Cadastro realizado com sucesso! Fazendo login...");
        setTimeout(() => {
          onAuthSuccess(data.user);
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro inesperado.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4 py-12 font-sans selection:bg-[#e2b874]/30">
      <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-[#121214] border border-zinc-800 rounded-2xl shadow-2xl shadow-black p-8 md:p-10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#e2b874]"></div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-[#e2b874] mb-4 shadow-sm">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-zinc-100">BookVerse</h1>
          <p className="text-sm text-zinc-400 mt-1 font-sans">Sua biblioteca inteligente de audiobooks & PDFs</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-900/30 text-red-300 rounded-xl text-xs leading-relaxed font-sans">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-900/30 text-emerald-300 rounded-xl text-xs leading-relaxed font-sans">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isForgot ? (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Endereço de E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-[#e2b874] focus:border-[#e2b874] text-zinc-100 transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <>
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      placeholder="Como deseja ser chamado?"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-[#e2b874] focus:border-[#e2b874] text-zinc-100 transition"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Endereço de E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-[#e2b874] focus:border-[#e2b874] text-zinc-100 transition"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Sua Senha
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      className="text-xs text-[#e2b874] hover:underline hover:text-[#c59e5f] transition outline-none cursor-pointer"
                      onClick={() => {
                        setIsForgot(true);
                        setError("");
                        setMessage("");
                      }}
                    >
                      Esqueceu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-[#e2b874] focus:border-[#e2b874] text-zinc-100 transition"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 active:scale-[0.98] transition mt-6 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin"></span>
            ) : isForgot ? (
              <>
                Enviar link de recuperação
                <ArrowRight className="w-4 h-4" />
              </>
            ) : isLogin ? (
              <>
                Entrar no BookVerse
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Cadastrar e Começar
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          {isForgot ? (
            <button
              className="text-[#e2b874] hover:underline font-semibold cursor-pointer"
              onClick={() => {
                setIsForgot(false);
                setError("");
                setMessage("");
              }}
            >
              Voltar para o login
            </button>
          ) : (
            <>
              <p className="text-zinc-400">
                {isLogin ? "Não tem uma conta?" : "Já possui conta?"}
                <button
                  className="text-[#e2b874] hover:underline font-semibold ml-1 outline-none cursor-pointer"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError("");
                    setMessage("");
                  }}
                >
                  {isLogin ? "Cadastre-se" : "Faça Login"}
                </button>
              </p>
            </>
          )}

          <div className="flex items-center gap-1.5 text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Ambiente Seguro RLS</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
