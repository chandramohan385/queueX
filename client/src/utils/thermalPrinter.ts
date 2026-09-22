import type { Order, DailySettlementData } from '../types';

/**
 * Triggers native 80mm continuous thermal slip printing via window.print()
 * Formatted for standard 80mm / 3-inch POS thermal printers (Epson, TVS, Star, Xprinter).
 */
export function printThermalReceiptDirect(order: Order): void {
  // Create an isolated iframe for clean, instant printing without disrupting current page UI
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  const itemsHtml = (order.items && order.items.length > 0)
    ? order.items
        .map(
          (item) => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;">
          <div style="max-width: 65%; word-break: break-word;">
            <strong>${item.service_name || item.name || `Service #${item.service_id}`}</strong>
            <div style="font-size: 10px; color: #555;">${item.quantity} x ₹${Number(item.unit_price).toFixed(2)}</div>
          </div>
          <div style="font-weight: bold;">₹${Number(item.subtotal).toFixed(2)}</div>
        </div>
      `
        )
        .join('')
    : '<div style="font-size: 11px; font-style: italic;">General Service Order</div>';

  const orderDate = new Date(order.created_at).toLocaleString('en-IN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt #${order.token_number}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 10px 4px 20px 4px;
            color: #000;
            background: #fff;
            font-size: 12px;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .token-box {
            border: 2px solid #000;
            padding: 6px;
            margin: 8px 0;
            text-align: center;
          }
          .token-number {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 2px;
            font-family: monospace;
          }
          .barcode {
            font-family: monospace;
            font-size: 14px;
            letter-spacing: 4px;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2 style="font-size: 16px; font-weight: 900; letter-spacing: 1px;">QueueX PRINT & XEROX</h2>
          <p style="font-size: 10px; color: #333;">Express Counter Services</p>
          <div class="divider"></div>
        </div>

        <div class="token-box">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: bold;">Counter Token</div>
          <div class="token-number">#${order.token_number}</div>
          <div style="font-size: 10px; text-transform: uppercase;">Status: <strong>${order.status}</strong></div>
        </div>

        <div style="font-size: 11px; margin-bottom: 6px;">
          <div><strong>Customer:</strong> ${order.customer_name}</div>
          <div><strong>Contact:</strong> ${order.customer_phone}</div>
          <div><strong>Date:</strong> ${orderDate}</div>
        </div>

        <div class="divider"></div>
        <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase;">
          Order Summary
        </div>
        ${itemsHtml}
        <div class="divider"></div>

        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; margin: 6px 0;">
          <span>TOTAL AMOUNT:</span>
          <span>₹${Number(order.total_amount).toFixed(2)}</span>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px;">
          <span>Payment:</span>
          <span style="font-weight: bold;">${order.payment_status === 'PAID' ? 'PAID' : 'PAY AT COUNTER'}</span>
        </div>

        ${order.notes ? `
          <div class="divider"></div>
          <div style="font-size: 10px; font-style: italic;">
            <strong>Note:</strong> ${order.notes}
          </div>
        ` : ''}

        <div class="divider"></div>

        <div class="text-center" style="margin-top: 8px;">
          <div class="barcode">*${order.token_number}*</div>
          <p style="font-size: 9px; margin-top: 4px; color: #555;">
            Thank you! Show this slip at the pickup counter.
          </p>
          <p style="font-size: 8px; margin-top: 2px; color: #777;">
            Powered by QueueX Smart POS
          </p>
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for content to render, then invoke native print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Direct print failed, falling back to window.print():', err);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  }, 250);
}

/**
 * Triggers native 80mm continuous thermal slip printing for daily settlement reconciliation
 */
export function printDailySettlementSlip(data: DailySettlementData, targetDate: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  const servicesHtml = (data.services_summary && data.services_summary.length > 0)
    ? data.services_summary
        .map(
          (s) => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px;">
          <div style="max-width: 65%; word-break: break-word;">
            <strong>${s.service_name}</strong>
            <div style="font-size: 10px; color: #555;">${s.quantity} ${s.unit}s (${s.category})</div>
          </div>
          <div style="font-weight: bold;">₹${Number(s.revenue).toFixed(2)}</div>
        </div>
      `
        )
        .join('')
    : '<div style="font-size: 11px; font-style: italic;">No services logged for this date</div>';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Settlement Report - ${targetDate}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 10px 4px 20px 4px;
            color: #000;
            background: #fff;
            font-size: 12px;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .double-divider {
            border-top: 2px solid #000;
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2 style="font-size: 15px; font-weight: 900; letter-spacing: 0.5px;">DAILY SETTLEMENT REPORT</h2>
          <p style="font-size: 11px; font-weight: bold; margin-top: 2px;">QueueX Express Counter</p>
          <p style="font-size: 10px; color: #333;">Date: <strong>${targetDate}</strong></p>
          <div class="double-divider"></div>
        </div>

        <div style="font-size: 11px; margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Token Range:</span>
            <strong>${data.token_start || 'N/A'} &rarr; ${data.token_end || 'N/A'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Total Orders:</span>
            <strong>${data.total_orders}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Completed Jobs:</span>
            <strong>${data.completed_orders}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Cancelled Jobs:</span>
            <strong>${data.cancelled_orders}</strong>
          </div>
        </div>

        <div class="divider"></div>
        <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase;">
          Reconciliation Breakdown
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
          <span>Settled (Collected):</span>
          <strong style="color: #000;">₹${Number(data.settled_revenue).toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
          <span>Pending Counter Due:</span>
          <strong>₹${Number(data.pending_revenue).toFixed(2)}</strong>
        </div>

        <div class="double-divider"></div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900;">
          <span>GROSS REVENUE:</span>
          <span>₹${(Number(data.settled_revenue) + Number(data.pending_revenue)).toFixed(2)}</span>
        </div>
        <div class="double-divider"></div>

        <div style="font-size: 11px; font-weight: bold; margin-top: 8px; margin-bottom: 4px; text-transform: uppercase;">
          Service Sales Breakdown
        </div>
        ${servicesHtml}

        <div class="divider"></div>
        <div style="margin-top: 16px; font-size: 10px;">
          <div>Manager / Cashier: ____________________</div>
          <div style="margin-top: 8px;">Owner Verification: ____________________</div>
        </div>

        <div class="text-center" style="margin-top: 16px; font-size: 8px; color: #555;">
          Generated: ${new Date().toLocaleString('en-IN')}<br/>
          QueueX POS Automated Audit System
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Direct settlement print failed:', err);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  }, 250);
}

