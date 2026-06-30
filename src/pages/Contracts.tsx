import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { useStore } from '../store';
import { useAuth } from '../store/authStore';
import { 
  FileText, Plus, Search, Trash2, UploadCloud, CheckCircle, 
  Eye, Scale, AlertCircle, Sparkles, BookOpen, Clock, Loader2, FileSignature
} from 'lucide-react';
import { RentalContract } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function Contracts() {
  const { contracts, addContract, activateContract, deleteContract } = useStore();
  const { user } = useAuth();
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  
  // New contract form state
  const [name, setName] = useState('');
  const [type, setType] = useState('Standard Rental Agreement');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  
  // Interactive UI state
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [isDragActive, setIsDragActive] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [viewingContract, setViewingContract] = useState<RentalContract | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats calculation
  const activeContract = contracts.find(c => c.status === 'Active');
  const totalContracts = contracts.length;
  const validTimestamps = contracts
    .map(c => c.uploadedAt ? new Date(c.uploadedAt).getTime() : 0)
    .filter(t => !isNaN(t) && t > 0);
  const lastUpdated = validTimestamps.length > 0
    ? new Date(Math.max(...validTimestamps))
    : null;

  const formatSafeDate = (dateStr: any, type: 'date' | 'dateTime' = 'date') => {
    try {
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return type === 'date' ? d.toLocaleDateString() : d.toLocaleString();
    } catch (e) {
      return String(dateStr || 'N/A');
    }
  };

  // Handle Drag over & leave
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  // Helper to handle parsing of files
  const processFile = (file: File) => {
    setFileName(file.name);
    // Format file size
    const sizeInKb = file.size / 1024;
    if (sizeInKb > 1024) {
      setFileSize((sizeInKb / 1024).toFixed(1) + ' MB');
    } else {
      setFileSize(sizeInKb.toFixed(0) + ' KB');
    }
    
    // Auto-fill form fields based on file metadata
    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    setName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    
    // Read the text content of the file (if it's a dry text/document) for pre-filling content
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setContent(e.target.result as string);
        }
      };
      reader.readAsText(file);
    } else {
      // Mock some realistic regulatory content clauses to pre-fill standard files
      setContent(`VEHICLE BAILMENT & INDEMNIFICATION AGREEMENT

Document reference: ${file.name}
Uploaded for Philly Car Rental Operations

This service standardizes vehicle delivery stipulations. This mock document represents the standard execution of the digital contract.

CLAUSES:
1. CONTRACT ENGAGEMENT
The Client confirms registration credentials and driver certification matches active licenses.

2. FEES AND FUEL INDEMNITY
Vehicle fueling must match the departure inventory. Any discrepancies trigger standard processing tolls.

3. LIQUIDITY & SECURITY PROTECTION
Refund holds or authorization flags are released within 7 banking days post clean inspections.`);
    }
  };

  // Drag Drop handler
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Click file select handler
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Form submit handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Please provide a descriptive contract name.');
      return;
    }
    if (!content.trim()) {
      setErrorMessage('Please specify or write the legal content/terms of the agreement.');
      return;
    }

    setIsLoading(true);
    try {
      const uEmail = user?.email || 'admin@fleetpro.com';
      await addContract({
        name,
        type,
        content,
        fileName: fileName || 'manual_draft_contract.txt',
        fileSize: fileSize || '12 KB',
      }, uEmail);

      setSuccessMessage(`"${name}" template uploaded successfully!`);
      // Reset form fields
      setName('');
      setType('Standard Rental Agreement');
      setContent('');
      setFileName('');
      setFileSize('');
    } catch (err: any) {
      console.error('[Contracts] Upload error:', err);
      setErrorMessage(err.message || 'Failed to upload contract template.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async (id: string, name: string) => {
    try {
      await activateContract(id);
      setSuccessMessage(`"${name}" is now the active default system contract!`);
    } catch (err: any) {
      setErrorMessage('Failed to activate selected contract.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete the contract template: "${name}"?`)) {
      try {
        await deleteContract(id);
        setSuccessMessage(`"${name}" was deleted successfully.`);
      } catch (err: any) {
        setErrorMessage('Failed to delete selected contract template.');
      }
    }
  };

  // Filtered list
  const filteredContracts = contracts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'active') return matchesSearch && c.status === 'Active';
    if (activeTab === 'inactive') return matchesSearch && c.status === 'Inactive';
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Scale className="w-8 h-8 text-indigo-500" />
            Contracts & Agreements
          </h2>
          <p className="text-sm font-medium text-slate-400 mt-1">
            Manage legal agreements, lease waivers, and terms. Upload templates and select the active default contract for customer check-out.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-405 uppercase tracking-wider">Active Agreement</p>
            <p className="text-sm font-black text-slate-900 truncate max-w-[200px]" title={activeContract?.name || 'None Active'}>
              {activeContract?.name || 'None Selected'}
            </p>
            <p className="text-[10px] text-emerald-600 font-bold uppercase mt-0.5">Currently Enforced</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-405 uppercase tracking-wider">Total Templates</p>
            <p className="text-2xl font-black text-slate-900">{totalContracts}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Documents Registered</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-405 uppercase tracking-wider">Registry Sync State</p>
            <p className="text-sm font-black text-slate-900">
              {lastUpdated && !isNaN(lastUpdated.getTime()) ? lastUpdated.toLocaleDateString() : 'N/A'}
            </p>
            <p className="text-[10px] text-amber-600 font-bold uppercase mt-0.5">Real-time Connected</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-150 text-emerald-700 rounded-xl text-sm font-bold"
          >
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
            <span className="flex-1">{successMessage}</span>
            <button onClick={() => setSuccessMessage('')} className="hover:opacity-70 text-emerald-500 ml-auto text-xs px-2 py-1 bg-white rounded border border-emerald-200">Dismiss</button>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 bg-red-50 border border-red-150 text-red-700 rounded-xl text-sm font-bold"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span className="flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="hover:opacity-70 text-red-500 ml-auto text-xs px-2 py-1 bg-white rounded border border-red-200">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Upload Column */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2 mb-4">
              <UploadCloud className="w-5 h-5 text-indigo-500" />
              Upload & Draft Agreement
            </h3>

            {/* Drag and Drop Zone */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragActive 
                  ? 'border-indigo-500 bg-indigo-50/30 shadow-inner' 
                  : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt,.pdf,.doc,.docx,.md"
                className="hidden" 
              />
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3 animate-pulse" />
              <p className="text-sm font-bold text-slate-700">Drag & drop document or check-out waiver</p>
              <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, TXT, or MD files (Max 5MB)</p>
              {fileName && (
                <div className="mt-4 p-2 bg-indigo-50 border border-indigo-100 rounded-lg inline-flex items-center gap-2 text-xs text-indigo-700 font-bold">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span className="truncate max-w-[220px]">{fileName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({fileSize})</span>
                </div>
              )}
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 mt-6">
              <div>
                <label className="text-xs font-bold text-slate-455 mb-1.5 block uppercase tracking-wider">Contract Name</label>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Philly Car Rental Agreement v2.2"
                  className="w-full text-sm bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-2.5 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-455 mb-1.5 block uppercase tracking-wider">Agreement Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-2.5 outline-none transition-all"
                >
                  <option value="Standard Rental Agreement">Standard Rental Agreement</option>
                  <option value="Premium SUV Waiver">Premium SUV Waiver</option>
                  <option value="Insurance Claim & Liability Waiver">Insurance Waiver & Liability</option>
                  <option value="Corporate Fleet Agreement">Corporate Fleet Terms</option>
                  <option value="Emergency Roadside Waver">Emergency Roadside Terms</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-455 mb-1.5 block uppercase tracking-wider">Contract Content & Clauses</label>
                <textarea
                  required
                  rows={9}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter or paste the complete legal terms and binding paragraphs for this agreement template here..."
                  className="w-full text-sm bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition-all font-sans leading-relaxed text-slate-700 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/15"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Registering Contract...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Upload Contract & Save Template
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Contract List Column */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full min-h-[500px]">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
              <div>
                <h3 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  Templates Register
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Search and managing contracts in real-time.</p>
              </div>

              {/* Tabs */}
              <div className="flex space-x-1 p-1 bg-slate-100/50 rounded-xl border border-slate-200/50 self-start md:self-auto">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'all'
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All ({contracts.length})
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'active'
                      ? 'bg-white text-emerald-600 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Active ({contracts.filter(c => c.status === 'Active').length})
                </button>
                <button
                  onClick={() => setActiveTab('inactive')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'inactive'
                      ? 'bg-white text-slate-600 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Inactive ({contracts.filter(c => c.status === 'Inactive').length})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search templates by custom key strings, title clauses or type..."
                className="w-full text-xs bg-slate-50 border border-slate-200 hover:border-slate-350 focus:border-indigo-500 focus:bg-white rounded-xl pl-10 pr-4 py-3 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* List / Register Table */}
            <div className="space-y-4 flex-1">
              {filteredContracts.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                  <FileSignature className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-700">No contract templates discovered</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    No files found for search "{searchTerm}" or selected status. Create/upload one or clear filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredContracts.map((contract) => (
                    <div 
                      key={contract.id}
                      className={`p-4 rounded-xl border transition-all ${
                        contract.status === 'Active'
                          ? 'bg-emerald-50/20 border-emerald-200 hover:border-emerald-300'
                          : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            contract.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-slate-900 truncate" title={contract.name}>{contract.name}</h4>
                              {contract.status === 'Active' ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider border border-emerald-200">
                                  Default Active
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider border border-slate-200">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 font-medium">{contract.type}</p>
                            
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2 font-mono flex-wrap">
                              <span>Uploaded: {formatSafeDate(contract.uploadedAt, 'date')}</span>
                              <span className="hidden sm:inline">•</span>
                              <span>Staff: {contract.uploadedBy}</span>
                              {contract.fileName && (
                                <>
                                  <span className="hidden sm:inline">•</span>
                                  <span className="truncate max-w-[150px]">{contract.fileName} ({contract.fileSize})</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setViewingContract(contract)}
                            type="button"
                            title="Quick View Legal Terms"
                            className="bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 p-2 rounded-lg border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {contract.status === 'Inactive' && (
                            <button
                              onClick={() => handleActivate(contract.id, contract.name)}
                              type="button"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm"
                            >
                              Activate
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(contract.id, contract.name)}
                            type="button"
                            title="Delete Template"
                            className="bg-slate-50 hover:bg-red-50 hover:text-red-650 p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Important Info Alert Box */}
            <div className="mt-6 p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <span className="text-xs font-black text-indigo-900 uppercase tracking-wider block">Operational Integration Info</span>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  The document marked as <strong className="text-indigo-800">Default Active</strong> serves as the automated legally-binding lease agreement inside the system. Returning customers are aligned to this agreement record. Change the active template to dynamically update terms during future reservation events.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Viewing Contract Terms Modal */}
      <AnimatePresence>
        {viewingContract && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-150 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    viewingContract.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    <FileText className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-950 text-base">{viewingContract.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{viewingContract.type} • Status: {viewingContract.status}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingContract(null)}
                  className="rounded-lg p-2 bg-white hover:bg-slate-150 border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  &times; Close
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-700 bg-slate-50/50">
                {viewingContract.content}
              </div>

              <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
                <div className="text-[10px] text-slate-400 font-medium">
                  Author: <span className="font-bold">{viewingContract.uploadedBy}</span> • Updated: {formatSafeDate(viewingContract.uploadedAt, 'dateTime')}
                </div>
                {viewingContract.status === 'Inactive' ? (
                  <button
                    onClick={() => {
                      handleActivate(viewingContract.id, viewingContract.name);
                      setViewingContract(null);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Activate agreement
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-150">
                    <CheckCircle className="w-4 h-4 text-emerald-550" />
                    Currently Default Lease Contract
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
