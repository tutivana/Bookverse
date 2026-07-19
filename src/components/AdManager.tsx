import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Sparkles, X, Shield, Volume2, Award, Zap, AlertCircle, Clock } from "lucide-react";
import { User } from "../types";
import { isUserPremium } from "../lib/subscription";

// 1. Interfaces
interface AdsSettings {
  adsEnabled: boolean;
  maxAdsPerSession: number;
  rewardAdsEnabled: boolean;
}

interface AdContextType {
  settings: AdsSettings;
  sessionAdsCount: number;
  lastAdTime: number;
  isAdActive: boolean;
  activeAd: {
    type: "interstitial" | "rewarded";
    title: string;
    description: string;
    cta: string;
    imageUrl: string;
    onClose: () => void;
    onReward?: () => void;
  } | null;
  triggerInterstitialAd: (onClosed: () => void) => boolean;
  triggerRewardedAd: (onRewarded: () => void, onClosed?: () => void) => void;
  incrementSessionAds: () => void;
  user: User | null;
  premium: boolean;
  bypassFrequencyCheck: boolean;
  setBypassFrequencyCheck: (val: boolean) => void;
}

// Advertisements Mock Templates
const ADS_TEMPLATES = [
  {
    title: "DevPro Academy",
    description: "Torne-se um programador Full-Stack disputado no mercado. Aulas práticas com mentores renomados e foco em portfólio real.",
    cta: "Inscrever-se Grátis",
    imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=400&auto=format&fit=crop"
  },
  {
    title: "Finanças Smart",
    description: "O aplicativo número 1 de controle financeiro pessoal. Economize até 30% do seu salário já no primeiro mês de uso.",
    cta: "Baixar Agora",
    imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=400&auto=format&fit=crop"
  },
  {
    title: "Inglês Fluente",
    description: "Destrave sua conversação com apenas 10 minutos de prática diária. Método exclusivo focado em situações reais do cotidiano.",
    cta: "Experimentar Grátis",
    imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=400&auto=format&fit=crop"
  },
  {
    title: "Café Gourmet Co.",
    description: "Receba em sua casa grãos selecionados das melhores fazendas do país com torra fresca mensal. Assine agora.",
    cta: "Ver Planos",
    imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=400&auto=format&fit=crop"
  }
];

const AdContext = createContext<AdContextType | undefined>(undefined);

// 2. Provider Component
export const AdManagerProvider: React.FC<{ children: React.ReactNode; user: User | null; onUserUpdate?: (updatedUser: User) => void }> = ({
  children,
  user,
  onUserUpdate
}) => {
  const [settings, setSettings] = useState<AdsSettings>({
    adsEnabled: true,
    maxAdsPerSession: 5,
    rewardAdsEnabled: true
  });
  const [sessionAdsCount, setSessionAdsCount] = useState(0);
  const [lastAdTime, setLastAdTime] = useState<number>(0);
  const [activeAd, setActiveAd] = useState<AdContextType["activeAd"]>(null);
  const [bypassFrequencyCheck, setBypassFrequencyCheck] = useState(false);

  const premium = isUserPremium(user);

  // Fetch settings from server on mount
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/ads/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.warn("Failed to load ads settings, using default:", err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const incrementSessionAds = useCallback(() => {
    setSessionAdsCount(prev => prev + 1);
  }, []);

  // 3. Trigger Interstitial Ad (e.g., between chapters, on reading finish, etc.)
  const triggerInterstitialAd = useCallback((onClosed: () => void): boolean => {
    // If premium, do not show ads
    if (premium) {
      onClosed();
      return false;
    }

    // Check if ads are enabled
    if (!settings.adsEnabled) {
      onClosed();
      return false;
    }

    // Check frequency (10 minutes minimum interval between ads, unless bypassed)
    const now = Date.now();
    const minInterval = 10 * 60 * 1000; // 10 minutes
    if (!bypassFrequencyCheck && lastAdTime > 0 && (now - lastAdTime) < minInterval) {
      console.log(`[AdManager] Ad frequency limited. Next ad allowed in ${Math.ceil((minInterval - (now - lastAdTime)) / 1000)}s`);
      onClosed();
      return false;
    }

    // Check session limit
    if (sessionAdsCount >= settings.maxAdsPerSession) {
      console.log(`[AdManager] Max ads per session (${settings.maxAdsPerSession}) reached.`);
      onClosed();
      return false;
    }

    // Load random ad
    const randomAd = ADS_TEMPLATES[Math.floor(Math.random() * ADS_TEMPLATES.length)];
    
    setActiveAd({
      type: "interstitial",
      title: randomAd.title,
      description: randomAd.description,
      cta: randomAd.cta,
      imageUrl: randomAd.imageUrl,
      onClose: () => {
        setLastAdTime(Date.now());
        setSessionAdsCount(prev => prev + 1);
        setActiveAd(null);
        onClosed();
      }
    });

    return true;
  }, [premium, settings, lastAdTime, sessionAdsCount, bypassFrequencyCheck]);

  // 4. Trigger Rewarded Ad
  const triggerRewardedAd = useCallback((onRewarded: () => void, onClosed?: () => void) => {
    // If premium, award benefits instantly without ad
    if (premium) {
      onRewarded();
      return;
    }

    const randomAd = ADS_TEMPLATES[Math.floor(Math.random() * ADS_TEMPLATES.length)];

    setActiveAd({
      type: "rewarded",
      title: `${randomAd.title} - Patrocinador`,
      description: randomAd.description,
      cta: randomAd.cta,
      imageUrl: randomAd.imageUrl,
      onClose: () => {
        setActiveAd(null);
        if (onClosed) onClosed();
      },
      onReward: async () => {
        try {
          // Call backend to trigger reward
          const res = await fetch("/api/ads/reward", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user?.id || "demo-user", type: "temporary_premium" })
          });
          if (res.ok) {
            const data = await res.json();
            if (onUserUpdate && data.user) {
              onUserUpdate(data.user);
            }
          }
        } catch (err) {
          console.error("Failed to grant reward on backend:", err);
        }
        
        onRewarded();
        setActiveAd(null);
      }
    });
  }, [premium, user, onUserUpdate]);

  return (
    <AdContext.Provider
      value={{
        settings,
        sessionAdsCount,
        lastAdTime,
        isAdActive: activeAd !== null,
        activeAd,
        triggerInterstitialAd,
        triggerRewardedAd,
        incrementSessionAds,
        user,
        premium,
        bypassFrequencyCheck,
        setBypassFrequencyCheck
      }}
    >
      {children}

      {/* Ad overlay presentation */}
      <AnimatePresence>
        {activeAd && (
          <AdModalOverlay ad={activeAd} />
        )}
      </AnimatePresence>
    </AdContext.Provider>
  );
};

// 5. Hook definition
export const useAdManager = () => {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error("useAdManager must be used within an AdManagerProvider");
  }
  return context;
};

// 6. Fullscreen Ad Presentation Component
const AdModalOverlay: React.FC<{ ad: NonNullable<AdContextType["activeAd"]> }> = ({ ad }) => {
  const [countdown, setCountdown] = useState(ad.type === "rewarded" ? 10 : 5);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanClose(true);
    }
  }, [countdown]);

  const handleClose = () => {
    if (canClose) {
      ad.onClose();
    }
  };

  const handleCollectReward = () => {
    if (countdown === 0 && ad.onReward) {
      ad.onReward();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#121214] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
        
        {/* Banner with Loading overlay / video play mockup */}
        <div className="aspect-video relative overflow-hidden bg-zinc-950">
          <img 
            src={ad.imageUrl} 
            alt={ad.title} 
            className="w-full h-full object-cover opacity-85"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/60 flex flex-col justify-between p-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] bg-amber-500 text-black font-black tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                <Volume2 className="w-3 h-3" />
                ANÚNCIO
              </span>
              <div className="bg-black/75 backdrop-blur-sm px-3 py-1 rounded-full border border-zinc-800 text-xs font-mono text-zinc-100">
                {countdown > 0 ? (
                  <span>Fechar em {countdown}s</span>
                ) : (
                  <span className="text-emerald-400 font-bold">Pronto</span>
                )}
              </div>
            </div>

            {/* Video Mock Playback pulse */}
            <div className="self-center w-12 h-12 bg-white/20 border border-white/40 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse">
              <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
            </div>

            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" />
              Patrocinado por {ad.title}
            </div>
          </div>
        </div>

        {/* Ad Metadata & Content */}
        <div className="p-6 flex-grow flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xl font-serif font-bold text-zinc-100 flex items-center gap-2">
              {ad.title}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {ad.description}
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-zinc-800 flex gap-3">
            {ad.type === "rewarded" ? (
              <button
                disabled={countdown > 0}
                onClick={handleCollectReward}
                className={`flex-1 font-bold h-12 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
                  countdown > 0
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 active:scale-95"
                }`}
              >
                <Award className="w-5 h-5" />
                {countdown > 0 ? "Assista até o fim para resgatar" : "Resgatar Recompensa Premium"}
              </button>
            ) : (
              <a
                href="#learn-more"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Anúncio demonstrativo do patrocinador!");
                }}
                className="flex-1 bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 text-sm font-bold h-12 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {ad.cta}
              </a>
            )}

            {/* Close button for interstitials or skip rewarded */}
            {ad.type === "interstitial" && (
              <button
                disabled={countdown > 0}
                onClick={handleClose}
                className={`w-12 h-12 border rounded-xl flex items-center justify-center transition ${
                  countdown > 0
                    ? "border-zinc-800 bg-zinc-900/50 text-zinc-600 cursor-not-allowed"
                    : "border-zinc-700 hover:border-zinc-600 bg-zinc-900 text-zinc-300 active:scale-95 cursor-pointer"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// 7. Native Ads Card Component for Book Lists
interface NativeBookAdProps {
  index: number;
}
export const NativeBookAd: React.FC<NativeBookAdProps> = ({ index }) => {
  const { premium, settings } = useAdManager();
  
  if (premium || !settings.adsEnabled) return null;

  // Pick a stable template based on index so it doesn't flicker on re-renders
  const adTemplate = ADS_TEMPLATES[index % ADS_TEMPLATES.length];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="group bg-[#151518] border border-dashed border-zinc-800 hover:border-[#e2b874]/50 rounded-2xl overflow-hidden shadow-md flex flex-col h-full relative"
      id={`native-book-ad-${index}`}
    >
      <div className="aspect-[3/4] relative bg-zinc-950 overflow-hidden border-b border-zinc-800 flex items-center justify-center">
        <img
          src={adTemplate.imageUrl}
          alt={adTemplate.title}
          className="w-full h-full object-cover opacity-80 group-hover:scale-102 transition duration-500"
          referrerPolicy="no-referrer"
        />
        
        {/* Ad Tag overlay */}
        <div className="absolute top-3 left-3 flex gap-1 items-center z-10">
          <div className="bg-[#e2b874] text-[#09090b] text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-md">
            <Volume2 className="w-2.5 h-2.5 fill-current" />
            <span>PUBLICIDADE</span>
          </div>
        </div>

        <div className="absolute bottom-3 right-3 bg-zinc-900/90 backdrop-blur-sm text-zinc-400 px-2.5 py-1 rounded-lg text-[9px] font-mono border border-zinc-800 shadow-sm">
          Patrocinado
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <span className="text-[10px] text-[#e2b874] font-semibold tracking-wider uppercase block mb-1">
            Recomendado para você
          </span>
          <h3 className="font-serif font-bold text-base text-zinc-100 group-hover:text-[#e2b874] transition leading-snug line-clamp-1">
            {adTemplate.title}
          </h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed mt-1.5 mb-4 line-clamp-3">
            {adTemplate.description}
          </p>
        </div>

        <div className="pt-2 border-t border-zinc-800/80">
          <button
            onClick={() => alert("Anúncio promocional!")}
            className="w-full bg-[#e2b874]/15 hover:bg-[#e2b874]/25 border border-[#e2b874]/30 hover:border-[#e2b874]/50 text-[#e2b874] text-xs font-bold h-10 rounded-xl flex items-center justify-center gap-1 transition active:scale-[0.98] cursor-pointer"
          >
            <span>{adTemplate.cta}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};


// 8. Rewarded Ad Button to unlock temporal benefits
export const RewardedAdButton: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { premium, settings, triggerRewardedAd, bypassFrequencyCheck, setBypassFrequencyCheck } = useAdManager();
  const [successMessage, setSuccessMessage] = useState(false);

  if (premium) {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-3">
        <Shield className="w-5 h-5 text-amber-500 animate-pulse" />
        <div>
          <p className="text-xs font-bold text-amber-400">Plano Premium Ativo</p>
          <p className="text-[11px] text-zinc-400">Sua experiência já está 100% livre de anúncios.</p>
        </div>
      </div>
    );
  }

  if (!settings.rewardAdsEnabled) return null;

  const handleWatchAd = () => {
    triggerRewardedAd(() => {
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 8000);
    });
  };

  return (
    <div className={`bg-[#121214] border border-zinc-800 p-5 rounded-2xl flex flex-col gap-4 ${className}`} id="rewarded-ad-container">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
          <Award className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
            Desbloquear Acesso Premium Temporário
            <span className="text-[9px] bg-amber-500 text-black font-black px-1.5 py-0.5 rounded">GRÁTIS</span>
          </h4>
          <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
            Assista a um vídeo promocional curto para liberar 1 hora completa de assinatura Premium (incluindo narração de áudio e downloads).
          </p>
        </div>
      </div>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2"
        >
          <Zap className="w-4 h-4 shrink-0" />
          <span>Sucesso! 1 hora de acesso Premium liberado! Desfrute sem anúncios, com áudio e downloads offline.</span>
        </motion.div>
      )}

      <div className="flex gap-2 justify-between items-center pt-2 border-t border-zinc-900">
        <div className="flex items-center gap-2">
          <input
            id="bypass-freq"
            type="checkbox"
            checked={bypassFrequencyCheck}
            onChange={(e) => setBypassFrequencyCheck(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-zinc-800 text-amber-500 focus:ring-amber-500 bg-zinc-900"
          />
          <label htmlFor="bypass-freq" className="text-[10px] text-zinc-500 cursor-pointer flex items-center gap-1">
            <Clock className="w-3 h-3 text-zinc-500" />
            Remover limite de tempo de anúncio (modo de teste)
          </label>
        </div>
        <button
          onClick={handleWatchAd}
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-sm"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Assistir Anúncio</span>
        </button>
      </div>
    </div>
  );
};


// 9. Premium Checker component
export const PremiumChecker: React.FC = () => {
  const { premium, sessionAdsCount, lastAdTime, settings } = useAdManager();

  return (
    <div className="bg-[#121214] border border-zinc-800 p-5 rounded-2xl" id="premium-checker-banner">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <Shield className={`w-4 h-4 ${premium ? "text-amber-400" : "text-zinc-500"}`} />
          Status do Sistema de Monetização
        </h4>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
          premium 
            ? "bg-amber-400/10 border border-amber-400/20 text-amber-400" 
            : "bg-zinc-800 text-zinc-400"
        }`}>
          {premium ? "USUÁRIO PREMIUM" : "CONTA GRATUITA"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-mono">
        <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900">
          <p className="text-zinc-500 text-[9px] uppercase tracking-wider">Anúncios no Aplicativo</p>
          <p className="text-sm font-bold mt-1 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${!premium && settings.adsEnabled ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
            {!premium && settings.adsEnabled ? "Ativos para você" : "Inativos / Bloqueados"}
          </p>
        </div>

        <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900">
          <p className="text-zinc-500 text-[9px] uppercase tracking-wider">Exibidos Nesta Sessão</p>
          <p className="text-sm font-bold mt-1 text-zinc-100">
            {premium ? "0 (Sem limites)" : `${sessionAdsCount} / ${settings.maxAdsPerSession}`}
          </p>
        </div>
      </div>

      {!premium && (
        <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span>Usuários gratuitos ajudam a manter a plataforma ativa através de publicidades em pontos não intrusivos. Tornar-se <strong>Premium</strong> remove imediatamente todo o sistema de anúncios.</span>
        </p>
      )}
    </div>
  );
};
