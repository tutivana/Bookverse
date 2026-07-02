import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Smartphone, 
  Save, 
  Check, 
  HelpCircle, 
  Laptop, 
  PlusCircle, 
  AlertCircle 
} from "lucide-react";
import { User } from "../types";
import { updateNotificationPreferences, registerDeviceToken } from "../lib/api";

interface NotificationSettingsProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

export default function NotificationSettings({ user, onUpdateUser }: NotificationSettingsProps) {
  // Local state for In-App preferences
  const [inApp, setInApp] = useState({
    newBooks: true,
    newAudiobooks: true,
    commentReplies: true,
    bookAvailable: true,
    recommendations: true,
    readingReminders: true,
    platformAnnouncements: true,
    ...(user.preferences?.notifyInApp || {})
  });

  // Local state for Push preferences
  const [push, setPush] = useState({
    newBooks: true,
    newAudiobooks: true,
    commentReplies: true,
    bookAvailable: true,
    recommendations: true,
    readingReminders: true,
    platformAnnouncements: true,
    ...(user.preferences?.notifyPushPrefs || {})
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);

  // Sync state if user changes
  useEffect(() => {
    if (user.preferences?.notifyInApp) {
      setInApp(prev => ({ ...prev, ...user.preferences?.notifyInApp }));
    }
    if (user.preferences?.notifyPushPrefs) {
      setPush(prev => ({ ...prev, ...user.preferences?.notifyPushPrefs }));
    }
  }, [user]);

  const handleInAppChange = (category: string, val: boolean) => {
    setInApp(prev => ({ ...prev, [category]: val }));
    setSaveSuccess(false);
  };

  const handlePushChange = (category: string, val: boolean) => {
    setPush(prev => ({ ...prev, [category]: val }));
    setSaveSuccess(false);
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      await updateNotificationPreferences(user.id, {
        notifyInApp: inApp,
        notifyPushPrefs: push
      });

      // Update user in local context
      const updatedUser: User = {
        ...user,
        preferences: {
          ...user.preferences,
          notifyInApp: inApp,
          notifyPushPrefs: push
        }
      };
      onUpdateUser(updatedUser);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar preferências.");
    } finally {
      setSaving(false);
    }
  };

  // Simulated FCM device registration
  const handleSimulateFCMToken = async () => {
    try {
      setTokenStatus(null);
      // Generate a nice simulated token based on device type
      const deviceTypes = ["iPhone 15 Pro", "Samsung Galaxy S24", "MacBook Pro", "iPad Pro", "Chrome Browser"];
      const chosenDevice = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
      const generatedToken = "fcm_token_" + Math.random().toString(36).substr(2, 9) + "_" + chosenDevice.toLowerCase().replace(/\s+/g, "_");
      
      await registerDeviceToken(user.id, generatedToken);
      
      const updatedUser: User = {
        ...user,
        pushTokens: [...(user.pushTokens || []), generatedToken]
      };
      onUpdateUser(updatedUser);
      setTokenStatus(`Dispositivo "${chosenDevice}" registrado com sucesso no Firebase Cloud Messaging!`);
      setTimeout(() => setTokenStatus(null), 5000);
    } catch (err) {
      console.error(err);
      setTokenStatus("Erro ao registrar dispositivo.");
    }
  };

  // Add custom manual token
  const handleAddManualToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    try {
      setTokenStatus(null);
      await registerDeviceToken(user.id, tokenInput.trim());
      
      const updatedUser: User = {
        ...user,
        pushTokens: [...(user.pushTokens || []), tokenInput.trim()]
      };
      onUpdateUser(updatedUser);
      setTokenStatus("Token personalizado registrado com sucesso!");
      setTokenInput("");
      setTimeout(() => setTokenStatus(null), 4000);
    } catch (err) {
      console.error(err);
      setTokenStatus("Erro ao registrar token personalizado.");
    }
  };

  // Preference definitions
  const categoriesList = [
    { key: "newBooks", label: "Novos Livros", desc: "Avisar quando um novo livro for publicado" },
    { key: "newAudiobooks", label: "Novos Audiobooks", desc: "Avisar quando audiobooks forem adicionados" },
    { key: "commentReplies", label: "Respostas de Comentários", desc: "Notificar quando o autor ou moderador responder seu comentário" },
    { key: "bookAvailable", label: "Disponibilidade de Livros", desc: "Avisar se um livro que você lia voltou a ficar ativo" },
    { key: "recommendations", label: "Recomendações Personalizadas", desc: "Sugestões semanais baseadas no seu perfil de leitura" },
    { key: "readingReminders", label: "Lembretes de Leitura", desc: "Lembrete para manter sua meta diária de leitura ativa" },
    { key: "platformAnnouncements", label: "Comunicados da Plataforma", desc: "Atualizações importantes do sistema e eventos" }
  ];

  return (
    <div className="space-y-8" id="notif-settings-container">
      {/* Intro section */}
      <div className="space-y-2">
        <h4 className="font-serif font-bold text-zinc-100 text-base flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#e2b874]" />
          Central de Preferências de Notificações
        </h4>
        <p className="text-zinc-400 text-xs max-w-xl leading-relaxed">
          Gerencie como e onde você deseja receber alertas do BookVerse. Configure canais de comunicação internos e notificações Push para múltiplos dispositivos.
        </p>
      </div>

      {/* Grid for channel switches */}
      <div className="bg-[#121214] border border-zinc-850 rounded-2xl overflow-hidden p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h5 className="font-bold text-zinc-200 text-sm">Canais & Categorias</h5>
            <p className="text-[10px] text-zinc-500 font-medium">Ative canais internos ou push para cada evento</p>
          </div>
          
          <div className="flex items-center gap-6 text-xs text-zinc-400 font-bold self-end sm:self-center">
            <span className="w-20 text-center">No Aplicativo</span>
            <span className="w-20 text-center">Notificação Push</span>
          </div>
        </div>

        {/* Categories Switches */}
        <div className="space-y-4">
          {categoriesList.map((cat) => (
            <div key={cat.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/40 last:border-none">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-zinc-200">{cat.label}</span>
                <p className="text-[10px] text-zinc-400 font-medium">{cat.desc}</p>
              </div>

              <div className="flex items-center gap-6 self-end sm:self-center">
                {/* In App Checkbox */}
                <div className="w-20 flex justify-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(inApp as any)[cat.key]}
                      onChange={(e) => handleInAppChange(cat.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 peer-checked:after:bg-[#121214] after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e2b874]" />
                  </label>
                </div>

                {/* Push Checkbox */}
                <div className="w-20 flex justify-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(push as any)[cat.key]}
                      onChange={(e) => handlePushChange(cat.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 peer-checked:after:bg-[#121214] after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e2b874]" />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="pt-4 flex items-center justify-between border-t border-zinc-800">
          {saveSuccess ? (
            <div className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5" id="notif-pref-success">
              <Check className="w-4 h-4" />
              Preferências salvas com sucesso!
            </div>
          ) : (
            <div className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              Suas alterações se aplicam instantaneamente
            </div>
          )}

          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 font-bold px-5 py-2.5 rounded-xl text-xs transition active:scale-[0.98] cursor-pointer flex items-center gap-2 disabled:opacity-55"
            id="notif-pref-save"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Preferências"}
          </button>
        </div>
      </div>

      {/* FCM Push Integration Panel */}
      <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-6 space-y-6">
        <div className="space-y-1 pb-4 border-b border-zinc-800">
          <h5 className="font-bold text-zinc-200 text-sm flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#e2b874]" />
            Gerenciamento de Dispositivos (FCM Push)
          </h5>
          <p className="text-[10px] text-zinc-400 font-medium">
            O BookVerse possui integração total com o Firebase Cloud Messaging. Vincule múltiplos tokens para receber alertas instantâneos no celular ou desktop.
          </p>
        </div>

        {tokenStatus && (
          <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            {tokenStatus}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Linked devices list */}
          <div className="space-y-3">
            <span className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Seus Dispositivos Vinculados</span>
            
            {!user.pushTokens || user.pushTokens.length === 0 ? (
              <div className="p-4 bg-zinc-900/40 border border-zinc-800 border-dashed rounded-xl text-center">
                <Smartphone className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <span className="text-[10px] text-zinc-500 font-medium block">Nenhum dispositivo registrado neste perfil</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {user.pushTokens.map((tok, idx) => {
                  const isSimulated = tok.startsWith("fcm_token_");
                  const deviceLabel = isSimulated 
                    ? tok.split("_").slice(3).join(" ").toUpperCase() || "Dispositivo"
                    : "Token Personalizado";
                  return (
                    <div key={idx} className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-2.5">
                        <Laptop className="w-4 h-4 text-zinc-400" />
                        <div>
                          <span className="font-bold text-zinc-200 block text-[11px]">{deviceLabel}</span>
                          <span className="font-mono text-[9px] text-zinc-500 truncate block max-w-[180px]">{tok}</span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-400 text-[8px] font-mono rounded-md shrink-0 border border-emerald-900/30 font-bold">
                        ATIVO
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleSimulateFCMToken}
              className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 font-bold py-3 rounded-xl text-xs transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              id="notif-pref-simulate-token"
            >
              <PlusCircle className="w-4 h-4 text-[#e2b874]" />
              Simular Registro de Dispositivo FCM
            </button>
          </div>

          {/* Manual Token Registration */}
          <div className="space-y-4">
            <span className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Registrar Manualmente um Token</span>
            
            <form onSubmit={handleAddManualToken} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Token do Dispositivo</label>
                <textarea
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-zinc-200 outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-[#e2b874] font-mono resize-none h-20"
                  placeholder="Cole o token FCM obtido pelo SDK do Firebase..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={!tokenInput.trim()}
                className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 font-bold py-3 rounded-xl text-xs transition active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                id="notif-pref-manual-token"
              >
                <Check className="w-4 h-4 text-[#e2b874]" />
                Vincular Token de Push
              </button>
            </form>

            <div className="p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-xl text-[10px] text-zinc-500 flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
              <span>
                As notificações disparadas pelo painel administrativo ou por ações automáticas da plataforma serão enviadas tanto no painel interno quanto em formato Push para todos os tokens vinculados.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
