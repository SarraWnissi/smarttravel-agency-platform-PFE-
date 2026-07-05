import React, { useState } from "react";
import { FileText, Download, DollarSign, Calendar, Users, CheckCircle, Plane, TrendingUp } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RapportsProps {
  reservations: any[];
  users: any[];
  offres: any[];
  mappedReservations: any[];
  mappedUsers: any[];
  mappedOffres: any[];
  totalRevenu: number;
  clientsActifs: number;
  chartData: any[];
}

export function RapportsPage({
  reservations, users, offres,
  mappedReservations, mappedUsers, mappedOffres,
  totalRevenu, clientsActifs, chartData,
}: RapportsProps) {
  const [generating, setGenerating] = useState(false);

  const confirmes = reservations.filter((r) => r.statut === "CONFIRMEE").length;
  const enAttente = reservations.filter((r) => r.statut === "EN_ATTENTE_PAIEMENT").length;
  const annulees = reservations.filter((r) => r.statut === "ANNULEE").length;
  const tauxConfirmation = reservations.length > 0
    ? Math.round((confirmes / reservations.length) * 100)
    : 0;
  const revenuMoyen = reservations.length > 0
    ? Math.round(totalRevenu / reservations.length)
    : 0;

  const generatePDF = async () => {
    setGenerating(true);
    // jsPDF ne supporte pas l'espace insécable de toLocaleString("fr-FR")
    const fmtPDF = (n: number) =>
      Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " TND";
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const now = new Date();
      const dateStr = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
      const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

      // ── En-tête ──
      doc.setFillColor(8, 15, 30);
      doc.rect(0, 0, pageW, 38, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("SmartTravel", 14, 16);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(147, 197, 253);
      doc.text("ADMIN PANEL", 14, 22);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("RAPPORT ADMINISTRATEUR", pageW / 2, 16, { align: "center" });

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(203, 213, 225);
      doc.text(`Généré le ${dateStr} à ${timeStr}`, pageW / 2, 23, { align: "center" });

      doc.setFontSize(8);
      doc.setTextColor(147, 197, 253);
      doc.text(`Période : données en temps réel`, pageW - 14, 16, { align: "right" });
      doc.text(`Référence : RPT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`, pageW - 14, 22, { align: "right" });

      let y = 48;

      // ── Section 1 : KPIs ──
      doc.setTextColor(8, 15, 30);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("1. Indicateurs clés de performance", 14, y);
      y += 2;
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.8);
      doc.line(14, y + 1, 80, y + 1);
      y += 7;

      const kpis = [
        { label: "Chiffre d'affaires total", value: fmtPDF(totalRevenu), color: [37, 99, 235] as [number,number,number] },
        { label: "Total réservations", value: String(reservations.length), color: [99, 102, 241] as [number,number,number] },
        { label: "Clients enregistrés", value: String(users.length), color: [8, 22, 40] as [number,number,number] },
        { label: "Clients actifs", value: String(clientsActifs), color: [5, 150, 105] as [number,number,number] },
        { label: "Offres disponibles", value: String(offres.length), color: [37, 99, 235] as [number,number,number] },
        { label: "Revenu moyen/réservation", value: fmtPDF(revenuMoyen), color: [99, 102, 241] as [number,number,number] },
      ];

      const colW = (pageW - 28) / 3;
      kpis.forEach((kpi, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 14 + col * (colW + 2);
        const cardY = y + row * 24;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, cardY, colW, 21, 3, 3, "F");
        doc.setDrawColor(...kpi.color);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, cardY, colW, 21, 3, 3, "S");

        doc.setFillColor(...kpi.color);
        doc.roundedRect(x, cardY, 3, 21, 1.5, 1.5, "F");

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(kpi.label.toUpperCase(), x + 6, cardY + 8);

        doc.setTextColor(...kpi.color);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(kpi.value, x + 6, cardY + 16);
      });
      y += Math.ceil(kpis.length / 3) * 24 + 10;

      // ── Section 2 : Réservations par statut ──
      doc.setTextColor(8, 15, 30);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("2. Analyse des réservations", 14, y);
      y += 2;
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.8);
      doc.line(14, y + 1, 80, y + 1);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [["Statut", "Nombre", "% du total"]],
        body: [
          ["Confirmées", String(confirmes), `${reservations.length > 0 ? Math.round(confirmes/reservations.length*100) : 0}%`],
          ["En attente de paiement", String(enAttente), `${reservations.length > 0 ? Math.round(enAttente/reservations.length*100) : 0}%`],
          ["Annulées", String(annulees), `${reservations.length > 0 ? Math.round(annulees/reservations.length*100) : 0}%`],
          ["TOTAL", String(reservations.length), "100%"],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [8, 15, 30], textColor: 255, fontStyle: "bold", fontSize: 9 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30, halign: "center" }, 2: { cellWidth: 30, halign: "center" } },
        bodyStyles: { textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        footStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
        rowPageBreak: "avoid",
        didParseCell: (data: any) => {
          if (data.section === "body") {
            if (data.row.index === 3) {
              data.cell.styles.fillColor = [239, 246, 255];
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.textColor = [37, 99, 235];
            } else if (data.column.index === 0) {
              const val = data.cell.raw as string;
              if (val === "Confirmées") data.cell.styles.textColor = [5, 150, 105];
              else if (val === "En attente de paiement") data.cell.styles.textColor = [161, 98, 7];
              else if (val === "Annulées") data.cell.styles.textColor = [185, 28, 28];
            }
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ── Section 3 : Tableau des réservations ──
      doc.addPage();
      y = 20;

      doc.setFillColor(8, 15, 30);
      doc.rect(0, 0, pageW, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("RAPPORT SMARTTRAVEL — RÉSERVATIONS", pageW / 2, 8, { align: "center" });

      doc.setTextColor(8, 15, 30);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("3. Détail des réservations", 14, y);
      y += 2;
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.8);
      doc.line(14, y + 1, 80, y + 1);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [["Référence", "Client", "Destination", "Période", "Montant", "Statut"]],
        body: mappedReservations.map((r) => [r.id, r.client, r.destination, r.periodeLabel || r.dateCreation || "—", fmtPDF(r.montantRaw ?? 0), r.statut]),
        styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
        headStyles: { fillColor: [8, 15, 30], textColor: 255, fontStyle: "bold", fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20, halign: "center" },
          1: { cellWidth: 38 },
          2: { cellWidth: 38 },
          3: { cellWidth: 22, halign: "center" },
          4: { cellWidth: 28, halign: "right" },
          5: { cellWidth: 22, halign: "center" },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        bodyStyles: { textColor: [50, 50, 50] },
        didParseCell: (data: any) => {
          if (data.section === "body" && data.column.index === 5) {
            const v = data.cell.raw as string;
            if (v === "Confirmée") data.cell.styles.textColor = [5, 150, 105];
            else if (v === "En attente") data.cell.styles.textColor = [161, 98, 7];
            else if (v === "Annulée") data.cell.styles.textColor = [185, 28, 28];
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 12;

      // ── Section 4 : Offres ──
      if (y > 220) { doc.addPage(); y = 20; }

      doc.setTextColor(8, 15, 30);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("4. Offres & Services", 14, y);
      y += 2;
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.8);
      doc.line(14, y + 1, 60, y + 1);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [["Titre de l'offre", "Prix / pers.", "Nbre réservations", "Statut"]],
        body: mappedOffres.map((o) => [o.destination, fmtPDF(o.prixRaw ?? 0), String(o.reservations), o.statut]),
        styles: { fontSize: 8.5, cellPadding: 3 },
        headStyles: { fillColor: [8, 15, 30], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 35, halign: "right" },
          2: { cellWidth: 35, halign: "center" },
          3: { cellWidth: 25, halign: "center" },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        bodyStyles: { textColor: [50, 50, 50] },
        didParseCell: (data: any) => {
          if (data.section === "body" && data.column.index === 3) {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 12;

      // ── Section 5 : Clients ──
      doc.addPage();
      y = 20;

      doc.setFillColor(8, 15, 30);
      doc.rect(0, 0, pageW, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("RAPPORT SMARTTRAVEL — CLIENTS", pageW / 2, 8, { align: "center" });

      doc.setTextColor(8, 15, 30);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("5. Liste des clients", 14, y);
      y += 2;
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.8);
      doc.line(14, y + 1, 60, y + 1);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [["Nom complet", "Email", "Rôle", "Date inscription", "Statut"]],
        body: mappedUsers.map((u) => [u.name, u.email, u.role, u.date, u.status]),
        styles: { fontSize: 8.5, cellPadding: 3 },
        headStyles: { fillColor: [8, 15, 30], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 42 },
          1: { cellWidth: 55 },
          2: { cellWidth: 18, halign: "center" },
          3: { cellWidth: 28, halign: "center" },
          4: { cellWidth: 25, halign: "center" },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        bodyStyles: { textColor: [50, 50, 50] },
        didParseCell: (data: any) => {
          if (data.section === "body" && data.column.index === 4) {
            const v = data.cell.raw as string;
            if (v === "Actif") data.cell.styles.textColor = [5, 150, 105];
            else if (v === "Suspendu") data.cell.styles.textColor = [185, 28, 28];
          }
        },
      });

      // ── Pied de page sur toutes les pages ──
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        doc.setFillColor(248, 250, 252);
        doc.rect(0, ph - 12, pw, 12, "F");
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(0, ph - 12, pw, ph - 12);
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(`SmartTravel Admin — Rapport généré le ${dateStr}`, 14, ph - 5);
        doc.text(`Page ${i} / ${totalPages}`, pw - 14, ph - 5, { align: "right" });
        doc.setTextColor(37, 99, 235);
        doc.text("CONFIDENTIEL", pw / 2, ph - 5, { align: "center" });
      }

      const filename = `SmartTravel_Rapport_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}.pdf`;
      doc.save(filename);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-[#080f1e] text-lg" style={{ fontWeight: 700 }}>Rapports & Statistiques</h3>
              <p className="text-gray-400 text-xs mt-0.5">Données en temps réel — {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <button
            onClick={generatePDF}
            disabled={generating}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
            style={{ fontWeight: 600 }}
          >
            <Download className="h-4 w-4" />
            {generating ? "Génération en cours..." : "Télécharger le rapport PDF"}
          </button>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Chiffre d'affaires total", value: `${totalRevenu.toLocaleString("fr-FR")} TND`, icon: DollarSign, color: "bg-blue-600", sub: "Revenus cumulés" },
          { label: "Total réservations", value: String(reservations.length), icon: Calendar, color: "bg-indigo-600", sub: `${confirmes} confirmées` },
          { label: "Clients enregistrés", value: String(users.length), icon: Users, color: "bg-[#0a1628]", sub: `${clientsActifs} actifs` },
          { label: "Taux de confirmation", value: `${tauxConfirmation}%`, icon: CheckCircle, color: "bg-green-600", sub: "Réservations confirmées" },
          { label: "Offres disponibles", value: String(offres.length), icon: Plane, color: "bg-blue-600", sub: "Offres actives" },
          { label: "Revenu moyen", value: `${revenuMoyen.toLocaleString("fr-FR")} TND`, icon: TrendingUp, color: "bg-indigo-600", sub: "Par réservation" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`${s.color} w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0`}>
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">{s.label}</p>
              <p className="text-[#080f1e] text-xl" style={{ fontWeight: 700 }}>{s.value}</p>
              <p className="text-gray-400 text-xs">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Répartition des réservations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h4 className="text-[#080f1e] mb-4" style={{ fontWeight: 600 }}>Répartition par statut</h4>
          <div className="space-y-3">
            {[
              { label: "Confirmées", count: confirmes, color: "bg-green-500", text: "text-green-600" },
              { label: "En attente", count: enAttente, color: "bg-yellow-400", text: "text-yellow-600" },
              { label: "Annulées", count: annulees, color: "bg-red-500", text: "text-red-600" },
            ].map((s) => {
              const pct = reservations.length > 0 ? Math.round(s.count / reservations.length * 100) : 0;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-600 text-sm">{s.label}</span>
                    <span className={`text-sm ${s.text}`} style={{ fontWeight: 600 }}>{s.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${s.color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h4 className="text-[#080f1e] mb-4" style={{ fontWeight: 600 }}>Revenus par mois</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {chartData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Aucune donnée disponible</p>
            ) : chartData.map((d: any) => (
              <div key={d.month} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-600 text-sm w-10">{d.month}</span>
                <div className="flex-1 mx-3">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (d.revenus / (totalRevenu || 1)) * 100 * chartData.length)}%` }}
                    />
                  </div>
                </div>
                <span className="text-blue-600 text-sm" style={{ fontWeight: 600 }}>{d.revenus.toLocaleString("fr-FR")} TND</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Aperçu des données */}
      <div className="bg-gradient-to-br from-blue-600 to-[#0a1628] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white text-base mb-1" style={{ fontWeight: 700 }}>Rapport PDF complet</h4>
            <p className="text-blue-200 text-sm">Le PDF contient les KPIs, l'analyse des réservations, le détail de chaque réservation, la liste des offres et tous les clients.</p>
          </div>
          <button
            onClick={generatePDF}
            disabled={generating}
            className="flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-60 px-4 py-2.5 rounded-xl text-sm transition-colors flex-shrink-0 ml-6"
            style={{ fontWeight: 600 }}
          >
            <Download className="h-4 w-4" />
            {generating ? "..." : "Exporter"}
          </button>
        </div>
      </div>
    </div>
  );
}
