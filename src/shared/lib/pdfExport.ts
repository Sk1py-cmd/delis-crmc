"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Экспорт в PDF — счёт / накладная / чек.
 * Передаём готовые заголовки и строки.
 */
export function exportPDF(data: {
  title: string;
  brand: string;
  documentNumber: string;
  fromRows: [string, string][];         // левая колонка
  toRows: [string, string][];           // правая колонка
  tableHead: string[];
  tableBody: (string | number)[][];
  totalsRows: [string, string][];       // итоговые строки
  qrBlock?: string;                     // текст QR подписи
  signRows?: [string, string][];        // строки подписей
  thanks?: string;
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  let y = 12;

  // ═══ HEADER ═══
  doc.setFillColor(30, 27, 75);
  doc.rect(0, 0, pageW, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.text(data.brand, 15, 18);
  doc.setFontSize(8);
  doc.setFont("Helvetica", "normal");
  doc.text("Professional Chemicals", 15, 24);

  doc.setFontSize(16);
  doc.setFont("Helvetica", "bold");
  doc.text(data.title, pageW - 15, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(220, 220, 255);
  doc.text(data.documentNumber, pageW - 15, 26, { align: "right" });

  y = 44;

  // ═══ FROM / TO ═══
  const colW = (pageW - 40) / 2;
  let leftY = y;
  let rightY = y;

  // From
  doc.setFillColor(248, 247, 255);
  doc.setDrawColor(222, 221, 255);
  doc.roundedRect(13, leftY - 4, colW + 2, data.fromRows.length * 6 + 12, 4, 4, "FD");

  doc.setFontSize(8);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(124, 58, 237);
  doc.text("From", 17, leftY);
  leftY += 7;
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(50, 50, 70);
  data.fromRows.forEach(([label, val]) => {
    doc.setFont("Helvetica", "bold");
    doc.text(label, 17, leftY);
    doc.setFont("Helvetica", "normal");
    doc.text(val, 17 + doc.getTextWidth(label) + 3, leftY);
    leftY += 6;
  });

  // To
  doc.setFillColor(240, 249, 255);
  const toX = 13 + colW + 10;
  const toW = colW + 2;
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(toX, rightY - 4, toW, data.toRows.length * 6 + 12, 4, 4, "FD");
  rightY += 4;
  doc.setTextColor(3, 105, 161);
  doc.setFont("Helvetica", "bold");
  doc.text("To", toX + 4, rightY);
  rightY += 7;
  doc.setTextColor(50, 50, 70);
  data.toRows.forEach(([label, val]) => {
    doc.setFont("Helvetica", "bold");
    doc.text(label, toX + 4, rightY);
    doc.setFont("Helvetica", "normal");
    doc.text(val, toX + 4 + doc.getTextWidth(label) + 3, rightY);
    rightY += 6;
  });

  y = Math.max(leftY, rightY) + 8;

  // ═══ TABLE ═══
  autoTable(doc, {
    startY: y,
    head: [data.tableHead],
    body: data.tableBody,
    theme: "grid",
    headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontSize: 7 },
    bodyStyles: { fontSize: 8, textColor: [50, 50, 70] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      [data.tableHead.length - 1]: { halign: "right" },
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ═══ TOTALS ═══
  const totX = pageW - 90;
  data.totalsRows.forEach(([label, val], idx) => {
    doc.setFontSize(idx === data.totalsRows.length - 1 ? 13 : 9);
    doc.setFont("Helvetica", idx === data.totalsRows.length - 1 ? "bold" : "normal");
    doc.setTextColor(idx === data.totalsRows.length - 1 ? 30 : 100);
    doc.text(label, totX, y);
    doc.text(val, pageW - 15, y, { align: "right" });
    y += idx === data.totalsRows.length - 1 ? 12 : 7;
  });

  // ═══ QR + SIGNS ═══
  if (data.qrBlock) {
    y += 6;
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(data.qrBlock, pageW / 2, y, { align: "center" });
    y += 5;
  }

  if (data.signRows) {
    y += 8;
    data.signRows.forEach(([label]) => {
      doc.setDrawColor(180);
      doc.line(20, y + 5, 85, y + 5);
      doc.setFontSize(7);
      doc.setTextColor(140);
      doc.text(label, 20, y + 10);
    });
  }

  // ═══ FOOTER ═══
  y = 282;
  doc.setFontSize(7);
  doc.setTextColor(170);
  doc.text(data.thanks ?? "DELIS — Professional Chemicals", pageW / 2, y, { align: "center" });

  doc.save(`${data.brand}_${data.title.replace(/\s/g, "_")}.pdf`);
}
