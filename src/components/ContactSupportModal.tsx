import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, HelpCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { User } from "../types";
import { createSupportTicket } from "../lib/api";

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export default function ContactSupportModal({ isOpen, onClose, user }: ContactSupportModalProps) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(user?.name || "");
      setEmail(user?.email || "");
      setSubject("");
      setMessage("");
      setSubmitError("");
      setSubmitSuccess(false);

      // Prevent scrolling of underlying body while modal is open
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setSubmitError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (message.trim().length < 10) {
      setSubmitError("A mensagem deve ter pelo menos 10 caracteres.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await createSupportTicket({
        name,
        email,
        subject,
        message,
        userId: user.id
      });

      if (response.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError("Ocorreu um erro ao enviar sua mensagem. Tente novamente.");
      }
    } catch (err: any) {
      console.error("Support ticket submission failed:", err);
      setSubmitError(err.message || "Erro de conexão ao enviar o chamado de suporte.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const subjectOptions = [
    "Dúvida sobre Assinatura Premium",
    "Problema Técnico / Bug no Leitor",
    "Erro na reprodução de Audiobook",
    "Problema com Leitura Offline",
    "Sugestão de Livros / Conteúdo",
    "Outro Assunto"
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          id="support-modal-overlay"
        />

        {/* Modal content box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full max-w-lg bg-[#0e0e11] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col"
          id="support-modal-container"
        >
          {/* Header area */}
          <div className="px-6 py-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100">Suporte ao Leitor</h2>
                <p className="text-[10px] text-zinc-500 font-medium">Envie sua dúvida ou feedback aos administradores</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body content */}
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            {submitSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-8 space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-base font-bold text-zinc-100">Mensagem Enviada!</h3>
                <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                  Agradecemos seu contato. Sua solicitação foi enviada aos administradores da plataforma e uma notificação de suporte foi gerada. Responderemos em breve no seu e-mail cadastrado.
                </p>
                <button
                  onClick={onClose}
                  className="mt-6 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Fechar Janela
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {submitError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* User Name & Email info (disabled for consistency, or editable) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Nome</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Seu nome"
                      className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-amber-500/50 text-zinc-100 text-xs rounded-xl py-3 px-4 outline-none transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-amber-500/50 text-zinc-100 text-xs rounded-xl py-3 px-4 outline-none transition"
                    />
                  </div>
                </div>

                {/* Subject Selection / Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Assunto</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-amber-500/50 text-zinc-300 text-xs rounded-xl py-3 px-4 outline-none transition cursor-pointer appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgb(113,113,122)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px' }}
                  >
                    <option value="" disabled>Selecione um assunto...</option>
                    {subjectOptions.map((opt, i) => (
                      <option key={i} value={opt} className="bg-zinc-950 text-zinc-300">{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Message TextArea */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Mensagem / Relato</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    placeholder="Descreva detalhadamente o seu problema, dúvida ou feedback técnico. Se for um bug, inclua o livro ou recurso afetado..."
                    className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-amber-500/50 text-zinc-100 text-xs rounded-xl py-3 px-4 outline-none transition resize-none leading-relaxed"
                  />
                </div>

                {/* Footer buttons inside form */}
                <div className="pt-3 border-t border-zinc-900 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3 text-xs font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-amber-500/40 disabled:to-amber-600/40 text-zinc-950 text-xs font-bold rounded-xl shadow-lg hover:shadow-amber-500/5 transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin mr-1" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Enviar Mensagem
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
