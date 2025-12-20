'use client';

import { useState, useRef } from 'react';
import { Button } from '@/app/components/ui/button';
import { JobOffer } from '@/app/types/recruitment';

/**
 * REC-018: Offer Letter Generator Component
 * Generates printable/downloadable offer letters
 */

interface OfferLetterGeneratorProps {
  offer: {
    candidateName: string;
    candidateEmail?: string;
    jobTitle: string;
    department: string;
    salary: number;
    bonus?: number;
    benefits?: string[];
    conditions?: string;
    insurances?: string;
    startDate?: string;
    expirationDate?: string;
    createdAt?: string;
  };
  companyName?: string;
  companyAddress?: string;
  onClose?: () => void;
}

export default function OfferLetterGenerator({
  offer,
  companyName = 'German International University',
  companyAddress = 'Cairo, Egypt',
  onClose,
}: OfferLetterGeneratorProps) {
  const [printing, setPrinting] = useState(false);
  const letterRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
  };

  const handleDownloadPDF = async () => {
    // For browser-based PDF generation, we use window.print() with PDF option
    // In production, you would integrate a proper PDF library like jsPDF or react-pdf
    setPrinting(true);
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to download the offer letter');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Offer Letter - ${offer.candidateName}</title>
          <style>
            body {
              font-family: 'Times New Roman', Times, serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.6;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #1e40af;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #1e40af;
            }
            .company-address {
              font-size: 14px;
              color: #666;
            }
            .date {
              text-align: right;
              margin-bottom: 20px;
            }
            .recipient {
              margin-bottom: 30px;
            }
            .subject {
              font-weight: bold;
              margin: 30px 0;
              font-size: 18px;
            }
            .content {
              margin-bottom: 20px;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .details-table th,
            .details-table td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            .details-table th {
              background-color: #f8fafc;
              font-weight: bold;
              width: 40%;
            }
            .benefits-list {
              margin: 10px 0;
              padding-left: 20px;
            }
            .signature-section {
              margin-top: 60px;
            }
            .signature-box {
              display: inline-block;
              width: 45%;
              margin-top: 20px;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin-top: 50px;
              padding-top: 5px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${companyName}</div>
            <div class="company-address">${companyAddress}</div>
          </div>
          
          <div class="date">Date: ${formatDate(offer.createdAt || new Date().toISOString())}</div>
          
          <div class="recipient">
            <strong>${offer.candidateName}</strong><br>
            ${offer.candidateEmail || ''}
          </div>
          
          <div class="subject">RE: Employment Offer - ${offer.jobTitle}</div>
          
          <div class="content">
            <p>Dear ${offer.candidateName},</p>
            
            <p>We are pleased to extend to you an offer of employment with ${companyName}. We were impressed with your qualifications and believe you would be a valuable addition to our team.</p>
            
            <p>Please find below the details of our offer:</p>
          </div>
          
          <table class="details-table">
            <tr>
              <th>Position</th>
              <td>${offer.jobTitle}</td>
            </tr>
            <tr>
              <th>Department</th>
              <td>${offer.department}</td>
            </tr>
            <tr>
              <th>Monthly Gross Salary</th>
              <td>${formatCurrency(offer.salary)}</td>
            </tr>
            ${offer.bonus ? `
            <tr>
              <th>Signing Bonus</th>
              <td>${formatCurrency(offer.bonus)}</td>
            </tr>
            ` : ''}
            <tr>
              <th>Start Date</th>
              <td>${formatDate(offer.startDate)}</td>
            </tr>
            <tr>
              <th>Offer Valid Until</th>
              <td>${formatDate(offer.expirationDate)}</td>
            </tr>
          </table>
          
          ${offer.benefits && offer.benefits.length > 0 ? `
          <div class="content">
            <p><strong>Benefits Package:</strong></p>
            <ul class="benefits-list">
              ${offer.benefits.map(b => `<li>${b}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          
          ${offer.insurances ? `
          <div class="content">
            <p><strong>Insurance Coverage:</strong> ${offer.insurances}</p>
          </div>
          ` : ''}
          
          ${offer.conditions ? `
          <div class="content">
            <p><strong>Employment Conditions:</strong> ${offer.conditions}</p>
          </div>
          ` : ''}
          
          <div class="content">
            <p>This offer is contingent upon the successful completion of a background check and the submission of required documentation.</p>
            
            <p>To accept this offer, please sign below and return this letter by ${formatDate(offer.expirationDate)}.</p>
            
            <p>We are excited about the possibility of you joining our team and look forward to your positive response.</p>
            
            <p>Sincerely,</p>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">
                <strong>HR Department</strong><br>
                ${companyName}
              </div>
            </div>
          </div>
          
          <div style="margin-top: 60px;">
            <p><strong>Candidate Acceptance:</strong></p>
            <p>I accept this offer of employment and agree to the terms outlined above.</p>
            
            <div class="signature-box">
              <div class="signature-line">
                <strong>${offer.candidateName}</strong><br>
                Date: ____________________
              </div>
            </div>
          </div>
          
          <div class="footer">
            This offer letter is generated by ${companyName} HR System.<br>
            This document is confidential and intended solely for the named recipient.
          </div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print();
        // printWindow.close(); // Uncomment if you want to close after print dialog
      }, 250);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Offer Letter Preview</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={printing}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </Button>
              <Button size="sm" onClick={handleDownloadPDF} disabled={printing}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </Button>
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Letter Preview */}
          <div className="overflow-y-auto p-8 bg-slate-100" style={{ maxHeight: 'calc(90vh - 70px)' }}>
            <div 
              ref={letterRef}
              className="bg-white shadow-lg mx-auto max-w-2xl p-12"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              {/* Company Header */}
              <div className="text-center border-b-2 border-blue-700 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-blue-700">{companyName}</h1>
                <p className="text-sm text-slate-500">{companyAddress}</p>
              </div>

              {/* Date */}
              <div className="text-right text-sm mb-4">
                Date: {formatDate(offer.createdAt || new Date().toISOString())}
              </div>

              {/* Recipient */}
              <div className="mb-6">
                <p className="font-semibold">{offer.candidateName}</p>
                {offer.candidateEmail && <p className="text-sm text-slate-600">{offer.candidateEmail}</p>}
              </div>

              {/* Subject */}
              <p className="font-bold text-lg mb-4">RE: Employment Offer - {offer.jobTitle}</p>

              {/* Content */}
              <div className="space-y-4 text-sm leading-relaxed">
                <p>Dear {offer.candidateName},</p>
                
                <p>
                  We are pleased to extend to you an offer of employment with {companyName}. 
                  We were impressed with your qualifications and believe you would be a valuable 
                  addition to our team.
                </p>

                <p>Please find below the details of our offer:</p>

                {/* Details Table */}
                <table className="w-full border-collapse my-4">
                  <tbody>
                    <tr className="border">
                      <td className="p-2 bg-slate-50 font-semibold border-r w-2/5">Position</td>
                      <td className="p-2">{offer.jobTitle}</td>
                    </tr>
                    <tr className="border">
                      <td className="p-2 bg-slate-50 font-semibold border-r">Department</td>
                      <td className="p-2">{offer.department}</td>
                    </tr>
                    <tr className="border">
                      <td className="p-2 bg-slate-50 font-semibold border-r">Monthly Gross Salary</td>
                      <td className="p-2">{formatCurrency(offer.salary)}</td>
                    </tr>
                    {offer.bonus && offer.bonus > 0 && (
                      <tr className="border">
                        <td className="p-2 bg-slate-50 font-semibold border-r">Signing Bonus</td>
                        <td className="p-2 text-emerald-600">{formatCurrency(offer.bonus)}</td>
                      </tr>
                    )}
                    <tr className="border">
                      <td className="p-2 bg-slate-50 font-semibold border-r">Start Date</td>
                      <td className="p-2">{formatDate(offer.startDate)}</td>
                    </tr>
                    <tr className="border">
                      <td className="p-2 bg-slate-50 font-semibold border-r">Offer Valid Until</td>
                      <td className="p-2">{formatDate(offer.expirationDate)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Benefits */}
                {offer.benefits && offer.benefits.length > 0 && (
                  <div>
                    <p className="font-semibold">Benefits Package:</p>
                    <ul className="list-disc ml-6 mt-1">
                      {offer.benefits.map((benefit, index) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Insurance */}
                {offer.insurances && (
                  <p><span className="font-semibold">Insurance Coverage:</span> {offer.insurances}</p>
                )}

                {/* Conditions */}
                {offer.conditions && (
                  <p><span className="font-semibold">Employment Conditions:</span> {offer.conditions}</p>
                )}

                <p>
                  This offer is contingent upon the successful completion of a background check 
                  and the submission of required documentation.
                </p>

                <p>
                  To accept this offer, please sign below and return this letter by {formatDate(offer.expirationDate)}.
                </p>

                <p>
                  We are excited about the possibility of you joining our team and look forward to your positive response.
                </p>

                <p>Sincerely,</p>

                {/* HR Signature */}
                <div className="mt-12 pt-4 border-t border-slate-300">
                  <p className="font-semibold">HR Department</p>
                  <p>{companyName}</p>
                </div>

                {/* Candidate Acceptance */}
                <div className="mt-12 pt-4 border-t border-slate-200">
                  <p className="font-semibold">Candidate Acceptance:</p>
                  <p className="italic text-slate-600">I accept this offer of employment and agree to the terms outlined above.</p>
                  
                  <div className="mt-8 flex justify-between items-end">
                    <div>
                      <div className="border-t border-slate-400 pt-1 w-48">
                        <p className="font-semibold">{offer.candidateName}</p>
                      </div>
                    </div>
                    <div>
                      <div className="border-t border-slate-400 pt-1 w-32">
                        <p className="text-slate-600">Date</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
                <p>This offer letter is generated by {companyName} HR System.</p>
                <p>This document is confidential and intended solely for the named recipient.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
