'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/app/components/ui/button';

/**
 * REC-018: Electronic Signature Capture Component
 * Allows candidates to sign offer letters electronically
 */

interface SignatureCaptureProps {
  onSign: (signatureData: string) => Promise<void>;
  onCancel?: () => void;
  signerName?: string;
  documentTitle?: string;
  isSubmitting?: boolean;
}

export default function SignatureCapture({
  onSign,
  onCancel,
  signerName = 'Candidate',
  documentTitle = 'Offer Letter',
  isSubmitting = false,
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Set line style
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  // Get coordinates from event
  const getCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Start drawing
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [getCoordinates]);

  // Draw
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  }, [isDrawing, getCoordinates]);

  // Stop drawing
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Clear signature
  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setTypedSignature('');
  }, []);

  // Generate typed signature as image
  const generateTypedSignatureImage = useCallback((name: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = 'italic 36px "Brush Script MT", cursive, "Dancing Script", "Pacifico", Georgia';
    ctx.fillStyle = '#1e3a8a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL('image/png');
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!agreed) {
      setError('Please agree to the terms before signing');
      return;
    }

    let signatureData = '';

    if (signatureType === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasSignature) {
        setError('Please draw your signature');
        return;
      }
      signatureData = canvas.toDataURL('image/png');
    } else {
      if (!typedSignature.trim()) {
        setError('Please type your signature');
        return;
      }
      signatureData = generateTypedSignatureImage(typedSignature);
    }

    try {
      await onSign(signatureData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit signature');
    }
  }, [agreed, signatureType, hasSignature, typedSignature, onSign, generateTypedSignatureImage]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Electronic Signature</h2>
                <p className="text-sm text-slate-500 mt-1">Sign the {documentTitle}</p>
              </div>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Signature Type Toggle */}
            <div className="flex rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => { setSignatureType('draw'); clearSignature(); }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  signatureType === 'draw'
                    ? 'bg-white text-slate-900 shadow'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Draw
              </button>
              <button
                onClick={() => { setSignatureType('type'); clearSignature(); }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  signatureType === 'type'
                    ? 'bg-white text-slate-900 shadow'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Type
              </button>
            </div>

            {/* Signature Area */}
            {signatureType === 'draw' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Draw your signature below
                </label>
                <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-32 cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-slate-400 text-sm">Draw here...</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={clearSignature}
                  className="mt-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  Clear signature
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type your full name
                </label>
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {typedSignature && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-500 mb-2">Preview:</p>
                    <p 
                      className="text-2xl text-blue-900"
                      style={{ fontFamily: '"Brush Script MT", cursive, "Dancing Script", "Pacifico", Georgia' }}
                    >
                      {typedSignature}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Agreement Checkbox */}
            <div className="bg-slate-50 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">
                  I, <strong>{signerName}</strong>, hereby confirm that I have read and understood the 
                  {documentTitle} and agree to all the terms and conditions stated therein. I understand 
                  that this electronic signature has the same legal validity as a handwritten signature.
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl">
            <div className="flex gap-3">
              {onCancel && (
                <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
              <Button 
                className="flex-1" 
                onClick={handleSubmit} 
                disabled={isSubmitting || !agreed || (signatureType === 'draw' ? !hasSignature : !typedSignature.trim())}
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Sign Document
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500 text-center mt-3">
              Signed on: {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pre-built component for candidate offer signing
export function CandidateOfferSignature({
  offerId,
  candidateName,
  onSuccess,
  onCancel,
}: {
  offerId: string;
  candidateName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSign = async (signatureData: string) => {
    setIsSubmitting(true);
    try {
      // Import dynamically to avoid circular dependencies
      const { signOffer } = await import('@/app/services/recruitment');
      await signOffer(offerId, signatureData);
      onSuccess?.();
    } catch (error) {
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SignatureCapture
      onSign={handleSign}
      onCancel={onCancel}
      signerName={candidateName}
      documentTitle="Employment Offer Letter"
      isSubmitting={isSubmitting}
    />
  );
}
