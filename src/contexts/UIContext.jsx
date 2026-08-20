import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [promptDialog, setPromptDialog] = useState(null);

  const showToast = useCallback((message, type = 'success', autoHide = true) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (autoHide) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    }
    return id;
  }, []);
  
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showConfirm = useCallback((title, message, onConfirm, confirmText = 'Xác nhận', cancelText = 'Hủy') => {
    setConfirmDialog({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null),
      confirmText,
      cancelText
    });
  }, []);

  
  const showPrompt = useCallback((title, defaultValue, onConfirm, placeholder = '') => {
    setPromptDialog({
      title,
      defaultValue,
      placeholder,
      onConfirm: (val) => {
        onConfirm(val);
        setPromptDialog(null);
      },
      onCancel: () => setPromptDialog(null)
    });
  }, []);

  return (
    <UIContext.Provider value={{ showToast, removeToast, showConfirm, showPrompt }}>
      {children}
      
      {/* Global Toast */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto animate-in slide-in-from-top-2 fade-in duration-300">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
              toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> :
               toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-600 shrink-0" /> :
               <Info className="w-5 h-5 text-blue-600 shrink-0" />}
              <span className="font-medium text-sm flex-1">{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} className="ml-2 hover:opacity-70 text-gray-500 shrink-0 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Global Confirm Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{confirmDialog.title}</h2>
            <p className="text-gray-600 mb-6 whitespace-pre-wrap">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                {confirmDialog.cancelText}
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* Global Prompt Modal */}
      {promptDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{promptDialog.title}</h2>
            <input
              autoFocus
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-6"
              placeholder={promptDialog.placeholder}
              defaultValue={promptDialog.defaultValue}
              onKeyDown={(e) => {
                if (e.key === 'Enter') promptDialog.onConfirm(e.target.value);
                if (e.key === 'Escape') promptDialog.onCancel();
              }}
              id="prompt-input"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={promptDialog.onCancel}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => promptDialog.onConfirm(document.getElementById('prompt-input').value)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
};
