'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';

/**
 * Tax Documents Page - Department Employee
 * REQ-PY-15: Download tax documents (e.g., annual tax statement) for official purposes
 */

// Backend response type
interface TaxDocumentsResponse {
  employeeId: string;
  taxYear: number;
  documents: Array<{
    type: string;
    fileName: string;
    downloadUrl: string;
    generatedDate: string;
  }>;
}

interface TaxDocument {
  id: string;
  year: number;
  type: string;
  status: string;
  generatedDate: string;
  description?: string;
  fileName?: string;
  downloadUrl?: string;
}

export default function TaxDocumentsPage() {
  const { user } = useAuth();
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Generate available years (last 5 years)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    const fetchTaxDocuments = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await payrollTrackingService.getTaxDocuments(
          user.id,
          selectedYear || undefined
        );
        // Backend returns { employeeId, taxYear, documents: [...] }
        const data = response?.data as TaxDocumentsResponse | undefined;
        const documents = data?.documents || [];
        // Map backend documents to frontend TaxDocument format
        const mappedDocuments: TaxDocument[] = documents.map((doc, index) => ({
          id: `${data?.taxYear || currentYear}-${index}`,
          year: data?.taxYear || currentYear,
          type: doc.type,
          status: 'available',
          generatedDate: doc.generatedDate,
          fileName: doc.fileName,
          downloadUrl: doc.downloadUrl,
        }));
        setTaxDocuments(mappedDocuments);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load tax documents';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTaxDocuments();
  }, [user?.id, selectedYear, currentYear]);

  const handleDownload = async (year: number) => {
    if (!user?.id) return;
    
    try {
      setDownloading(year.toString());
      const response = await payrollTrackingService.downloadAnnualTaxStatement(user.id, year);
      
      // Handle file download - downloadFile returns { blob, filename, error }
      if (response?.error) {
        alert('Failed to download tax document: ' + response.error);
        return;
      }
      
      if (response?.blob) {
        const url = window.URL.createObjectURL(response.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.filename || `tax-statement-${year}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert('Failed to download tax document: ' + errorMessage);
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Available</span>;
      case 'generating':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Generating</span>;
      case 'pending':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status || 'N/A'}</span>;
    }
  };

  const getDocumentIcon = (type: string) => {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType.includes('annual') || lowerType.includes('yearly')) return '';
    if (lowerType.includes('certificate')) return '';
    if (lowerType.includes('w-2') || lowerType.includes('w2')) return '';
    if (lowerType.includes('1099')) return '';
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading tax documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-medium">Error loading tax documents</p>
        <p className="text-red-700 text-sm mt-2">{error}</p>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Back to Payroll Tracking
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tax Documents</h1>
          <p className="text-slate-600 mt-2">Download your annual tax statements and other tax-related documents</p>
        </div>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
            ← Back to Payroll Tracking
          </button>
        </Link>
      </div>

      {/* Overview Card */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Tax Documents Center</h2>
            <p className="text-amber-100 mt-1">Download official tax documents for filing and records</p>
          </div>
          <div className="text-6xl"></div>
        </div>
      </div>

      {/* Year Filter */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-slate-700 font-medium">Filter by Year:</span>
          <button
            onClick={() => setSelectedYear(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedYear === null
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Years
          </button>
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedYear === year
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Download Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Download - Annual Tax Statements</h3>
        <p className="text-slate-600 text-sm mb-6">
          Download your annual tax statement for any available year. These documents are needed for tax filing purposes.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => handleDownload(year)}
              disabled={downloading === year.toString()}
              className="p-4 border border-slate-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors text-center group disabled:opacity-50"
            >
              <div className="text-3xl mb-2"></div>
              <p className="font-bold text-slate-900 group-hover:text-amber-700">{year}</p>
              <p className="text-xs text-slate-500 mt-1">
                {downloading === year.toString() ? 'Downloading...' : 'Annual Statement'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">All Tax Documents</h3>
        </div>
        
        {taxDocuments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4"></div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Tax Documents Available</h3>
            <p className="text-slate-600">
              {selectedYear 
                ? `No tax documents found for ${selectedYear}.`
                : 'Your tax documents will appear here once they are generated.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Document</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Year</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Generated Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {taxDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getDocumentIcon(doc.type)}</span>
                        <div>
                          <p className="font-medium text-slate-900">{doc.type}</p>
                          {doc.description && (
                            <p className="text-sm text-slate-500">{doc.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">{doc.year}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(doc.generatedDate)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownload(doc.year)}
                        disabled={downloading === doc.year.toString() || doc.status?.toLowerCase() !== 'available'}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {downloading === doc.year.toString() ? 'Downloading...' : 'Download'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
            <span className="text-2xl"></span>
            <div>
              <h4 className="font-semibold text-blue-900">About Tax Statements</h4>
              <p className="text-sm text-blue-700 mt-1">
                Annual tax statements summarize your earnings, deductions, and taxes withheld during the tax year.
                You&apos;ll need these documents when filing your income tax return.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl"></span>
            <div>
              <h4 className="font-semibold text-amber-900">Document Availability</h4>
              <p className="text-sm text-amber-700 mt-1">
                Annual tax statements are typically available by late January for the previous tax year.
                Contact HR if you need a document that isn&apos;t showing up.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Document Types Explanation */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Understanding Your Tax Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl mb-2"></div>
            <h4 className="font-semibold text-slate-900">Annual Tax Statement</h4>
            <p className="text-sm text-slate-600 mt-1">
              Comprehensive summary of your yearly earnings and tax withholdings.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl mb-2"></div>
            <h4 className="font-semibold text-slate-900">Tax Certificate</h4>
            <p className="text-sm text-slate-600 mt-1">
              Official certificate of tax payments made on your behalf.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl mb-2"></div>
            <h4 className="font-semibold text-slate-900">Income Summary</h4>
            <p className="text-sm text-slate-600 mt-1">
              Detailed breakdown of all income sources and amounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}