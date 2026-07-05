import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { aiAPI } from "../../../../services/api";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Chiffre d'affaires",
  "Réservations en attente",
  "Hôtels à Sousse",
  "Tous les clients",
  "Liste des offres",
];

export function AdminCopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "👋 Bonjour ! Je suis votre co-pilote IA. Je peux gérer l'agence pour vous :\n• Statistiques & chiffre d'affaires\n• Lister/filtrer les réservations\n• Chercher des hôtels\n• Créer un hôtel\n• Confirmer une réservation\n\nQue puis-je faire ?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await aiAPI.adminAssistant(q);
      setMessages(prev => [...prev, { role: "assistant", content: res.reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: "Erreur : " + (e?.message || "service indisponible") }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
          title="Co-pilote IA"
        >
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold text-sm hidden sm:inline">Co-pilote IA</span>
        </button>
      )}

      {/* Fenêtre de chat */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Co-pilote IA</p>
                <p className="text-blue-100 text-[10px]">SmartTravel Admin</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white border border-gray-100 text-gray-700 rounded-bl-sm shadow-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Suggestions */}
          <div className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-gray-100 bg-white">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="text-[11px] px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors border border-blue-100">
                {s}
              </button>
            ))}
          </div>

          {/* Saisie */}
          <div className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
            <input
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") send(); }}
              placeholder="Demandez une action…"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2.5 rounded-xl transition-colors">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
