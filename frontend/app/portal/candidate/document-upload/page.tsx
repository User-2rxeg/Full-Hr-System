'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onboardingService, DocumentType, Document } from '@/app/services/onboarding';
import { useAuth } from '@/app/context/AuthContext';

interface UploadedFile {
  type: DocumentType;
  name: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const REQUIRED_DOCUMENTS = [
  {
    type: DocumentType.CONTRACT,
    label: 'Signed Contract',
    description: 'Your signed employment contract',
    required: true,
    icon: 'document'
  },
  {
    type: DocumentType.ID,
    label: 'Government ID',
    description: 'Valid government-issued ID (passport, national ID, driver\'s license)',
    required: true,
    icon: 'id'
  },
  {
    type: DocumentType.CERTIFICATE,
    label: 'Certificates',
    description: 'Educational certificates, professional certifications',
    required: false,
    icon: 'certificate'
  },
  {
    type: DocumentType.CV,
    label: 'Updated CV/Resume',
    description: 'Your latest CV or resume',
    required: false,
    icon: 'file'
  },
];

export default function CandidateDocumentUploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [allRequiredUploaded, setAllRequiredUploaded] = useState(false);

  useEffect(() => {
    const loadExistingDocuments = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const documents = await onboardingService.getDocumentsByOwner(user.id);

        const existingFiles: UploadedFile[] = documents.map((doc: Document) => ({
          type: doc.type,
          name: doc.filePath.split('/').pop() || 'Document',
          status: 'success' as const,
        }));

        setUploadedFiles(existingFiles);

        const requiredTypes = REQUIRED_DOCUMENTS.filter(d => d.required).map(d => d.type);
        const uploadedTypes = existingFiles.filter(f => f.status === 'success').map(f => f.type);
        const allRequired = requiredTypes.every(t => uploadedTypes.includes(t));
        setAllRequiredUploaded(allRequired);
      } catch (err: any) {
        if (!err.message?.includes('404')) {
          console.error('Failed to load existing documents:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadExistingDocuments();
  }, [user?.id]);

  const handleFileSelect = (docType: DocumentType) => {
    setSelectedDocType(docType);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDocType) return;

    const ownerId = user?.id;
    if (!ownerId) {
      setError('User not authenticated. Please log in again.');
      return;
    }

    const newFile: UploadedFile = {
      type: selectedDocType,
      name: file.name,
      status: 'uploading',
    };

    setUploadedFiles(prev => {
      const filtered = prev.filter(f => f.type !== selectedDocType);
      return [...filtered, newFile];
    });

    try {
      setUploading(true);
      setError(null);

      const filePath = `/uploads/${ownerId}/${selectedDocType}/${file.name}`;

      await onboardingService.uploadDocument({
        ownerId,
        type: selectedDocType,
        filePath,
      });

      setUploadedFiles(prev =>
        prev.map(f =>
          f.type === selectedDocType ? { ...f, status: 'success' as const } : f
        )
      );

      setSuccess(`${REQUIRED_DOCUMENTS.find(d => d.type === selectedDocType)?.label} uploaded successfully`);
      setTimeout(() => setSuccess(null), 4000);

      const requiredTypes = REQUIRED_DOCUMENTS.filter(d => d.required).map(d => d.type);
      const uploadedTypes = [...uploadedFiles.filter(f => f.status === 'success').map(f => f.type), selectedDocType];
      const allRequired = requiredTypes.every(t => uploadedTypes.includes(t));
      setAllRequiredUploaded(allRequired);

    } catch (err: any) {
      setUploadedFiles(prev =>
        prev.map(f =>
          f.type === selectedDocType ? { ...f, status: 'error' as const, error: err.message } : f
        )
      );
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      setSelectedDocType(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getDocumentStatus = (docType: DocumentType) => {
    const file = uploadedFiles.find(f => f.type === docType);
    return file?.status || 'pending';
  };

  const renderIcon = (iconName: string) => {
    const className = "w-6 h-6";
    switch (iconName) {
      case 'document':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
      case 'id':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>;
      case 'certificate':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;
      case 'file':
        return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-24 bg-white rounded-xl shadow-sm"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-40 bg-white rounded-xl shadow-sm"></div>
              <div className="h-40 bg-white rounded-xl shadow-sm"></div>
              <div className="h-40 bg-white rounded-xl shadow-sm"></div>
              <div className="h-40 bg-white rounded-xl shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const uploadedCount = uploadedFiles.filter(f => f.status === 'success').length;
  const requiredCount = REQUIRED_DOCUMENTS.filter(d => d.required).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/portal/my-onboarding"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Onboarding
          </Link>
          <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">Document Upload</h1>
          <p className="text-gray-500 mt-1">Upload your signed contract and required documents</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}

        {/* Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Upload Progress</h2>
              <p className="text-sm text-gray-500 mt-0.5">{uploadedCount} of {requiredCount} required documents uploaded</p>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round((uploadedCount / requiredCount) * 100)}%
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${(uploadedCount / requiredCount) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Requirements Notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-medium text-blue-900">Important</h3>
            <p className="text-sm text-blue-700 mt-1">
              Documents must be collected and verified by HR before your first working day. Please ensure all required documents are uploaded and legible.
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileChange}
        />

        {/* Document Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REQUIRED_DOCUMENTS.map((doc) => {
            const status = getDocumentStatus(doc.type);
            const uploadedFile = uploadedFiles.find(f => f.type === doc.type);
            const isUploading = status === 'uploading';
            const isSuccess = status === 'success';
            const isError = status === 'error';

            return (
              <div
                key={doc.type}
                className={`bg-white rounded-xl border transition-all ${
                  isSuccess
                    ? 'border-green-200 bg-green-50/30'
                    : isError
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!isUploading && !isSuccess ? 'cursor-pointer' : ''}`}
                onClick={() => !isUploading && !isSuccess && handleFileSelect(doc.type)}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSuccess ? 'bg-green-100 text-green-600' : isError ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isUploading ? (
                        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : isSuccess ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        renderIcon(doc.icon)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{doc.label}</h3>
                        {doc.required && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{doc.description}</p>

                      {isSuccess && uploadedFile && (
                        <div className="flex items-center gap-2 mt-3 text-sm text-green-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="truncate">{uploadedFile.name}</span>
                        </div>
                      )}

                      {isError && uploadedFile && (
                        <p className="text-sm text-red-600 mt-2">{uploadedFile.error || 'Upload failed'}</p>
                      )}
                    </div>
                  </div>

                  {/* Action Area */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {isSuccess ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileSelect(doc.type);
                        }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Replace file
                      </button>
                    ) : isUploading ? (
                      <span className="text-sm text-gray-500">Uploading...</span>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Click to upload
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Accepted Formats */}
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <span className="text-sm font-medium text-gray-700">Accepted formats: </span>
            <span className="text-sm text-gray-500">PDF, DOC, DOCX, JPG, JPEG, PNG (Max 10MB)</span>
          </div>
        </div>

        {/* Success Message */}
        {allRequiredUploaded && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">All Required Documents Uploaded</h3>
            <p className="text-sm text-green-700 mb-4">
              You can now proceed to view your onboarding tracker and complete remaining tasks.
            </p>
            <button
              onClick={() => router.push('/portal/my-onboarding')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              View Onboarding Tracker
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* What Happens Next */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">What Happens Next?</h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Document Verification', description: 'HR will verify your uploaded documents', active: true },
              { step: 2, title: 'Profile Creation', description: 'Your employee profile will be created from contract details' },
              { step: 3, title: 'System Access', description: 'IT will provision your email and system access' },
              { step: 4, title: 'Equipment Setup', description: 'Your workspace and equipment will be prepared' },
              { step: 5, title: 'Orientation', description: 'Complete department-specific onboarding tasks' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                  item.active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {item.step}
                </div>
                <div className="pt-1">
                  <p className={`font-medium ${item.active ? 'text-gray-900' : 'text-gray-700'}`}>{item.title}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Help */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Need Help?</h3>
              <p className="text-gray-600 mt-1 text-sm">
                If you have questions about the required documents or encounter any issues during upload, please contact HR.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

