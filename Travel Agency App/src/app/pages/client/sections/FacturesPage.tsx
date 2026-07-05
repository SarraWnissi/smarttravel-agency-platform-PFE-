import React from "react";
import { FileText, Download } from "lucide-react";
import { ClientPagination, CLIENT_PAGE_SIZE } from "../shared";

interface FacturesPageProps {
  factures: any[];
  reservations: any[];
  paidIds: Set<string>;
  pageFactures: number;
  setPageFactures: (p: number) => void;
  downloadFacturePDF: (f: any) => void;
}

export function FacturesPage({ factures, reservations, paidIds, pageFactures, setPageFactures, downloadFacturePDF }: FacturesPageProps) {
  // IDs de réservations déjà couvertes par une vraie facture DB
  const coveredResIds = new Set(
    factures.map((f: any) => String(f.paiementID?.reservationID?._id ?? f.paiementID?.reservationID ?? ""))
            .filter(Boolean)
  );

  // Factures virtuelles : réservations CONFIRMEE ou payées sans facture DB
  const virtualFactures = reservations
    .filter(r => (r.rawStatut === "CONFIRMEE" || paidIds.has(r.rawId)) && !coveredResIds.has(r.rawId))
    .map(r => ({
      _isVirtual: true,
      _id: `virt-${r.rawId}`,
      _reservation: r,
      montantHT:  +(r.rawMontant / 1.19).toFixed(3),
      montantTTC: r.rawMontant,
      dateEmission: new Date().toISOString(),
    }));

  const allFactures = [...factures, ...virtualFactures];
  const totalPagesFactures = Math.max(1, Math.ceil(allFactures.length / CLIENT_PAGE_SIZE));
  const pagedFactures = allFactures.slice((pageFactures - 1) * CLIENT_PAGE_SIZE, pageFactures * CLIENT_PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-[#0a1628]" style={{ fontWeight: 600 }}>Mes factures</h3>
          <p className="text-xs text-gray-400 mt-0.5">{allFactures.length} facture(s) — réservations confirmées</p>
        </div>
        <FileText className="h-5 w-5 text-gray-300" />
      </div>
      {allFactures.length === 0 ? (
        <div className="p-12 text-center text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Aucune facture pour le moment</p>
          <p className="text-xs mt-1 text-gray-300">Les factures apparaissent dès qu'une réservation est confirmée</p>
        </div>
      ) : (
        <>
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/70">
              {["N° Facture", "Prestation", "Date", "Montant HT", "Montant TTC", "Statut", "PDF"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pagedFactures.map((f: any) => {
              const isVirtual = !!f._isVirtual;
              const vRes = f._reservation;
              const res  = f.paiementID?.reservationID;
              const numero = isVirtual ? `ST-${vRes?.id ?? "—"}` : (f.numeroFacture ?? f._id?.slice(-6)?.toUpperCase() ?? "—");
              const prestation = isVirtual ? (vRes?.destination ?? "Réservation") : (res?.offreID?.titre ?? res?.serviceID?.titre ?? "Réservation");
              const date = isVirtual ? new Date().toLocaleDateString("fr-FR") : (f.dateEmission ? new Date(f.dateEmission).toLocaleDateString("fr-FR") : "—");
              const ht  = isVirtual ? +(Number(vRes?.rawMontant ?? 0) / 1.19).toFixed(3) : (f.montantHT ?? 0);
              const ttc = isVirtual ? Number(vRes?.rawMontant ?? 0) : (f.montantTTC ?? 0);
              return (
                <tr key={f._id} className="hover:bg-blue-50/20">
                  <td className="px-4 py-3 text-gray-700 text-sm font-mono whitespace-nowrap">{numero}</td>
                  <td className="px-4 py-3 text-gray-700 text-sm max-w-[160px] truncate">{prestation}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm whitespace-nowrap">{date}</td>
                  <td className="px-4 py-3 text-gray-700 text-sm whitespace-nowrap">{Number(ht).toLocaleString("fr-FR")} TND</td>
                  <td className="px-4 py-3 text-blue-600 text-sm font-semibold whitespace-nowrap">{Number(ttc).toLocaleString("fr-FR")} TND</td>
                  <td className="px-4 py-3">
                    {isVirtual ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Confirmée</span>
                    ) : f.paiementID?.statut === 'ACCEPTE' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Payée</span>
                    ) : f.paiementID?.statut === 'REFUSE' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Refusée</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">En attente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => downloadFacturePDF(f)}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <div className="px-6 pb-4">
          <ClientPagination page={pageFactures} total={totalPagesFactures} onChange={setPageFactures} />
        </div>
        </>
      )}
    </div>
  );
}
