import { jsPDF } from 'jspdf';
import type { Order } from '../types';

/**
 * Generates an authentic 80mm industrial thermal POS receipt PDF.
 * Formatted specifically for counter roll printers (80mm x dynamic height).
 */
export function generateThermalReceipt(order: Order): void {
  const items = order.items || [];
  const files = order.files || [];

  // Calculate dynamic height based on line items count
  const baseHeight = 175;
  const itemRowsHeight = Math.max(1, items.length) * 9;
  const filesHeight = files.length > 0 ? 12 : 0;
  const totalHeight = baseHeight + itemRowsHeight + filesHeight;

  // Initialize jsPDF with custom 80mm roll dimensions: [width, height] in mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, totalHeight],
  });

  const pageWidth = 80;
  const margin = 5;
  const contentWidth = pageWidth - margin * 2;
  let y = 8;

  // Helper for centered text
  const centerText = (text: string, fontSize = 9, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
    y += fontSize * 0.35 + 1.5;
  };

  // Helper for dashed line
  const drawDashedLine = () => {
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text('----------------------------------------------', margin, y);
    y += 4;
  };

  // 1. Header & Store Info
  centerText('QueueX POS COUNTER', 13, true);
  centerText('Smart Service & Order Dispatch', 8, false);
  centerText('Tech Corridor, Counter Desk #1', 7, false);
  centerText(new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), 7, false);
  y += 1;

  drawDashedLine();

  // 2. Large Token Identifier Box
  centerText('LIVE TOKEN NUMBER', 7, true);
  centerText(order.token_number, 20, true);
  y += 1;

  // Status & Payment Pills simulation
  const paymentText = order.payment_status === 'PAID' ? 'PAID - VERIFIED' : 'PAYMENT: PENDING';
  centerText(`STATUS: ${order.status} | ${paymentText}`, 7, true);
  y += 1;

  drawDashedLine();

  // 3. Customer Info Section
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Customer : ${order.customer_name}`, margin, y);
  y += 3.8;
  doc.text(`Contact  : ${order.customer_phone}`, margin, y);
  y += 3.8;
  doc.text(`Order ID : #${order.id}`, margin, y);
  y += 4;

  drawDashedLine();

  // 4. Line Items Table Header
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVICE / ITEM', margin, y);
  doc.text('QTY', margin + 37, y);
  doc.text('RATE', margin + 49, y);
  doc.text('TOTAL', pageWidth - margin - doc.getTextWidth('TOTAL'), y);
  y += 4;

  doc.setLineWidth(0.2);
  doc.line(margin, y - 1, pageWidth - margin, y - 1);
  y += 1;

  // Line items list
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  if (items.length === 0) {
    doc.text('Service Package', margin, y);
    doc.text('1', margin + 38, y);
    doc.text(`Rs.${parseFloat(String(order.total_amount)).toFixed(2)}`, margin + 47, y);
    const totStr = `Rs.${parseFloat(String(order.total_amount)).toFixed(2)}`;
    doc.text(totStr, pageWidth - margin - doc.getTextWidth(totStr), y);
    y += 4.5;
  } else {
    items.forEach((item) => {
      const name = item.service_name || item.name || `Service #${item.service_id}`;
      // Truncate name if too long for 80mm column
      const displayName = name.length > 20 ? `${name.substring(0, 18)}..` : name;
      const unitRate = parseFloat(String(item.unit_price)).toFixed(2);
      const subtotal = parseFloat(String(item.subtotal)).toFixed(2);

      doc.text(displayName, margin, y);
      doc.text(String(item.quantity), margin + 38, y);
      doc.text(unitRate, margin + 48, y);
      doc.text(subtotal, pageWidth - margin - doc.getTextWidth(subtotal), y);
      y += 4.2;
    });
  }

  y += 1;
  drawDashedLine();

  // 5. Totals & Tax Breakdown
  const totalAmountStr = `Rs. ${parseFloat(String(order.total_amount)).toFixed(2)}`;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', margin, y);
  doc.text(totalAmountStr, pageWidth - margin - doc.getTextWidth(totalAmountStr), y);
  y += 4;

  doc.text('Taxes (GST Incl):', margin, y);
  const taxStr = 'Rs. 0.00';
  doc.text(taxStr, pageWidth - margin - doc.getTextWidth(taxStr), y);
  y += 4.5;

  doc.setLineWidth(0.3);
  doc.line(margin, y - 1, pageWidth - margin, y - 1);
  y += 1;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL AMOUNT:', margin, y);
  doc.text(totalAmountStr, pageWidth - margin - doc.getTextWidth(totalAmountStr), y);
  y += 6;

  // 6. Payment Confirmation Box
  if (order.payment_status === 'PAID') {
    doc.setFillColor(240, 253, 244); // light emerald
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setDrawColor(34, 197, 94);
    doc.rect(margin, y, contentWidth, 7, 'S');

    doc.setFontSize(7.5);
    doc.setTextColor(21, 128, 61);
    doc.setFont('helvetica', 'bold');
    const stampText = 'PAID IN FULL';
    doc.text(stampText, (pageWidth - doc.getTextWidth(stampText)) / 2, y + 4.8);
    doc.setTextColor(0, 0, 0);
    y += 10;
  } else {
    doc.setFillColor(254, 242, 242);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setDrawColor(239, 68, 68);
    doc.rect(margin, y, contentWidth, 7, 'S');

    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    const stampText = 'PAYMENT DUE AT COUNTER';
    doc.text(stampText, (pageWidth - doc.getTextWidth(stampText)) / 2, y + 4.8);
    doc.setTextColor(0, 0, 0);
    y += 10;
  }

  // 7. Simulated Barcode Lines
  y += 2;
  const barcodeX = (pageWidth - 44) / 2;
  doc.setLineWidth(0.4);
  for (let i = 0; i < 44; i += 1.8) {
    const isThick = (i * 7) % 3 === 0;
    doc.setLineWidth(isThick ? 0.7 : 0.3);
    doc.line(barcodeX + i, y, barcodeX + i, y + 8);
  }
  y += 11;

  centerText(`*${order.token_number}*`, 8, true);
  y += 1;

  // 8. Footer Notice
  centerText('Present this thermal slip at counter', 6.5, false);
  centerText('for priority order pickup.', 6.5, false);
  centerText('Thank you for choosing QueueX!', 7, true);

  // Trigger browser download
  doc.save(`QueueX_Thermal_Receipt_${order.token_number}.pdf`);
}
