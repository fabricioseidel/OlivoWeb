import type { CierreListado } from "@/server/cierre.service";
import type { CustomerBalance } from "@/lib/cierre/types";

const clp = (n: number) => `$${Math.round(Number(n || 0)).toLocaleString("es-CL")}`;

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-09-10" → "10/09". Se parte el string: `new Date` lo leería como UTC. */
const diaCorto = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

export interface DatosMes {
  anio: number;
  mes: number; // 1-12
  local: string;
  cierres: CierreListado[];
  deudas: CustomerBalance[];
}

/**
 * Consolidado mensual en hoja carta, para archivar en el cuaderno contable.
 *
 * El ticket de 58 mm del día se imprime desde el celular al cerrar; esto es lo
 * otro que se pidió: una vez al mes, el mes entero en papel tamaño carta.
 */
export async function descargarCierreMensual(datos: DatosMes): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF("p", "mm", "letter");
  const totalDe = (c: CierreListado, metodo: "CASH" | "TRANSFER" | "CARD") =>
    Number(c.declared_totals?.[metodo]?.ventas ?? 0);

  const sum = (fn: (c: CierreListado) => number) =>
    datos.cierres.reduce((a, c) => a + fn(c), 0);

  const totalEfectivo = sum((c) => totalDe(c, "CASH"));
  const totalTransfer = sum((c) => totalDe(c, "TRANSFER"));
  const totalTarjeta = sum((c) => totalDe(c, "CARD"));
  const totalVentas = sum((c) => Number(c.declared_totals?.total_ventas ?? 0));
  const totalFiado = sum((c) => Number(c.declared_totals?.fiados_otorgados ?? 0));
  const totalAbonos = sum((c) => Number(c.declared_totals?.abonos_recibidos ?? 0));

  doc.setFontSize(16);
  doc.setTextColor(5, 46, 22);
  doc.text("Olivomarket — Libro de caja", 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(`${MESES[datos.mes - 1]} ${datos.anio} · ${datos.local}`, 14, 25);

  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(
    `${datos.cierres.length} día(s) con cierre registrado · emitido ${new Date().toLocaleDateString("es-CL")}`,
    14,
    31
  );

  autoTable(doc, {
    head: [["Día", "Efectivo", "Transferencia", "Tarjeta", "Total ventas", "Fiado", "Abonos"]],
    body: datos.cierres.map((c) => [
      diaCorto(c.business_date),
      clp(totalDe(c, "CASH")),
      clp(totalDe(c, "TRANSFER")),
      clp(totalDe(c, "CARD")),
      clp(Number(c.declared_totals?.total_ventas ?? 0)),
      clp(Number(c.declared_totals?.fiados_otorgados ?? 0)),
      clp(Number(c.declared_totals?.abonos_recibidos ?? 0)),
    ]),
    foot: [[
      "Total",
      clp(totalEfectivo),
      clp(totalTransfer),
      clp(totalTarjeta),
      clp(totalVentas),
      clp(totalFiado),
      clp(totalAbonos),
    ]],
    startY: 38,
    theme: "grid",
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
    footStyles: { fillColor: [240, 253, 244], textColor: [5, 46, 22], fontSize: 9, fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 1.6, halign: "right" },
    columnStyles: { 0: { halign: "left" } },
  });

  // `lastAutoTable` lo agrega el plugin al documento; el tipo público no lo declara.
  const finY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  if (datos.deudas.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(5, 46, 22);
    doc.text("Fiados pendientes al cierre del mes", 14, finY + 12);

    autoTable(doc, {
      head: [["Cliente", "Fiado total", "Pagado", "Saldo", "Deuda más antigua"]],
      body: datos.deudas.map((d) => [
        d.name,
        clp(d.total_charges),
        clp(d.total_payments),
        clp(d.balance),
        d.oldest_charge ? diaCorto(d.oldest_charge) : "—",
      ]),
      foot: [[
        "Total por cobrar",
        "",
        "",
        clp(datos.deudas.reduce((a, d) => a + Number(d.balance), 0)),
        "",
      ]],
      startY: finY + 16,
      theme: "grid",
      headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
      footStyles: { fillColor: [255, 251, 235], textColor: [120, 53, 15], fontSize: 9, fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 1.6, halign: "right" },
      columnStyles: { 0: { halign: "left" } },
    });
  }

  const finY2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(
    "El fiado entregado y los abonos recibidos no forman parte del total de ventas:",
    14,
    finY2 + 10
  );
  doc.text(
    "el fiado no es venta hasta que se paga, y el abono corresponde a una venta de un día anterior.",
    14,
    finY2 + 14
  );
  doc.text("Firma: ______________________________", 14, finY2 + 24);

  const nombreMes = String(datos.mes).padStart(2, "0");
  doc.save(`libro-caja-${datos.anio}-${nombreMes}.pdf`);
}
