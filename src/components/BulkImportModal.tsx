import React from 'react';
import Papa from 'papaparse';

interface BulkImportModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => void;
  expectedHeaders: string[];
}

export function BulkImportModal({ title, isOpen, onClose, onImport, expectedHeaders }: BulkImportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900">Close</button>
        </div>
        <p className="text-sm text-gray-600">Please upload a CSV file with the following headers: <strong>{expectedHeaders.join(', ')}</strong>.</p>
        <input type="file" accept=".csv" onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const actualHeaders = results.meta.fields || [];
              const missing = expectedHeaders.filter(h => !actualHeaders.includes(h));
              if (missing.length > 0) {
                alert(`Error: Missing or incorrect headers: ${missing.join(', ')}`);
                return;
              }
              onImport(results.data);
            }
          });
        }} className="w-full border rounded-lg p-2 text-sm" />
      </div>
    </div>
  );
}
