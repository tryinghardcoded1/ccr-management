import React, { useState, useEffect } from 'react';
import { Mail, Save, Upload, Wand2, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { useStore } from '../store';
import { EmailTemplateConfig } from '../types';

export default function EmailTemplate() {
  const store = useStore();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('new');
  const [templateName, setTemplateName] = useState('My Template');
  const [businessInfo, setBusinessInfo] = useState('');
  const [signature, setSignature] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [templateType, setTemplateType] = useState('Standard');
  const [aiPrompt, setAiPrompt] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (selectedTemplateId && selectedTemplateId !== 'new') {
      const t = store.emailTemplates.find(t => t.id === selectedTemplateId);
      if (t) {
        setTemplateName(t.name || 'My Template');
        setBusinessInfo(t.businessInfo || '');
        setSignature(t.signature || '');
        setCustomMessage(t.customMessage || '');
        setLogo(t.logo || null);
        setTemplateType(t.templateType || 'Standard');
      }
    } else {
      setTemplateName('My Template');
      setBusinessInfo('');
      setSignature('');
      setCustomMessage('');
      setLogo(null);
      setTemplateType('Standard');
    }
  }, [selectedTemplateId, store.emailTemplates]);

  const handleSave = async () => {
    setSaveStatus('saving');
    
    const templateData = {
      name: templateName,
      businessInfo,
      signature,
      customMessage,
      logo,
      templateType,
      isActive: selectedTemplateId !== 'new' ? store.emailTemplates.find(t => t.id === selectedTemplateId)?.isActive || false : false,
    };

    try {
      if (selectedTemplateId === 'new') {
        const id = await store.addEmailTemplate(templateData);
        setSelectedTemplateId(id);
      } else {
        await store.updateEmailTemplate(selectedTemplateId, templateData);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus('idle');
    }
  };

  const handleActivate = async () => {
    if (selectedTemplateId && selectedTemplateId !== 'new') {
      await store.activateEmailTemplate(selectedTemplateId);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const previewData = {
    customerName: 'John Doe',
    vehicle: 'Toyota Camry (2024)',
    pickupDate: '2026-06-25',
    returnDate: '2026-06-30',
    totalCost: '$450.00'
  };

  const injectVariables = (text: string) => {
    if (!text) return text;
    return text
      .replace(/{{customer_name}}/g, previewData.customerName)
      .replace(/{{vehicle}}/g, previewData.vehicle)
      .replace(/{{pickup_date}}/g, previewData.pickupDate)
      .replace(/{{return_date}}/g, previewData.returnDate)
      .replace(/{{total_cost}}/g, previewData.totalCost);
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <h1 className="text-2xl font-black text-slate-900 mb-8">Email Configuration</h1>
      
      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm font-semibold text-slate-700">Load Template:</label>
          <select 
            value={selectedTemplateId} 
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg text-sm min-w-[200px]"
          >
            <option value="new">+ Create New Template</option>
            {store.emailTemplates.map(t => (
              <option key={t.id} value={t.id}>{t.name} {t.isActive ? '(Active)' : ''}</option>
            ))}
          </select>
          {selectedTemplateId !== 'new' && (
             <button 
                onClick={handleActivate}
                disabled={store.emailTemplates.find(t => t.id === selectedTemplateId)?.isActive}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-semibold disabled:opacity-50"
             >
                Set as Active
             </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel: Customization */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-4">Customization</h2>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Template Name</label>
            <input 
              type="text" 
              value={templateName} 
              onChange={(e) => setTemplateName(e.target.value)} 
              className="w-full p-2 border border-slate-300 rounded-lg text-sm" 
              placeholder="e.g. Summer Promo Template"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Business Information</label>
            <textarea value={businessInfo} onChange={(e) => setBusinessInfo(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" rows={2} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Signature</label>
            <textarea value={signature} onChange={(e) => setSignature(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" rows={2} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Custom Short Message</label>
            <textarea 
              value={customMessage} 
              onChange={(e) => setCustomMessage(e.target.value)} 
              className="w-full p-2 border border-slate-300 rounded-lg text-sm" 
              rows={4} 
              placeholder="e.g. Your reservation for {{vehicle}} is confirmed!"
            />
            <p className="text-xs text-slate-500 mt-1">Available variables: {'{{customer_name}}'}, {'{{vehicle}}'}, {'{{pickup_date}}'}, {'{{return_date}}'}, {'{{total_cost}}'}</p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">Company Logo Source</label>
            
            {/* Logo Preview box */}
            <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {logo ? (
                <div className="relative">
                  <img src={logo} alt="Logo Preview" className="h-12 max-w-[150px] object-contain border border-slate-200 rounded p-1 bg-white" />
                  <button 
                    type="button" 
                    onClick={() => setLogo(null)} 
                    className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold leading-none"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="h-12 w-12 bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-xs font-semibold text-slate-500">
                  No Logo
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">Current Selection:</span>
                <span className="text-xs text-slate-700 font-mono truncate block">
                  {logo ? (logo.startsWith('data:') ? 'Uploaded Image (Base64)' : logo) : 'No logo selected (using placeholder)'}
                </span>
              </div>
            </div>

            {/* Quick logo options */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLogo('https://i.imgur.com/NMk2vsy.png')}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${logo === 'https://i.imgur.com/NMk2vsy.png' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                Use Default Logo
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const url = prompt('Enter image URL:', logo || '');
                  if (url !== null) setLogo(url || null);
                }}
                className="px-2 py-1.5 rounded-lg text-xs font-bold border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition text-center cursor-pointer"
              >
                Insert Link / URL
              </button>
              
              <label className="px-2 py-1.5 rounded-lg text-xs font-bold border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer text-center block">
                Upload File
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
            
            {/* Text input for manual URL check/entry */}
            <div className="mt-1">
              <input 
                type="text"
                placeholder="Or paste custom logo URL directly..."
                value={logo && !logo.startsWith('data:') ? logo : ''}
                onChange={(e) => setLogo(e.target.value || null)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Template Selector</label>
            <select value={templateType} onChange={(e) => setTemplateType(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm">
              <option>Standard</option>
              <option>Professional</option>
              <option>Minimalist</option>
            </select>
          </div>

          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <label className="block text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              AI Assistant
            </label>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} className="w-full p-2 border border-indigo-200 rounded-lg text-sm mb-2" rows={2} placeholder="Ask AI to refine your email..." />
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-sm transition">Generate Copy</button>
          </div>

          <button 
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition disabled:opacity-70"
          >
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? <><CheckCircle className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Configuration</>}
          </button>
        </div>

        {/* Right Panel: Preview */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Live Preview</h2>
          <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100 min-h-[400px]">
            {logo ? <img src={logo} alt="Logo" className="h-12 mb-6" /> : <div className="h-12 w-12 bg-slate-200 rounded mb-6 flex items-center justify-center">Logo</div>}
            
            <h3 className="text-xl font-bold mb-4">Booking Confirmation</h3>
            {businessInfo && <p className="text-sm mb-4 whitespace-pre-line text-slate-600 border-b pb-4">{injectVariables(businessInfo)}</p>}
            <p className="text-sm mb-4">Hi {previewData.customerName},</p>
            <p className="text-sm mb-4 whitespace-pre-line">{injectVariables(customMessage) || 'Your reservation is confirmed!'}</p>
            
            <div className="bg-slate-100 p-4 rounded-lg text-sm mb-6">
              <p><strong>Vehicle:</strong> {previewData.vehicle}</p>
              <p><strong>Pickup:</strong> {previewData.pickupDate}</p>
              <p><strong>Return:</strong> {previewData.returnDate}</p>
              <p><strong>Total:</strong> {previewData.totalCost}</p>
            </div>

            <p className="text-sm text-slate-600 mb-8 whitespace-pre-line">{injectVariables(signature) || 'Best regards, The Team'}</p>

            <div className="border-t pt-6 mt-6">
                <p className="text-sm font-semibold text-slate-700 mb-2">Need to make changes to your reservation?</p>
                <a href="/portal" className="text-indigo-600 font-semibold flex items-center gap-2 hover:underline">
                    <Phone className="w-4 h-4" />
                    Just click this link to talk to our AI voice assistant. Our AI will manage and update your reservation instantly—just ask it what you need changed.
                </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
