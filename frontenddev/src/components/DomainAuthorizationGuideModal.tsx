import React from 'react';
import { X, Shield, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface DomainAuthorizationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DomainAuthorizationGuideModal: React.FC<DomainAuthorizationGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-indigo-950 rounded-[2rem] p-6 sm:p-8 max-w-2xl w-full border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-black italic uppercase text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-lime-400" />
              Domain Authorization Guide
            </h3>
            <p className="text-xs text-indigo-300/70 font-medium">
              Configure OAuth providers for your Playgrounds instance
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-indigo-900 rounded-xl text-indigo-300 hover:text-white transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 text-sm">
          {/* Warning Banner */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-400">Important: Authorized Domains Required</p>
              <p className="text-xs text-amber-200/80 mt-1">
                OAuth providers (Google, Facebook, Apple) require your domain to be whitelisted 
                in their developer consoles before they will accept authentication requests.
              </p>
            </div>
          </div>

          {/* Google Setup */}
          <div className="bg-indigo-900/40 p-4 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-black italic text-white flex items-center gap-2">
                <span className="text-lg">🔵</span> Google OAuth
              </h4>
              <span className="text-[10px] bg-lime-400/20 text-lime-300 px-2 py-0.5 rounded-full font-black">Required</span>
            </div>
            <ol className="space-y-1.5 text-xs text-indigo-200/80 list-decimal list-inside font-medium">
              <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="w-3 h-3" /></a></li>
              <li>Create or select your project → APIs &amp; Services → Credentials</li>
              <li>Add <strong className="text-white">Authorized JavaScript origins</strong> with your domain</li>
              <li>Add <strong className="text-white">Authorized redirect URIs</strong>: <code className="bg-indigo-950 px-2 py-0.5 rounded text-lime-300 text-[10px]">https://YOUR_DOMAIN/auth/callback</code></li>
            </ol>
          </div>

          {/* Facebook Setup */}
          <div className="bg-indigo-900/40 p-4 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-black italic text-white flex items-center gap-2">
                <span className="text-lg">📘</span> Facebook Login
              </h4>
              <span className="text-[10px] bg-lime-400/20 text-lime-300 px-2 py-0.5 rounded-full font-black">Optional</span>
            </div>
            <ol className="space-y-1.5 text-xs text-indigo-200/80 list-decimal list-inside font-medium">
              <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline inline-flex items-center gap-1">Facebook Developers <ExternalLink className="w-3 h-3" /></a></li>
              <li>Create an app → Add Product → Facebook Login</li>
              <li>Add <strong className="text-white">Valid OAuth Redirect URIs</strong>: <code className="bg-indigo-950 px-2 py-0.5 rounded text-lime-300 text-[10px]">https://YOUR_DOMAIN/auth/callback</code></li>
            </ol>
          </div>

          {/* Apple Setup */}
          <div className="bg-indigo-900/40 p-4 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-black italic text-white flex items-center gap-2">
                <span className="text-lg">🍎</span> Apple ID
              </h4>
              <span className="text-[10px] bg-lime-400/20 text-lime-300 px-2 py-0.5 rounded-full font-black">Optional</span>
            </div>
            <ol className="space-y-1.5 text-xs text-indigo-200/80 list-decimal list-inside font-medium">
              <li>Go to <a href="https://developer.apple.com" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline inline-flex items-center gap-1">Apple Developer <ExternalLink className="w-3 h-3" /></a></li>
              <li>Certificates, Identifiers &amp; Profiles → Identifiers → Create Service ID</li>
              <li>Add your domain to <strong className="text-white">Web Authentication Configuration</strong></li>
              <li>Return URL: <code className="bg-indigo-950 px-2 py-0.5 rounded text-lime-300 text-[10px]">https://YOUR_DOMAIN/auth/callback</code></li>
            </ol>
          </div>

          {/* Summary */}
          <div className="p-4 bg-indigo-900/40 rounded-2xl border border-lime-400/20 space-y-2">
            <div className="flex items-center gap-2 text-lime-400 font-black italic">
              <CheckCircle className="w-4 h-4" />
              <span>Domain Verification Checklist</span>
            </div>
            <ul className="space-y-1 text-xs text-indigo-200/80 font-medium">
              <li className="flex items-center gap-2">✓ Add your domain to OAuth provider's authorized origins</li>
              <li className="flex items-center gap-2">✓ Configure redirect URIs to your callback endpoint</li>
              <li className="flex items-center gap-2">✓ Enable the OAuth provider in your app settings</li>
              <li className="flex items-center gap-2">✓ Test authentication flow before deployment</li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-sm rounded-xl transition"
          >
            Got it - Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

export default DomainAuthorizationGuideModal;