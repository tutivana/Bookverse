import React from "react";
import { motion } from "motion/react";
import { ArrowLeft, Compass, AlertCircle, EyeOff, XCircle, Archive, ShieldAlert } from "lucide-react";
import { Book } from "../types";

interface UnavailableBookScreenProps {
  book: Book;
  onBackToLibrary: () => void;
}

export default function UnavailableBookScreen({ book, onBackToLibrary }: UnavailableBookScreenProps) {
  const status = book.status || "Active";

  const getStatusDetails = () => {
    switch (status) {
      case "Pending Review":
        return {
          icon: <ShieldAlert className="w-12 h-12 text-amber-400" />,
          title: "Livro em revisão",
          message: "Este livro está temporariamente indisponível porque está sendo revisado pela equipe do BookVerse.",
          subMessage: "Seu progresso de leitura foi preservado e você poderá continuar de onde parou assim que ele estiver disponível novamente.",
          buttons: [
            {
              label: "Voltar ao catálogo",
              onClick: onBackToLibrary,
              variant: "primary",
              icon: <ArrowLeft className="w-4 h-4" />,
            },
          ],
        };
      case "Inactive":
        return {
          icon: <EyeOff className="w-12 h-12 text-rose-400" />,
          title: "Livro temporariamente indisponível",
          message: "Este livro foi temporariamente removido da biblioteca.",
          subMessage: "Seu progresso foi salvo e permanecerá disponível caso o livro seja reativado.",
          buttons: [
            {
              label: "Voltar",
              onClick: onBackToLibrary,
              variant: "secondary",
              icon: <ArrowLeft className="w-4 h-4" />,
            },
            {
              label: "Explorar outros livros",
              onClick: onBackToLibrary,
              variant: "primary",
              icon: <Compass className="w-4 h-4" />,
            },
          ],
        };
      case "Rejected":
        return {
          icon: <XCircle className="w-12 h-12 text-red-500" />,
          title: "Livro indisponível",
          message: "Este conteúdo não está mais disponível na plataforma.",
          subMessage: "O histórico de leitura foi preservado, mas o livro não pode mais ser acessado.",
          buttons: [
            {
              label: "Voltar ao catálogo",
              onClick: onBackToLibrary,
              variant: "primary",
              icon: <ArrowLeft className="w-4 h-4" />,
            },
          ],
        };
      case "Archived":
        return {
          icon: <Archive className="w-12 h-12 text-zinc-400" />,
          title: "Livro arquivado",
          message: "Este livro foi retirado do catálogo.",
          subMessage: "Seu progresso continuará armazenado para fins de histórico.",
          buttons: [
            {
              label: "Voltar ao catálogo",
              onClick: onBackToLibrary,
              variant: "primary",
              icon: <ArrowLeft className="w-4 h-4" />,
            },
          ],
        };
      default:
        return {
          icon: <AlertCircle className="w-12 h-12 text-zinc-400" />,
          title: "Livro indisponível",
          message: "Este livro não está acessível no momento.",
          subMessage: "Seu histórico está preservado.",
          buttons: [
            {
              label: "Voltar ao catálogo",
              onClick: onBackToLibrary,
              variant: "primary",
              icon: <ArrowLeft className="w-4 h-4" />,
            },
          ],
        };
    }
  };

  const details = getStatusDetails();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#09090b] flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-[#121214] border border-zinc-800 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-8 items-center"
      >
        {/* Subtle radial ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#e2b874]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Left Side: Grayscale Book Cover Preview */}
        <div className="w-36 h-52 md:w-44 md:h-64 flex-shrink-0 relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-md">
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover grayscale opacity-40 blur-[1px]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/50 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-zinc-950/80 p-3 rounded-full border border-zinc-800/80 shadow-lg">
              {details.icon}
            </div>
          </div>
        </div>

        {/* Right Side: Informative Message */}
        <div className="flex-grow text-center md:text-left flex flex-col justify-between h-full min-w-0">
          <div>
            {/* Status Badges */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border bg-zinc-950 border-zinc-800 text-zinc-400 mb-4">
              BookVerse Info
            </span>

            <h2 className="text-2xl md:text-3xl font-serif font-bold text-zinc-100 tracking-tight leading-tight">
              {details.title}
            </h2>

            <p className="text-sm font-serif font-semibold text-[#e2b874] mt-1.5 truncate">
              {book.title} — {book.author}
            </p>

            <p className="text-zinc-300 text-sm leading-relaxed mt-4">
              {details.message}
            </p>

            <p className="text-zinc-500 text-xs leading-relaxed mt-2.5">
              {details.subMessage}
            </p>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full">
            {details.buttons.map((btn, idx) => (
              <button
                key={idx}
                onClick={btn.onClick}
                className={`flex-1 py-3 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer ${
                  btn.variant === "primary"
                    ? "bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 shadow-md shadow-[#e2b874]/10"
                    : "bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800"
                }`}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
