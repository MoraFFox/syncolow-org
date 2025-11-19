

import * as React from 'react';
import { format, isValid, parseISO } from 'date-fns';
import type { MaintenanceVisit } from '@/lib/types';

const formatDateSafe = (dateInput: string | Date | undefined | null) => {
  if (!dateInput) return 'N/A';
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  if (isValid(date)) {
    return format(date, 'PPP');
  }
  return 'Invalid Date';
};

// This is a standalone component intended to be rendered to a static HTML string.
// It includes inline styles for portability when opened in a new tab.
export function MaintenanceReportHtml({ visit }: { visit: MaintenanceVisit }) {
  const reasonsText = (visit.problemReason && visit.problemReason.length > 0)
    ? visit.problemReason.join(', ')
    : 'Not specified';
  
  const totalPartsCost = visit.spareParts?.reduce((total, part) => {
    return total + (part.price || 0) * part.quantity;
  }, 0) || 0;

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <title>{`Maintenance Report - ${visit.branchName}`}</title>
        <style>{`
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb; font-size: 13px; }
          .container { max-width: 800px; margin: 1rem auto; padding: 1rem; background: white; border: 1px solid #e5e7eb; border-radius: 8px; }
          h1 { font-size: 20px; font-weight: 700; color: #111827; text-align: center; margin: 0 0 0.25rem 0; }
          .subtitle { text-align: center; font-size: 11px; color: #6b7280; margin-bottom: 1.5rem; }
          h2 { font-size: 15px; font-weight: 600; color: #111827; margin-top: 1.25rem; margin-bottom: 0.75rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
          .grid { display: table; width: 100%; border-spacing: 0; }
          .grid-row { display: table-row; }
          .grid-label, .grid-value { display: table-cell; padding: 0.25rem 0; vertical-align: top; }
          .grid-label { font-weight: 500; color: #4b5563; white-space: nowrap; padding-right: 1.5rem; }
          .grid-value { text-align: right; color: #1f2937; }
          .full-width { display: block; margin-top: 0.5rem; }
          .full-width strong { display: block; margin-bottom: 0.25rem; font-weight: 500; color: #4b5563; }
          .full-width p { text-align: left; padding: 0.5rem; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background-color: #f9fafb; font-weight: 600; }
          tfoot td { font-weight: bold; }
          .signatures { margin-top: 2rem; display: table; width: 100%; border-spacing: 1.5rem 0; }
          .signature-box { display: table-cell; width: 50%; text-align: center; }
          .signature-line { border-bottom: 1px solid #6b7280; height: 25px; margin-bottom: 5px; }
          .signature-title { font-size: 11px; color: #6b7280; }
          .print-button { position: fixed; bottom: 20px; right: 20px; background-color: #111827; color: white; border: none; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          @media print { .print-button { display: none; } }
        `}</style>
      </head>
      <body>
        <button id="print-button" className="print-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        </button>
        <div className="container">
          <h1>Maintenance Visit Report</h1>
          <p className="subtitle">
            <strong>Report for:</strong> {visit.branchName || 'N/A'}
          </p>

          <div className="section">
            <h2>Visit Details</h2>
            <div className="grid">
              <div className="grid-row">
                <div className="grid-label"><strong>Scheduled Date:</strong></div>
                <div className="grid-value">{formatDateSafe(visit.date)}</div>
              </div>
              <div className="grid-row">
                <div className="grid-label"><strong>Actual Arrival:</strong></div>
                <div className="grid-value">{formatDateSafe(visit.actualArrivalDate)}</div>
              </div>
               <div className="grid-row">
                <div className="grid-label"><strong>Technician:</strong></div>
                <div className="grid-value">{visit.technicianName}</div>
              </div>
              <div className="grid-row">
                <div className="grid-label"><strong>Visit Type:</strong></div>
                <div className="grid-value">{visit.visitType === 'periodic' ? 'Periodic Check-up' : 'Customer Request'}</div>
              </div>
              <div className="grid-row">
                <div className="grid-label"><strong>Status:</strong></div>
                <div className="grid-value">{visit.status}</div>
              </div>
            </div>
          </div>

          <div className="section">
            <h2>Barista Feedback</h2>
            <div className="grid">
               <div className="grid-row">
                <div className="grid-label"><strong>Barista Present:</strong></div>
                <div className="grid-value">{visit.baristaName || 'N/A'}</div>
              </div>
               <div className="full-width">
                   <strong>Recommendations:</strong>
                   <p>{visit.baristaRecommendations || 'N/A'}</p>
                </div>
            </div>
          </div>

          {visit.problemOccurred && (
            <div className="section">
              <h2>Problem Diagnosis</h2>
               <div className="grid">
                 <div className="grid-row">
                    <div className="grid-label"><strong>Reason(s):</strong></div>
                    <div className="grid-value" style={{ direction: 'rtl', textAlign: 'right' }}>{reasonsText}</div>
                 </div>
                 <div className="grid-row">
                    <div className="grid-label"><strong>Problem Solved:</strong></div>
                    <div className="grid-value">{visit.resolutionStatus === 'solved' ? 'Yes' : 'No, requires follow-up'}</div>
                 </div>
              </div>
            </div>
          )}

          {visit.spareParts && visit.spareParts.length > 0 && (
            <div className="section">
              <h2>Spare Parts Replaced</h2>
              <table>
                <thead>
                  <tr>
                    <th>Part Name</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Paid By</th>
                    <th style={{'textAlign': 'right'}}>Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {visit.spareParts.map((p, index) => (
                    <tr key={index}>
                      <td>{p.name}</td>
                      <td>{p.quantity}</td>
                      <td>${p.price?.toFixed(2) || '0.00'}</td>
                      <td>{p.paidBy}</td>
                      <td style={{'textAlign': 'right'}}>${((p.price || 0) * p.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                 <tfoot>
                  <tr>
                    <td colSpan={4} style={{'textAlign': 'right', 'fontWeight': 'bold'}}>Total Parts Cost</td>
                    <td style={{'textAlign': 'right', 'fontWeight': 'bold'}}>${totalPartsCost.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="section">
            <h2>Technician's Final Report</h2>
             <div className="grid">
                <div className="full-width">
                  <p>{visit.overallReport || 'No final report summary was provided.'}</p>
                </div>
             </div>
          </div>
          
          <div className="signatures">
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-title">Technician Signature</div>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-title">Branch Manager Signature</div>
            </div>
          </div>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.getElementById('print-button').addEventListener('click', function() {
                window.print();
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
