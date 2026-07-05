import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { CheckCircle, XCircle, Loader2, Plane, Mail } from "lucide-react";
import { authAPI } from "../../../services/api";

type Status = "loading" | "success" | "error" | "waiting";

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [status, setStatus] = useState<Status>(token ? "loading" : "waiting");
  const [message, setMessage] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    authAPI.verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setMessage(err.message || "Lien invalide ou expiré");
        setStatus("error");
      });
  }, [token]);

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    try {
      await authAPI.resendVerification(email);
      setResendDone(true);
    } catch (err: any) {
      setMessage(err.message || "Erreur lors de l'envoi");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Plane className="h-7 w-7 text-white" />
          </div>
          <span className="text-[#0a1628]" style={{ fontWeight: 700, fontSize: "1.4rem" }}>
            Smart<span className="text-blue-500">Travel</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">

          {/* LOADING */}
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 text-blue-500 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Vérification en cours…</h2>
              <p className="text-gray-500 text-sm">Veuillez patienter quelques secondes.</p>
            </>
          )}

          {/* SUCCESS */}
          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Compte activé !</h2>
              <p className="text-gray-500 text-sm mb-6">
                Votre adresse email a été confirmée avec succès. Vous pouvez maintenant vous connecter.
              </p>
              <Link
                to="/login"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                Se connecter
              </Link>
            </>
          )}

          {/* ERROR */}
          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Lien expiré</h2>
              <p className="text-gray-500 text-sm mb-6">
                {message || "Ce lien de confirmation est invalide ou a expiré (24h)."}
              </p>
              {email && !resendDone && (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  {resendLoading ? "Envoi en cours…" : "Renvoyer l'email de confirmation"}
                </button>
              )}
              {resendDone && (
                <p className="text-green-600 font-medium">
                  Un nouvel email a été envoyé ! Vérifiez votre boîte mail.
                </p>
              )}
            </>
          )}

          {/* WAITING (just registered, no token yet) */}
          {status === "waiting" && (
            <>
              <Mail className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Vérifiez votre boîte mail</h2>
              <p className="text-gray-500 text-sm mb-2">
                Un email de confirmation a été envoyé à{" "}
                {email ? <strong>{email}</strong> : "votre adresse email"}.
              </p>
              <p className="text-gray-400 text-xs mb-6">
                Cliquez sur le lien dans l'email pour activer votre compte. Le lien est valable 24 heures.
              </p>
              {email && !resendDone && (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-blue-600 hover:underline text-sm disabled:opacity-50"
                >
                  {resendLoading ? "Envoi en cours…" : "Renvoyer l'email"}
                </button>
              )}
              {resendDone && (
                <p className="text-green-600 text-sm font-medium">Email renvoyé !</p>
              )}
            </>
          )}

        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          <Link to="/login" className="hover:text-blue-600">Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}
