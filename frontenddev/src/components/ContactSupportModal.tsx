import React, { useState } from 'react';
import { X, Mail, MessageSquare, Loader2, CheckCircle, AlertTriangle, Send } from 'lucide-react';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export const ContactSupportModal: React.FC<ContactSupportModalProps> = ({
  isOpen,
  onClose,
  userEmail = '',
}) => {
  const [email, setEmail] = useState(userEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(true);
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-indigo-950 rounded-[2rem] p-6 sm:p-8 max-w-lg w-full border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-black italic uppercase text-white">Contact Support</h3>
            <p className="text-xs text-indigo-300/70 font-medium">We'll respond within 24 hours</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-indigo-900 rounded-xl text-indigo-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 bg-lime-400/20 border border-lime-400/30 rounded-2xl">
              <CheckCircle className="w-6 h-6 text-lime-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">Message Sent!</p>
                <p className="text-xs text-indigo-300">
                  Our support team will get back to you shortly at <strong>{email}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-sm rounded-xl transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-indigo-200 block mb-1">Your Email *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-indigo-300 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="athlete@playgrounds.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-indigo-200 block mb-1">Subject</label>
              <input
                type="text"
                placeholder="Brief description of your issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-indigo-200 block mb-1">Message *</label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-indigo-300 absolute left-3 top-3" />
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your issue in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400 resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black italic uppercase text-sm rounded-xl transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Message...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Support Request</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ContactSupportModal;