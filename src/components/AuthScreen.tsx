import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { BookOpen, Key, Mail, User, ArrowRight, ShieldCheck, ShieldAlert, Lock } from "lucide-react";
import { User as UserType } from "../types";

interface AuthScreenProps {
  onAuthSuccess: (user: UserType) => void;
  defaultIsLogin?: boolean;
  onBackToLanding?: () => void;
  isAdminPortal?: boolean;
}

type LoginRoleType = "super" | "admin" | "leitor" | "moderador";

export default function AuthScreen({
  onAuthSuccess,
  defaultIsLogin = true,
  onBackToLanding,
  isAdminPortal = false
}: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(defaultIsLogin);
  const [isForgot, setIsForgot] = useState(false);
  const [selectedRole, setSelectedRole] = useState<LoginRoleType>(
    isAdminPortal ? "super" : "leitor"
  );

  useEffect(() => {
    setIsLogin(defaultIsLogin);
  }, [defaultIsLogin]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("tutojose1@gmail.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Auto pre-fill based on selected role tab for quick testing & role differentiation
  useEffect(() => {
    if (!isLogin) return; // don't prefill during registration
    
    if (selectedRole === "super") {
      setEmail("tutojose1@gmail.com");
      setPassword("123456");
    } else if (selectedRole === "admin") {
      setEmail("admin@bookverse.com");
      setPassword("123456");
    } else if (selectedRole === "moderador") {
      setEmail("moderador@bookverse.com");
      setPassword("123456");
    } else {
      setEmail("leitor@bookverse.com");
      setPassword("123456");
    }
  }, [selectedRole, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isForgot) {
        if (!email) throw new Error("Por favor, digite seu e-mail.");
        setTimeout(() => {
          setMessage("Se o e-mail estiver cadastrado, você receberá um link de redefinição de senha em instantes.");
          setLoading(false);
        }, 1200);
        return;
      }

      if (isLogin) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Credenciais incorretas");
        
        // Strict portal role verification
        if (isAdminPortal) {
          const isAuthorized = data.user.role === "Super Administrador" || data.user.role === "Administrador";
          if (!isAuthorized) {
            throw new Error("Acesso negado: Este portal administrativo é restrito a Super Administradores e Administradores.");
          }
        } else {
          // If standard portal, check if user is admin. Admins can log in from standard too, but we can allow it.
        }

        onAuthSuccess(data.user);
      } else {
        if (!name) throw new Error("O nome de usuário é obrigatório.");
        
        // If registering inside Admin Portal, show a secure notice
        if (isAdminPortal) {
          throw new Error("O cadastro de novas contas de administrador é restrito. Crie uma conta de Leitor no portal público.");
        }

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
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4 py-12 font-sans selection:bg-amber-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-[#121214] border border-zinc-800 rounded-3xl shadow-2xl shadow-black p-8 md:p-10 relative overflow-hidden"
      >
        {/* Top accent bar matching the portal type */}
        <div className={`absolute top-0 left-0 w-full h-1.5 ${isAdminPortal ? "bg-orange-500" : "bg-amber-500"}`}></div>

        {/* Portal Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className={`w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${isAdminPortal ? "text-orange-500" : "text-amber-500"}`}>
            {isAdminPortal ? <Lock className="w-7 h-7" /> : <BookOpen className="w-7 h-7" />}
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-zinc-100 flex items-center gap-1.5 justify-center">
            BookVerse
            {isAdminPortal && (
              <span className="text-[10px] bg-orange-500/10 text-orange-500 font-bold font-sans py-0.5 px-2 rounded-full border border-orange-500/20">
                ADMIN
              </span>
            )}
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-sans">
            {isAdminPortal 
              ? "Portal de Controle e Gerenciamento Administrativo" 
              : "Sua biblioteca inteligente de audiobooks & PDFs"}
          </p>
        </div>

        {/* Segmented control for Role-based Logins */}
        {isLogin && !isForgot && (
          <div className="mb-6">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 text-center">
              Selecione o seu Perfil de Acesso
            </label>
            <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-900">
              {isAdminPortal ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("super")}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                      selectedRole === "super"
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    }`}
                  >
                    Super Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("admin")}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                      selectedRole === "admin"
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    }`}
                  >
                    Admin Geral
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("leitor")}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                      selectedRole === "leitor"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    }`}
                  >
                    Leitor / Assinante
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("moderador")}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                      selectedRole === "moderador"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    }`}
                  >
                    Moderador
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-900/30 text-red-400 rounded-xl text-xs leading-relaxed font-sans">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 rounded-xl text-xs leading-relaxed font-sans">
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
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-zinc-100 transition"
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
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-zinc-100 transition"
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
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-zinc-100 transition"
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
                      className="text-xs text-amber-500 hover:underline hover:text-amber-400 transition outline-none cursor-pointer"
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
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-zinc-100 transition"
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
            className={`w-full text-zinc-950 rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition mt-6 disabled:opacity-50 cursor-pointer ${
              isAdminPortal 
                ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/10" 
                : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/10"
            }`}
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
                {isAdminPortal ? "Entrar no Painel Admin" : "Entrar no BookVerse"}
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
              className="text-amber-500 hover:underline font-semibold cursor-pointer"
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
              {!isAdminPortal ? (
                <p className="text-zinc-400">
                  {isLogin ? "Não tem uma conta?" : "Já possui conta?"}
                  <button
                    className="text-amber-500 hover:underline font-semibold ml-1 outline-none cursor-pointer"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError("");
                      setMessage("");
                    }}
                  >
                    {isLogin ? "Cadastre-se" : "Faça Login"}
                  </button>
                </p>
              ) : (
                <span className="text-zinc-500 font-medium">Acesso Restrito a Administradores</span>
              )}
            </>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="text-zinc-500 hover:text-zinc-300 font-medium hover:underline cursor-pointer transition mr-2"
              >
                Voltar ao Início
              </button>
            )}
            <div className="flex items-center gap-1.5 text-zinc-500">
              {isAdminPortal ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
                  <span>Ambiente Admin Restrito</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Ambiente Seguro RLS</span>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
