import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Check, X, Shield, Lock, CreditCard, ChevronRight, HelpCircle, AlertCircle, Headphones, Download, BarChart2, Smartphone, DollarSign, Wallet } from "lucide-react";
import { User } from "../types";

interface PremiumPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: (updatedUser: User) => void;
  initialReason?: "audiobook" | "offline" | "premium_book" | "stats" | "highlights" | "generic";
}

export default function PremiumPaywallModal({
  isOpen,
  onClose,
  userId,
  onSuccess,
  initialReason = "generic"
}: PremiumPaywallModalProps) {
  const [step, setStep] = useState<"paywall" | "checkout" | "success">("paywall");
  const [selectedInterval, setSelectedInterval] = useState<"monthly" | "yearly">("monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Dynamic Pricing loaded from backend (Default to USD $)
  const [prices, setPrices] = useState<{ monthly: number; yearly: number }>({ monthly: 9.99, yearly: 89.99 });

  // Suggested Payment Methods
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal" | "gplay" | "crypto">("card");

  // Simulated Card Info
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("123");

  // Simulated PayPal Info
  const [paypalEmail, setPaypalEmail] = useState("");

  // Simulated Crypto Info
  const [cryptoTx, setCryptoTx] = useState("");
  const cryptoWallet = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

  useEffect(() => {
    if (isOpen) {
      // Fetch current admin-configured pricing from server
      fetch("/api/billing/prices")
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data.monthly === "number" && typeof data.yearly === "number") {
            setPrices(data);
          }
        })
        .catch((err) => console.error("Error fetching dynamic subscription prices:", err));

      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const reasons = {
    generic: "Aproveite a melhor experiência literária digital com o BookVerse Premium.",
    audiobook: "A reprodução de Audiobooks é exclusiva para assinantes Premium.",
    offline: "O download para leitura offline é exclusivo para assinantes Premium.",
    premium_book: "Esta obra faz parte do catálogo Premium exclusivo para assinantes.",
    stats: "Estatísticas avançadas de progresso de leitura são exclusivas para assinantes Premium.",
    highlights: "Usuários do plano gratuito têm limite de 3 destaques por livro. Remova esse limite com o Premium!"
  };

  const benefits = [
    {
      title: "Catálogo Premium Completo",
      desc: "Acesso ilimitado a centenas de obras clássicas, acadêmicas e contemporâneas.",
      icon: <Sparkles className="w-5 h-5 text-[#e2b874]" />
    },
    {
      title: "Audiobooks Narrados por IA",
      desc: "Escute seus livros preferidos com player inteligente de áudio sincronizado.",
      icon: <Headphones className="w-5 h-5 text-[#e2b874]" />
    },
    {
      title: "Downloads & Leitura Offline",
      desc: "Baixe qualquer livro e continue lendo mesmo sem conexão com a internet.",
      icon: <Download className="w-5 h-5 text-[#e2b874]" />
    },
    {
      title: "Estatísticas Avançadas",
      desc: "Monitore suas metas, tempo de leitura diário e recordes pessoais detalhadamente.",
      icon: <BarChart2 className="w-5 h-5 text-[#e2b874]" />
    }
  ];

  const handleSubscribe = async () => {
    if (step === "paywall") {
      setStep("checkout");
      return;
    }

    // Input Validation based on selected payment method
    if (paymentMethod === "card" && !cardName.trim()) {
      setErrorMsg("Nome impresso no cartão é obrigatório.");
      return;
    }

    if (paymentMethod === "paypal" && !paypalEmail.includes("@")) {
      setErrorMsg("Insira um e-mail válido para a sua conta PayPal.");
      return;
    }

    if (paymentMethod === "crypto" && !cryptoTx.trim()) {
      setErrorMsg("Insira o Hash de transação TXID para confirmação.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // Build dynamic payment description string
      let paymentDetails = "";
      if (paymentMethod === "card") {
        const last4 = cardNumber.replace(/\s/g, "").slice(-4) || "4242";
        const brand = cardNumber.startsWith("5") ? "Mastercard" : "Visa";
        paymentDetails = `Cartão ${brand} final **** ${last4} (${cardName})`;
      } else if (paymentMethod === "paypal") {
        paymentDetails = `PayPal: ${paypalEmail}`;
      } else if (paymentMethod === "gplay") {
        paymentDetails = `Google / Apple Pay Autorizado via Token`;
      } else if (paymentMethod === "crypto") {
        paymentDetails = `USDC Cripto (Tx: ${cryptoTx.substring(0, 10)}...)`;
      }

      // Submit the solicitation to the administrator queue
      const res = await fetch("/api/billing/request-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          billingInterval: selectedInterval,
          paymentMethod,
          paymentDetails
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao processar solicitação");
      }

      setStep("success");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro de conexão ao processar sua solicitação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#09090b]/80 backdrop-blur-md">
      {/* Modal Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-2xl bg-[#121214] border border-zinc-800 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] text-zinc-100"
      >
        {/* Top bar with close button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="p-1.5 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800/60 rounded-full transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === "paywall" && (
            <motion.div
              key="paywall"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="p-6 md:p-8 flex flex-col"
            >
              {/* Header Gilded Sparkles */}
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#e2b874] uppercase tracking-wider bg-[#e2b874]/5 py-1 px-3 rounded-full self-start">
                <Sparkles className="w-3.5 h-3.5" />
                <span>BookVerse Premium</span>
              </div>

              <h2 className="font-serif font-bold text-2xl md:text-3xl tracking-tight text-white mb-2">
                Potencialize seus Hábitos de Leitura
              </h2>
              <p className="text-sm text-zinc-400 mb-6">
                {reasons[initialReason]}
              </p>

              {/* Benefits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {benefits.map((b, idx) => (
                  <div key={idx} className="flex gap-3 p-3 bg-zinc-900/40 rounded-2xl border border-zinc-850">
                    <div className="flex-shrink-0 p-2 bg-zinc-900 border border-zinc-800 text-[#e2b874] rounded-xl flex items-center justify-center h-10 w-10">
                      {b.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">{b.title}</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Plans Selection (Default to USD $) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Monthly */}
                <div
                  onClick={() => setSelectedInterval("monthly")}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedInterval === "monthly"
                      ? "bg-[#e2b874]/5 border-[#e2b874] text-white"
                      : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Mensal</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedInterval === "monthly" ? "border-[#e2b874]" : "border-zinc-700"
                    }`}>
                      {selectedInterval === "monthly" && <div className="w-2 h-2 bg-[#e2b874] rounded-full" />}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-serif font-bold text-white">${prices.monthly.toFixed(2)}</span>
                    <span className="text-[11px] text-zinc-500">/ mês</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">Cancele quando quiser (Moeda: Dólar Americano)</p>
                </div>

                {/* Yearly */}
                <div
                  onClick={() => setSelectedInterval("yearly")}
                  className={`p-4 rounded-2xl border relative transition-all cursor-pointer ${
                    selectedInterval === "yearly"
                      ? "bg-[#e2b874]/5 border-[#e2b874] text-white"
                      : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="absolute top-2.5 right-3 bg-[#e2b874] text-zinc-950 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                    ECONOMIZE 25%
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Anual</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedInterval === "yearly" ? "border-[#e2b874]" : "border-zinc-700"
                    }`}>
                      {selectedInterval === "yearly" && <div className="w-2 h-2 bg-[#e2b874] rounded-full" />}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-serif font-bold text-white">${prices.yearly.toFixed(2)}</span>
                    <span className="text-[11px] text-zinc-500">/ ano</span>
                  </div>
                  <p className="text-[10px] text-[#e2b874] mt-1 font-bold">Equivale a ${(prices.yearly / 12).toFixed(2)} / mês</p>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleSubscribe}
                className="w-full py-3.5 bg-[#e2b874] hover:bg-[#d6aa63] text-zinc-950 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
              >
                <span>Escolher plano e prosseguir</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-zinc-500 text-center mt-3 flex items-center justify-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Sua solicitação será enviada para aprovação do administrador</span>
              </p>
            </motion.div>
          )}

          {step === "checkout" && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="p-6 md:p-8"
            >
              <h3 className="font-serif font-bold text-xl text-white mb-1">Solicitar Assinatura Premium</h3>
              <p className="text-xs text-zinc-400 mb-5">
                Você escolheu o plano <strong className="text-white">{selectedInterval === "yearly" ? `Premium Anual ($ ${prices.yearly.toFixed(2)})` : `Premium Mensal ($ ${prices.monthly.toFixed(2)})`}</strong>.
              </p>

              {/* Suggested Payment Methods tabs selector */}
              <div className="mb-5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Selecione a Forma de Pagamento sugerida</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod("card"); setErrorMsg(""); }}
                    className={`py-2 px-1 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      paymentMethod === "card"
                        ? "bg-[#e2b874]/10 border-[#e2b874] text-[#e2b874]"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-750"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Cartão</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPaymentMethod("paypal"); setErrorMsg(""); }}
                    className={`py-2 px-1 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      paymentMethod === "paypal"
                        ? "bg-[#e2b874]/10 border-[#e2b874] text-[#e2b874]"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-750"
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>PayPal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPaymentMethod("gplay"); setErrorMsg(""); }}
                    className={`py-2 px-1 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      paymentMethod === "gplay"
                        ? "bg-[#e2b874]/10 border-[#e2b874] text-[#e2b874]"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-750"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Google/Apple</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPaymentMethod("crypto"); setErrorMsg(""); }}
                    className={`py-2 px-1 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      paymentMethod === "crypto"
                        ? "bg-[#e2b874]/10 border-[#e2b874] text-[#e2b874]"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-750"
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Cripto</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Forms based on selection */}
              <div className="space-y-4 mb-6">
                
                {paymentMethod === "card" && (
                  <div className="space-y-4">
                    {/* Credit card graphic element */}
                    <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 p-5 rounded-2xl border border-zinc-750 shadow-md text-zinc-300 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#e2b874]/5 rounded-full blur-2xl" />
                      <div className="flex justify-between items-start mb-6">
                        <span className="text-[10px] uppercase font-bold text-[#e2b874] tracking-wider">Cartão de Crédito</span>
                        <Lock className="w-4 h-4 text-[#e2b874]" />
                      </div>
                      <div className="text-lg font-mono mb-4 text-white tracking-widest">{cardNumber}</div>
                      <div className="flex justify-between text-xs">
                        <div>
                          <div className="text-[9px] text-zinc-500 uppercase">Titular</div>
                          <div className="font-bold truncate max-w-[150px]">{cardName || "SEU NOME IMPRESSO"}</div>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <div className="text-[9px] text-zinc-500 uppercase">Validade</div>
                            <div className="font-mono">{cardExpiry}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-zinc-500 uppercase">CVC</div>
                            <div className="font-mono">{cardCvc}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Form Inputs */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Nome no Cartão</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                        placeholder="JOÃO SILVA"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#e2b874] outline-none transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Número do Cartão</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4242 4242 4242 4242"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#e2b874] outline-none transition font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Expiração</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="12/28"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2.5 text-xs text-white text-center focus:border-[#e2b874] outline-none transition font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">CVC</label>
                          <input
                            type="text"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value)}
                            placeholder="123"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2.5 text-xs text-white text-center focus:border-[#e2b874] outline-none transition font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === "paypal" && (
                  <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                      <DollarSign className="w-5 h-5" />
                      <span>PayPal Direct Upgrade</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Sua solicitação de ativação será processada em USD. Insira o endereço de e-mail associado à sua conta PayPal para vincularmos à aprovação.
                    </p>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">E-mail do PayPal</label>
                      <input
                        type="email"
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                        placeholder="seu-paypal@email.com"
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#e2b874] outline-none transition"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === "gplay" && (
                  <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
                      <Smartphone className="w-5 h-5" />
                      <span>Google Pay / Apple Pay</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed max-w-md mx-auto">
                      Ativação expressa de 1 clique. O BookVerse solicitará a aprovação de débito em sua carteira digital ativa no dispositivo na moeda padrão USD ($).
                    </p>
                    <div className="py-2 inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-emerald-500/20">
                      Dispositivo Prontificado para Google/Apple Pay
                    </div>
                  </div>
                )}

                {paymentMethod === "crypto" && (
                  <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                      <Wallet className="w-5 h-5" />
                      <span>USDC Cripto (Ethereum ERC-20)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Envie o valor exato correspondente em USDC (ERC-20) para o endereço abaixo e insira o hash de transação (TXID) para validação do administrador.
                    </p>
                    <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 select-all font-mono text-[10px] text-amber-200/95 text-center break-all">
                      {cryptoWallet}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Hash de Transação (TXID)</label>
                      <input
                        type="text"
                        value={cryptoTx}
                        onChange={(e) => setCryptoTx(e.target.value)}
                        placeholder="0x9a83d..."
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#e2b874] outline-none transition font-mono"
                      />
                    </div>
                  </div>
                )}

              </div>

              {errorMsg && (
                <div className="flex gap-2 p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("paywall")}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs font-bold rounded-2xl border border-zinc-850 transition cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSubscribe}
                  disabled={isSubmitting}
                  className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Processando solicitação...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirmar Solicitação ($ USD)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 text-center flex flex-col items-center justify-center"
            >
              <div className="w-16 h-16 bg-[#e2b874]/10 border border-[#e2b874]/40 rounded-full flex items-center justify-center text-[#e2b874] mb-4 shadow-lg animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>

              <h3 className="font-serif font-bold text-2xl text-white mb-2">Solicitação Enviada!</h3>
              <p className="text-xs text-zinc-400 max-w-md leading-relaxed mb-6">
                Sua solicitação de ativação do plano Premium com a forma de pagamento selecionada foi enviada com sucesso em dólares americanos (USD). Aguarde a validação e liberação automática por parte de nossa equipe de administradores.
              </p>

              <button
                onClick={onClose}
                className="px-8 py-3 bg-[#e2b874] hover:bg-[#d6aa63] text-zinc-950 text-xs font-bold rounded-xl transition cursor-pointer shadow-md"
              >
                Voltar à Biblioteca
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
