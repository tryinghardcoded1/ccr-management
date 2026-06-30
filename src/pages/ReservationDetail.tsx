import React, { useState, useMemo } from 'react';
import { useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../store/authStore';
import { ReservationStatus, ChargeCategory, PaymentStatus, Vehicle as StoreVehicle } from '../types';
import { format, differenceInDays, parseISO } from 'date-fns';
import { 
  ArrowLeft, Car, User, Calendar, DollarSign, Clock, CreditCard, 
  Plus, CheckCircle, AlertTriangle, Shuffle, ShieldAlert, Check, FileText, Printer, Lock, ChevronDown, RefreshCw
} from 'lucide-react';

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const store = useStore();
  const { user } = useAuth();
  
  const reservation = store.reservations.find(r => r.id === id);
  const customer = store.customers.find(c => c.id === reservation?.customerId);
  const vehicle = store.vehicles.find(v => v.id === reservation?.vehicleId);
  const charges = store.chargeItems.filter(c => c.reservationId === id);
  const payments = store.payments.filter(p => p.reservationId === id);
  const activeContractObj = store.contracts.find(c => c.status === 'Active');

  const formatDate = (dateStr: any, formatPattern: string = 'MMM d, yyyy') => {
    try {
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return format(d, formatPattern);
    } catch (e) {
      return String(dateStr || 'N/A');
    }
  };

  // Active floating dialog modal state
  const [activeModal, setActiveModal] = useState<null | 'payment' | 'claim' | 'fine' | 'external' | 'switch' | 'deposit' | 'returnVehicle' | 'agreement' | 'initial_checkout'>(null);
  const [hasSeenAgreement, setHasSeenAgreement] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const handleSendAgreementEmail = async () => {
    if (isSendingEmail) return;
    if (!customer || !reservation || !vehicle) return;
    try {
      setIsSendingEmail(true);
      
      const agreementText = activeContractObj ? activeContractObj.content : `RENTAL AGREEMENT TERMS AND CONDITIONS\n\n1. VEHICLE USE: The renter agrees to operate the vehicle in a safe and lawful manner. Only authorized drivers may operate the vehicle.\n2. RETURN POLICY: The vehicle must be returned to Philly Car Rental on the scheduled date and time in the same condition as received.\n3. TOLLS & FINES: The renter is solely responsible for all traffic violations, speed camera tickets, tolls, and other fines incurred during the rental.\n4. DAMAGE RESPONSIBILITY: The renter assumes full responsibility for any new physical damage, scratches, dents, or structural problems discovered upon return.\n\nPlease sign the contract to complete the agreement.`;
      
      const activeTemplate = store.emailTemplates.find(t => t.isActive);

      const res = await fetch('/api/email/send-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: customer.email,
          customerName: `${customer.firstName} ${customer.lastName}`,
          reservationId: reservation.id,
          vehicleName: `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
          pickupDate: formatDate(reservation.pickupDate),
          returnDate: formatDate(reservation.returnDate),
          agreementText: agreementText,
          logo: activeTemplate?.logo || 'https://i.imgur.com/NMk2vsy.png',
          businessInfo: activeTemplate?.businessInfo || 'Rent A.i. - Car Rental',
          signature: activeTemplate?.signature || 'The Rent A.i. Team'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const todayStr = new Date().toISOString().split('T')[0];
        await store.updateReservation(reservation.id, {
          agreementSentDate: formatDate(todayStr)
        });

        try {
          await store.addGeneratedContract({
            reservationId: reservation.id,
            customerId: customer.id,
            vehicleId: vehicle.id,
            templateName: activeContractObj?.name || 'Standard Rental Agreement',
            pdfUrl: '#',
            status: 'GENERATED'
          });
        } catch (contractErr) {
          console.error("Failed to add generated contract to store:", contractErr);
        }

        alert(`Rental agreement successfully sent to ${customer.email}!`);
      } else {
        throw new Error(data.error || 'Failed to send email.');
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error sending email: ${e.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleRegenerate = async () => {
    if (isRegenerating) return;
    if (!reservation || !vehicle) return;
    setIsRegenerating(true);
    try {
      await store.regenerateContract(reservation.id);
      alert("Agreement contract successfully regenerated with updated terms, duration, pricing, and vehicle assignment.");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to regenerate contract: ${err.message || err}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  React.useEffect(() => {
    if (location.state?.openCheckout && reservation && reservation.status === 'Pending') {
      setActiveModal('initial_checkout');
      // Update browser history state to avoid reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, reservation]);

  // Modal Form States
  const [paymentForm, setPaymentForm] = useState({ amount: 0, method: 'Credit Card', label: 'Rental Payment' });
  const [claimForm, setClaimForm] = useState({ description: '', amount: 0, notes: '' });
  const [fineForm, setFineForm] = useState({ description: '', amount: 0, notes: '' });
  const [externalForm, setExternalForm] = useState({ description: '', amount: 0, notes: '' });
  const [switchForm, setSwitchForm] = useState({ newVehicleId: '', upgradeFee: 0, notes: '' });
  const [depositForm, setDepositForm] = useState({ amount: 500, holdUntil: '', method: 'Credit Card' });
  const [refundForm, setRefundForm] = useState({ amount: 0, method: 'Credit Card' });
  const [refundType, setRefundType] = useState<'Full' | 'Partial'>('Full');
  const [deductionReason, setDeductionReason] = useState<'Traffic Violation' | 'Late Return' | 'Car Damage' | 'Other'>('Late Return');
  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [refundNotes, setRefundNotes] = useState<string>('');
  const [noteText, setNoteText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSaveStatus('saving');
    const timestamp = new Date().toLocaleString();
    const staffName = user?.name || 'Staff Member';
    const newNote = `[${timestamp}] [Staff: ${staffName}] || ${noteText}`;
    const updatedNotes = reservation.notes ? `${newNote}\n${reservation.notes}` : newNote;
    await store.updateReservation(reservation.id, { notes: updatedNotes });
    setNoteText('');
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  if (!reservation || !customer || !vehicle) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-100 shadow-sm max-w-md mx-auto mt-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Reservation Not Found</h3>
        <p className="text-gray-500 mb-6">The requested reservation ID could not be loaded.</p>
        <Link to="/reservations" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          Back to Reservations
        </Link>
      </div>
    );
  }

  // Calculate rental days
  let rentalDays = 1;
  try {
    const start = parseISO(reservation.pickupDate);
    const end = parseISO(reservation.returnDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const d = differenceInDays(end, start);
      rentalDays = isNaN(d) || d < 1 ? 1 : d;
    }
  } catch (e) {
    rentalDays = 1;
  }

  // Filters and breakdowns
  const externalCharges = charges.filter(c => c.category === 'External Charge');
  const claims = charges.filter(c => c.category === 'Claim');
  const fines = charges.filter(c => c.category === 'Fine');
  const switchFees = charges.filter(c => c.category === 'Vehicle Switch');

  // Validate completion rules
  const pendingCharges = charges.some(c => c.paymentStatus === 'Pending');
  
  const completionBlockers: string[] = [];
  if (!reservation.vehicleReturned) {
    completionBlockers.push("Vehicle must be returned (Vehicle Returned = True)");
  }
  if (reservation.status !== 'Checked Out') {
    completionBlockers.push("Reservation status must be 'Checked Out' before completion");
  }
  if (reservation.balance > 0) {
    completionBlockers.push(`There is an outstanding balance of $${(reservation.balance || 0).toFixed(2)}`);
  }
  if (pendingCharges) {
    completionBlockers.push("All additional charges (Fines, Claims, etc.) must be Paid in full");
  }

  const handleConfirmReservation = () => {
    if (reservation.status === 'Closed') return;
    store.updateReservationStatus(reservation.id, 'Confirmed');
  };

  const handleCheckOut = async () => {
     if (reservation.status === 'Closed') return;
     setActiveModal('initial_checkout'); 
  };

  const handleReturnVehicle = async () => {
       if (reservation.status === 'Closed') return;
       await handleProcessReturn();
  };

  const handleRefundDeposit = async () => {
        if (reservation.status === 'Closed') return;
        setRefundForm({ amount: reservation.securityDepositAmount, method: 'Credit Card' });
        setActiveModal('deposit');
  };

  const isClosed = reservation.status === 'Closed';

  const handleProcessReturn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Just mark vehicle returned and complete reservation
    await store.markVehicleReturned(reservation.id);
    await store.updateReservationStatus(reservation.id, 'Completed');
    
    setActiveModal(null);
  };

  const handleCompleteReservation = () => {
    if (completionBlockers.length > 0) {
      alert(`Cannot complete booking yet:\n\n${completionBlockers.join('\n')}`);
      return;
    }
    store.updateReservationStatus(reservation.id, 'Completed');
  };

  const handleInitialCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await store.checkoutReservation(
        reservation.id,
        depositForm.amount || 500,
        depositForm.holdUntil || format(parseISO(reservation.returnDate), 'yyyy-MM-dd'),
        paymentForm.method
      );
      setActiveModal(null);
    } catch (err: any) {
      alert("Error processing checkout: " + err.message);
    }
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentForm.amount <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }
    
    // Auto-pay existing pending charges when paying off balance
    if (paymentForm.amount >= reservation.balance - 0.01) {
      charges.forEach(c => {
        if (c.paymentStatus === 'Pending') {
          store.updateChargeItemStatus(c.id, 'Paid');
        }
      });
    }

    store.addPayment({
      reservationId: reservation.id,
      customerId: customer.id,
      amount: paymentForm.amount,
      method: paymentForm.method,
      label: paymentForm.label || 'Payment Received',
      date: new Date().toISOString(),
      type: 'payment'
    });
    
    // Auto confirm if no deposit needed and fully paid
    if (paymentForm.amount >= reservation.balance - 0.01 && reservation.securityDepositStatus === 'None') {
       store.updateReservationStatus(reservation.id, 'Checked In');
    }
    
    setActiveModal(null);
    setPaymentForm({ amount: 0, method: 'Credit Card', label: 'Rental Payment' });
  };

  const handleAddClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (claimForm.amount <= 0 || !claimForm.description) {
      alert("Please specify a valid description and positive amount.");
      return;
    }
    store.addChargeItem({
      reservationId: reservation.id,
      customerId: customer.id,
      vehicleId: vehicle.id,
      category: 'Claim',
      description: claimForm.description,
      amount: claimForm.amount,
      paymentStatus: 'Pending',
      date: new Date().toISOString(),
      notes: claimForm.notes
    });
    setActiveModal(null);
    setClaimForm({ description: '', amount: 0, notes: '' });
  };

  const handleAddFine = (e: React.FormEvent) => {
    e.preventDefault();
    if (fineForm.amount <= 0 || !fineForm.description) {
      alert("Please specify a valid description and positive amount.");
      return;
    }
    store.addChargeItem({
      reservationId: reservation.id,
      customerId: customer.id,
      vehicleId: vehicle.id,
      category: 'Fine',
      description: fineForm.description,
      amount: fineForm.amount,
      paymentStatus: 'Pending',
      date: new Date().toISOString(),
      notes: fineForm.notes
    });
    setActiveModal(null);
    setFineForm({ description: '', amount: 0, notes: '' });
  };

  const handleAddExternalCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (externalForm.amount <= 0 || !externalForm.description) {
      alert("Please specify a valid description and positive amount.");
      return;
    }
    store.addChargeItem({
      reservationId: reservation.id,
      customerId: customer.id,
      vehicleId: vehicle.id,
      category: 'External Charge',
      description: externalForm.description,
      amount: externalForm.amount,
      paymentStatus: 'Pending',
      date: new Date().toISOString(),
      notes: externalForm.notes
    });
    setActiveModal(null);
    setExternalForm({ description: '', amount: 0, notes: '' });
  };

  const handleVehicleSwitchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newVehicleId = switchForm.newVehicleId;
    if (!newVehicleId) {
      alert("Please select a valid vehicle to switch to.");
      return;
    }

    const oldVehicleId = reservation.vehicleId;
    const targetVehicle = store.vehicles.find(v => v.id === newVehicleId);
    if (!targetVehicle) return;

    // 1. Mark old vehicle status as Available
    store.updateVehicle(oldVehicleId, { status: 'Available' });

    // 2. Add Vehicle Switch charge item record
    store.addChargeItem({
      reservationId: reservation.id,
      customerId: customer.id,
      vehicleId: newVehicleId,
      category: 'Vehicle Switch',
      description: `Switch: ${vehicle.make} ${vehicle.model} -> ${targetVehicle.make} ${targetVehicle.model}`,
      amount: switchForm.upgradeFee,
      paymentStatus: 'Pending',
      date: new Date().toISOString(),
      notes: switchForm.notes,
      oldVehicleId,
      newVehicleId
    });

    // 3. Update reservation vehicleId (triggers sync for new vehicle state)
    store.updateReservation(reservation.id, { vehicleId: newVehicleId });

    setActiveModal(null);
    setSwitchForm({ newVehicleId: '', upgradeFee: 0, notes: '' });
  };

  const handleProcessDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (depositForm.amount <= 0) {
      alert("Please select a deposit amount.");
      return;
    }
    store.processSecurityDeposit(reservation.id, depositForm.amount, depositForm.holdUntil);
    // After deposit collection, usually status becomes Checked In
    if (reservation.status === 'Pending') {
      store.updateReservationStatus(reservation.id, 'Checked In');
    }
    setActiveModal(null);
  };

  const handleRefundDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRefundAmount = refundType === 'Full' 
      ? reservation.securityDepositAmount 
      : Math.max(0, reservation.securityDepositAmount - deductionAmount);

    await store.refundAndCompleteReservation(
      reservation.id,
      finalRefundAmount,
      refundForm.method,
      refundType === 'Partial' ? deductionReason : undefined,
      refundType === 'Partial' ? deductionAmount : 0,
      refundNotes
    );
    setActiveModal(null);
  };

  // Obtain available vehicles for the Switch Vehicle dropdown
  const availableSwitchVehicles = store.vehicles.filter(v => v.id !== vehicle.id && v.status === 'Available');

  // Auto-display logic for Step 5 & 6 (Payment and Security Deposit)
  const isPaymentPending = reservation.status === 'Pending' && reservation.balance > 0 && payments.filter(p => p.type === 'payment').length === 0;
  const isDepositPending = reservation.balance === 0 && reservation.securityDepositStatus === 'Pending';
  const isAgreementPending = reservation.status === 'Checked In' && !hasSeenAgreement;
  
  React.useEffect(() => {
    if (isPaymentPending && !activeModal) {
      setPaymentForm(prev => ({ ...prev, amount: reservation.balance }));
      setActiveModal('payment');
    } else if (!isPaymentPending && isDepositPending && !activeModal) {
      setDepositForm(prev => ({ ...prev, amount: reservation.securityDepositAmount }));
      setActiveModal('deposit');
    } else if (!isPaymentPending && !isDepositPending && !activeModal && !hasSeenAgreement && !store.generatedContracts.some(c => c.reservationId === reservation.id)) {
      setActiveModal('agreement');
    }
  }, [isPaymentPending, isDepositPending, activeModal, reservation.balance, reservation.securityDepositAmount, store.generatedContracts, reservation.id, hasSeenAgreement]);

  React.useEffect(() => {
    if (searchParams.get('modal') === 'agreement') {
      setActiveModal('agreement');
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
        {/* Header Info */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200 pb-5">
          <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                Booking {reservation.id.substring(0, 8).toUpperCase()}
              </h2>
              <div className="relative inline-block">
                {reservation.status === 'Checked In' ? (
                  <button 
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>{reservation.status}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border
                    ${reservation.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                      reservation.status === 'Closed' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      reservation.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 
                      reservation.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                      'bg-blue-50 text-blue-700 border-blue-200'}`}
                  >
                    {reservation.status}
                  </span>
                )}
                
                {isStatusDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-200 z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Change Reservation Status
                      </div>
                      <button
                        onClick={async () => {
                          setIsStatusDropdownOpen(false);
                          await store.updateReservationStatus(reservation.id, 'Checked Out');
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50 transition flex items-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4 text-blue-600" />
                        🚀 Change Status to Checked Out
                      </button>
                    </div>
                  </>
                )}
              </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
              {reservation.status === 'Completed' && (
                <button onClick={handleRefundDeposit} className={reservation.securityDepositRefunded ? "px-4 py-2 bg-gray-300 text-white rounded-lg text-sm font-bold" : "px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-red-700"}>
                  {reservation.securityDepositRefunded ? 'Deposit Refunded' : 'Refund Deposit'}
                </button>
              )}
              <Link 
                to={`/reservations/new?customerId=${customer.id}`} 
                className="px-4 py-2 bg-[#001D4A] hover:bg-opacity-90 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                style={{ backgroundColor: '#1e3a8a' }}
              >
                Assign New Vehicle
              </Link>
          </div>
        </div>

      {/* Main Column Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COMPONENT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Booking Summary */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center border-b pb-3 mb-2 gap-2 text-indigo-600">
              <Calendar className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 text-base">Booking Summary</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">ID Reference</span>
                <span className="font-mono text-gray-900 bg-gray-50 py-1 px-2 rounded inline-block text-xs">
                  {reservation.id}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Daily Rental Rate</span>
                <span className="font-semibold text-gray-900">${vehicle.dailyRate.toFixed(2)} / Day</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Assigned Unit</span>
                <span className="font-semibold text-gray-950">{vehicle.year} {vehicle.make} {vehicle.model}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Unit Plate</span>
                <span className="font-mono uppercase text-gray-900 font-bold">{vehicle.licensePlate}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-2 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Pickup Session</span>
                <span className="font-medium text-gray-900">{reservation.pickupDate}</span>
                <span className="text-xs text-gray-500 block">{reservation.pickupTime}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Target Return</span>
                <span className="font-medium text-gray-900">{reservation.returnDate}</span>
                <span className="text-xs text-gray-500 block">{reservation.returnTime}</span>
              </div>
              <div className="space-y-1 col-span-2 lg:col-span-1">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Rental Timeline</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded inline-block">
                  {rentalDays} Day{rentalDays > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {reservation.notes && !reservation.notes.includes(' || ') && (
              <div className="bg-gray-50 p-3 rounded-lg text-xs mt-2 border border-gray-100">
                <span className="font-bold text-gray-500 uppercase tracking-wide block mb-1">Reservation Comments</span>
                <p className="text-gray-700">{reservation.notes}</p>
              </div>
            )}
          </div>

          {/* Section 2: CUSTOMER DETAILS */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center border-b pb-3 mb-2 gap-2 text-indigo-600">
              <User className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 text-base">CUSTOMER DETAILS</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Name</span>
                <span className="font-semibold text-gray-900">{customer.firstName} {customer.lastName}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Mobile Device</span>
                <span className="font-medium text-gray-900">{customer.phone}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Email Address</span>
                <span className="font-medium text-gray-900">{customer.email}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Drivers Credentials</span>
                <span className="font-mono text-gray-900">{customer.driverLicenseNumber}</span>
                <span className="text-xs text-gray-500 ml-2">(Exp: {customer.driverLicenseExpiration})</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Geographic Footprint</span>
                <span className="font-medium text-gray-900">
                  {customer.street} {customer.street2 ? `, ${customer.street2}` : ''}, {customer.city}, {customer.state} {customer.zip}, {customer.country}
                </span>
              </div>
            </div>

            {customer.notes && (
              <div className="text-xs text-gray-600 italic border-l-2 border-indigo-500 pl-3">
                Customer specific warnings: {customer.notes}
              </div>
            )}
          </div>

          {/* Section 3: RENTAL AGREEMENT */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center border-b pb-3 mb-2 gap-2 text-indigo-600">
              <FileText className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 text-base uppercase">RENTAL AGREEMENT</h3>
            </div>

            <div className="space-y-4">
              {/* Dynamic status indicators */}
              {reservation.agreementStatus === 'Signed' ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 font-semibold text-lg leading-none">🟢</div>
                  <div>
                    <h4 className="font-bold text-emerald-900 text-sm">Contract Signed Successfully</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      The agreement terms are locked. Customer signed on <span className="font-bold">{reservation.agreementSignedDate || formatDate(new Date().toISOString())}</span>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-700 font-semibold text-lg leading-none animate-pulse">🟡</div>
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">Agreement Pending Signature</h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      The customer needs to review and sign the agreement. Sent date: <span className="font-semibold text-amber-900">{reservation.agreementSentDate || 'Not sent yet'}</span>.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 text-sm border-t border-b border-slate-100 py-3 my-1">
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Sent Date</span>
                  <span className="font-semibold text-gray-950 block">
                    {reservation.agreementSentDate || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Signed Date</span>
                  <span className="font-semibold text-gray-955 block">
                    {reservation.agreementStatus === 'Signed' 
                      ? (reservation.agreementSignedDate || formatDate(new Date().toISOString())) 
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => setActiveModal('agreement')}
                  className="px-4 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-indigo-700 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  [ View Agreement ]
                </button>

                {/* Status Toggle Button */}
                {reservation.agreementStatus !== 'Signed' ? (
                  <button
                    onClick={async () => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      await store.updateReservation(reservation.id, {
                        agreementStatus: 'Signed',
                        agreementSignedDate: formatDate(todayStr)
                      });
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    🟢 Mark as Signed
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await store.updateReservation(reservation.id, {
                        agreementStatus: 'Pending',
                        agreementSignedDate: undefined
                      });
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    🟡 Mark as Pending
                  </button>
                )}

                {/* Email Agreement Button with loading spinner */}
                <button
                  disabled={isSendingEmail}
                  onClick={handleSendAgreementEmail}
                  className="px-4 py-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSendingEmail ? (
                    <>
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-700 border-t-transparent rounded-full"></span>
                      Sending...
                    </>
                  ) : (
                    <>📧 Email Agreement</>
                  )}
                </button>

                {/* Regenerate Contract Button */}
                <button
                  disabled={isRegenerating}
                  onClick={handleRegenerate}
                  className="px-4 py-2 border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isRegenerating ? (
                    <>
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-violet-700 border-t-transparent rounded-full"></span>
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" />
                      Regenerate Contract
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Staff Notes */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center border-b pb-3 mb-2 gap-2 text-indigo-600">
              <FileText className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 text-base">Staff Notes</h3>
            </div>
            
            {/* Notes Display */}
            <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
                {(reservation.notes || '').split('\n').filter(n => n.trim() !== '').map((note, i) => {
                    const parts = note.split(' || ');
                    if (parts.length > 1) {
                      const meta = parts[0];
                      const content = parts[1];
                      const metaMatch = meta.match(/^\[(.*?)\]\s*\[Staff:\s*(.*?)\]/);
                      if (metaMatch) {
                        const dateTime = metaMatch[1];
                        const staffName = metaMatch[2];
                        return (
                          <div key={i} className="p-3 bg-zinc-50 rounded-lg text-sm text-zinc-700 border-l-4 border-indigo-500 shadow-sm space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold uppercase tracking-wider pb-1 border-b border-zinc-100">
                              <span>Staff: <span className="text-indigo-600">{staffName}</span></span>
                              <span>{dateTime}</span>
                            </div>
                            <p className="text-zinc-800 font-medium whitespace-pre-wrap pt-0.5">{content}</p>
                          </div>
                        );
                      }
                    }
                    return (
                      <div key={i} className="p-3 bg-zinc-50 rounded-lg text-sm text-zinc-700 border-l-4 border-gray-300 whitespace-pre-wrap">
                        {note}
                      </div>
                    );
                })}
            </div>

            <textarea
              className="w-full h-24 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              placeholder="Add a new note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={async (e) => {
                 if (e.key === 'Enter') {
                   e.preventDefault();
                   await handleSaveNote();
                 }
              }}
            />
            <div className="flex justify-between items-center">
                <button 
                  onClick={handleSaveNote}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
                >
                    {saveStatus === 'saving' ? 'Saving...' : 'Save Note'}
                </button>
                {saveStatus === 'saved' && <span className="text-xs text-green-600 font-medium">Saved</span>}
            </div>
          </div>

          {/* Section 5: Reservation History */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center border-b pb-3 mb-2 gap-2 text-indigo-600">
              <Clock className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 text-base">Reservation History</h3>
            </div>
            <div className="space-y-2">
              {store.reservations
                .filter(r => r.customerId === customer.id)
                .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime())
                .map(r => (
                  <Link
                    key={r.id}
                    to={`/reservations/${r.id}`}
                    className="block p-3 bg-gray-50 hover:bg-indigo-50 rounded-lg text-sm flex justify-between items-center"
                  >
                    <span className="font-mono text-xs text-gray-600">RES-{r.id.substring(0, 5).toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                      {r.status}
                    </span>
                    <span className="text-xs text-gray-500">{r.pickupDate}</span>
                  </Link>
                ))}
            </div>
          </div>

        </div>

        {/* RIGHT STICKY FINANCIAL SUMMARY AND ACTIONS */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 space-y-6">
          
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md flex flex-col space-y-6">
            
            {/* Outstanding Balance Heading */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <span className="text-gray-800 font-bold text-lg">Outstanding Balance</span>
              <span className={`text-xl font-extrabold ${reservation.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                ${(reservation.balance || 0).toFixed(2)}
              </span>
            </div>

            {/* QUICK ACTIONS ON TOP */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Staff Operations</span>
              
              <div className="grid grid-cols-2 gap-2">
                {reservation.balance > 0 && (
                  <button 
                    disabled={isClosed}
                    onClick={() => {
                      setPaymentForm(prev => ({ ...prev, amount: reservation.balance }));
                      setActiveModal('payment');
                    }}
                    className={`w-full text-white rounded-lg py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm leading-none
                      ${isClosed ? 'bg-indigo-300 opacity-50 cursor-not-allowed' : 'bg-indigo-650 hover:bg-indigo-700 cursor-pointer'}`}
                    style={!isClosed ? { backgroundColor: '#4f46e5' } : undefined}
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Record Payment
                  </button>
                )}
                
                <button 
                  disabled={isClosed}
                  onClick={() => setActiveModal('claim')}
                  className={`w-full border rounded-lg py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm leading-none
                    ${isClosed 
                      ? 'border-gray-200 text-gray-400 bg-gray-50 opacity-50 cursor-not-allowed' 
                      : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50 cursor-pointer'}`}
                >
                  <Plus className="w-3.5 h-3.5 text-gray-400" /> Add Claim
                </button>

                <button 
                  disabled={isClosed}
                  onClick={() => setActiveModal('fine')}
                  className={`w-full border rounded-lg py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm leading-none
                    ${isClosed 
                      ? 'border-gray-200 text-gray-400 bg-gray-50 opacity-50 cursor-not-allowed' 
                      : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50 cursor-pointer'}`}
                >
                  <Plus className="w-3.5 h-3.5 text-gray-400" /> Add Fine
                </button>

                <button 
                  disabled={isClosed}
                  onClick={() => setActiveModal('external')}
                  className={`w-full border rounded-lg py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm leading-none
                    ${isClosed 
                      ? 'border-gray-200 text-gray-400 bg-gray-50 opacity-50 cursor-not-allowed' 
                      : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50 cursor-pointer'}`}
                >
                  <Plus className="w-3.5 h-3.5 text-gray-400" /> External Charge
                </button>

                <button 
                  disabled={isClosed}
                  onClick={() => {
                    const firstAvail = availableSwitchVehicles[0]?.id || '';
                    setSwitchForm({ newVehicleId: firstAvail, upgradeFee: 0, notes: '' });
                    setActiveModal('switch');
                  }}
                  className={`w-full border rounded-lg py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm leading-none
                    ${isClosed 
                      ? 'border-gray-200 text-gray-400 bg-gray-50 opacity-50 cursor-not-allowed' 
                      : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50 cursor-pointer'}`}
                >
                  <Shuffle className="w-3.5 h-3.5 text-indigo-500" /> Switch Vehicle
                </button>

                <button 
                  disabled={isClosed}
                  onClick={() => {
                    setRefundForm({ amount: reservation.securityDepositAmount, method: 'Credit Card' });
                    setActiveModal('deposit');
                  }}
                  className={`w-full border rounded-lg py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm leading-none
                    ${isClosed 
                      ? 'border-gray-200 text-gray-400 bg-gray-50 opacity-50 cursor-not-allowed' 
                      : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50 cursor-pointer'}`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-orange-500" /> Security Deposit
                </button>
                <button 
                  onClick={() => setActiveModal('agreement')}
                  className="w-full border border-gray-200 text-gray-700 bg-white rounded-lg py-2 px-3 text-xs font-bold hover:bg-gray-50 transition flex items-center justify-center gap-1 shadow-sm leading-none cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-gray-500" /> View Agreement
                </button>
              </div>

              <div className="pt-2 space-y-2">
                {reservation.status === 'Checked In' && (
                  <button 
                    onClick={async () => {
                      await store.updateReservationStatus(reservation.id, 'Checked Out');
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 px-4 text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Check Out Vehicle (Handover Keys)
                  </button>
                )}

                {reservation.status === 'Checked Out' && (
                  <>
                    {!reservation.vehicleReturned ? (
                      <button 
                        onClick={() => setActiveModal('returnVehicle')}
                        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 px-4 text-xs font-bold shadow transition flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> Return Vehicle Checklist
                      </button>
                    ) : (
                      <div className="bg-green-50 text-green-850 p-2.5 rounded-lg border border-green-200 text-xs font-medium text-center flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-green-600" /> Vehicle Returned
                      </div>
                    )}

                    <button 
                      onClick={handleCompleteReservation}
                      disabled={completionBlockers.length > 0}
                      className="w-full bg-indigo-650 hover:bg-indigo-750 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-650 text-white rounded-lg py-2.5 px-4 text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#4f46e5' }}
                    >
                      <CheckCircle className="w-4 h-4" /> Complete Booking File
                    </button>
                  </>
                )}
              </div>

              {/* Completion Rules Warning panel */}
              {completionBlockers.length > 0 && reservation.status !== 'Completed' && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-lg space-y-2 text-orange-850 mt-2">
                  <span className="font-extrabold uppercase tracking-wide text-orange-950 block">Missing Requirements:</span>
                  <ul className="list-disc pl-5 space-y-1 text-sm opacity-90">
                    {completionBlockers.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-extrabold text-gray-900 text-lg border-b border-gray-100 pb-3 mt-4">
                Financial Summary
              </h3>
            </div>

            {/* ORDERED FINANCIAL BREAKDOWN */}
            <div className="space-y-6 text-sm">
              
              {/* 1. Base Rental */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-900 uppercase text-xs tracking-wider">Base Rental</span>
                  <span className="font-extrabold text-gray-950">${(reservation.baseRental || 0).toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {rentalDays} Day{rentalDays > 1 ? 's' : ''} × ${(vehicle.dailyRate || 0).toFixed(2)}
                </div>
              </div>

              {/* 2. External Charges */}
              {externalCharges.length > 0 && (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-950 uppercase text-xs tracking-wider">External Charges</span>
                </div>
                  <div className="space-y-2">
                    {externalCharges.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-medium text-gray-900">{item.description}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <span className="font-medium text-gray-900">${item.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
              )}

              {/* 3. Claims */}
              {claims.length > 0 && (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <span className="font-bold text-gray-950 uppercase text-xs tracking-wider block">Claims</span>
                  <div className="space-y-2">
                    {claims.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-medium text-gray-900">{item.description}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <span className="font-medium text-gray-900">${item.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
              )}

              {/* 4. Fines */}
              {fines.length > 0 && (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <span className="font-bold text-gray-950 uppercase text-xs tracking-wider block">Fines</span>
                  <div className="space-y-2">
                    {fines.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-medium text-gray-900">{item.description}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <span className="font-medium text-gray-900">${item.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
              )}

              {/* 5. Vehicle Switch Fees */}
              {switchFees.length > 0 && (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <span className="font-bold text-gray-950 uppercase text-xs tracking-wider block">Vehicle Switch Fees</span>
                  <div className="space-y-2">
                    {switchFees.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-medium text-gray-900">{item.description}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <span className="font-medium text-gray-900">${item.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
              )}

              {/* 6. Security Deposit */}
              {reservation.securityDepositStatus !== 'None' && (
              <div className="space-y-2 border-t border-indigo-100 pt-4 bg-indigo-50/40 p-3 rounded-lg border">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-indigo-950 uppercase text-xs tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Security Deposit
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${reservation.securityDepositStatus === 'Refunded' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                    {reservation.securityDepositStatus}
                  </span>
                </div>
                
                <div className="space-y-1.5 text-xs text-indigo-900">
                  <div className="flex justify-between">
                    <span className="opacity-70">Amount Held:</span>
                    <span className="font-bold">${(reservation.securityDepositAmount || 0).toFixed(2)}</span>
                  </div>
                  {reservation.securityDepositCollectedDate && (
                    <div className="flex justify-between">
                      <span className="opacity-70">Collected:</span>
                      <span>{formatDate(reservation.securityDepositCollectedDate, 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {reservation.securityDepositHoldUntil && (
                    <div className="flex justify-between">
                      <span className="opacity-70">Duration:</span>
                      <span>Hold until {formatDate(reservation.securityDepositHoldUntil, 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {reservation.securityDepositStatus === 'Refunded' && (
                    <div className="border-t border-indigo-100 pt-1.5 mt-1 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-green-800 font-semibold">Refunded Amount:</span>
                        <span className="font-bold text-green-800">${(reservation.securityDepositRefundAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] opacity-75">
                        <span>Via Method:</span>
                        <span>{reservation.securityDepositRefundMethod}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}

            </div>

            {/* TOTALS SECTION */}
            <div className="border-t-2 border-dashed border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-650 font-medium">Subtotal (Actual Charges)</span>
                <span className="text-gray-900 font-bold">${(reservation.totalAmount || 0).toFixed(2)}</span>
              </div>

              {reservation.securityDepositAmount > 0 && (
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span className="font-medium text-xs">Security Deposit (Refundable)</span>
                  <span className="font-bold text-gray-900">${(reservation.securityDepositAmount || 0).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-base font-black text-indigo-900 border-t border-gray-200 pt-2">
                <span className="uppercase tracking-wide text-xs">Total Amount to Collect</span>
                <span>${((reservation.totalAmount || 0) + (reservation.securityDepositAmount || 0)).toFixed(2)}</span>
              </div>

              {/* Payments Received Breakdown */}
              {payments.filter(p => p.type === 'payment').length > 0 && (
              <div className="space-y-1 bg-gray-50/60 p-2.5 rounded-lg border border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Receipt Log</span>
                {payments.filter(p => p.type === 'payment').map(p => (
                  <div key={p.id} className="flex justify-between text-xs text-green-700">
                    <span>Payment ({formatDate(p.date, 'MM/dd')})</span>
                    <span className="font-semibold">${(p.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* FLOATING ACTION DIALOGS / INLINE MODAL OVERLAYS */}
      
      {/* 1. Record Payment Modal */}
      {activeModal === 'payment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-100">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Record Standard Payment</h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
            </div>
            <form onSubmit={handleAddPayment} className="p-6 space-y-4 text-sm">
              <div className="bg-white border rounded-lg p-3 space-y-2 mb-4">
                <span className="text-xs font-bold uppercase text-gray-400 block mb-2 border-b pb-1">Payment Breakdown</span>
                
                {/* Outstanding Base Rental Calculation */}
                {(() => {
                  const baseRentPaid = payments.filter(p => p.type === 'payment').reduce((sum, p) => sum + p.amount, 0) - charges.filter(c => c.paymentStatus === 'Paid').reduce((sum, c) => sum + c.amount, 0);
                  const baseRentRemaining = Math.max(0, reservation.baseRental - baseRentPaid);
                  if (baseRentRemaining > 0) {
                    return (
                      <div className="flex justify-between items-center text-gray-700">
                        <span>Rental Fee (${(vehicle.dailyRate || 0).toFixed(2)}/Day x {rentalDays} Days)</span>
                        <span className="font-medium">${(baseRentRemaining || 0).toFixed(2)}</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {charges.filter(c => c.paymentStatus === 'Pending').map(c => (
                  <div key={c.id} className="flex justify-between items-center text-gray-700">
                    <span>{c.description}</span>
                    <span className="font-medium">${(c.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
                
                <div className="flex justify-between items-center text-gray-900 border-t pt-2 mt-2 font-bold">
                  <span>Total Amount</span>
                  <span>${(reservation.balance || 0).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Payment Method</label>
                <select 
                  className="w-full border rounded-lg p-2 bg-white"
                  value={paymentForm.method}
                  onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Wire Transfer">Wire Transfer</option>
                </select>
              </div>
              <div className="hidden">
                <input 
                  type="number" 
                  step="0.01"
                  required 
                  max={reservation.balance}
                  value={paymentForm.amount || ''}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm">
                  Apply Payment of ${(reservation.balance || 0).toFixed(2)}
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 border border-gray-205 text-gray-700 rounded-lg hover:bg-gray-50 text-xs">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Claim Modal */}
      {activeModal === 'claim' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Add Damage Claim</h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
            </div>
            <form onSubmit={handleAddClaim} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Claim Title / Description</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Scratch Damage Rear bumper"
                  className="w-full border rounded-lg p-2 outline-none"
                  value={claimForm.description}
                  onChange={e => setClaimForm({ ...claimForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Claim Value / Rate ($)</label>
                <input 
                  type="number" 
                  required
                  className="w-full border rounded-lg p-2 outline-none font-semibold text-base"
                  value={claimForm.amount || ''}
                  onChange={e => setClaimForm({ ...claimForm, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Confidential Notes</label>
                <textarea 
                  className="w-full border rounded-lg p-2 text-xs outline-none"
                  placeholder="Describe damage evidence here..."
                  value={claimForm.notes}
                  onChange={e => setClaimForm({ ...claimForm, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm">
                  Add Claim
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 border border-gray-205 text-gray-700 rounded-lg hover:bg-gray-50 text-xs">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Fine Modal */}
      {activeModal === 'fine' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Add Staff Fine Record</h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
            </div>
            <form onSubmit={handleAddFine} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Fine Trigger / Reason</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Inside Smoking Fee"
                  className="w-full border rounded-lg p-2 outline-none"
                  value={fineForm.description}
                  onChange={e => setFineForm({ ...fineForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Rate Charge ($)</label>
                <input 
                  type="number" 
                  required
                  className="w-full border rounded-lg p-2 outline-none font-semibold text-base"
                  value={fineForm.amount || ''}
                  onChange={e => setFineForm({ ...fineForm, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Audit Notes</label>
                <textarea 
                  className="w-full border rounded-lg p-2 text-xs outline-none"
                  placeholder="Evidence or comments..."
                  value={fineForm.notes}
                  onChange={e => setFineForm({ ...fineForm, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm">
                  Apply Fine
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 border border-gray-250 text-gray-700 rounded-lg hover:bg-gray-50 text-xs">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add External Charge Modal */}
      {activeModal === 'external' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Add External Charge</h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
            </div>
            <form onSubmit={handleAddExternalCharge} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Charge Description</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Premium Tollways Pass"
                  className="w-full border rounded-lg p-2 outline-none"
                  value={externalForm.description}
                  onChange={e => setExternalForm({ ...externalForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Flat Charged Amount ($)</label>
                <input 
                  type="number" 
                  required
                  className="w-full border rounded-lg p-2 outline-none font-semibold text-base"
                  value={externalForm.amount || ''}
                  onChange={e => setExternalForm({ ...externalForm, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Line Item Notes</label>
                <textarea 
                  className="w-full border rounded-lg p-2 text-xs outline-none"
                  placeholder="Details..."
                  value={externalForm.notes}
                  onChange={e => setExternalForm({ ...externalForm, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm">
                  Apply Charge
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 border border-gray-250 text-gray-700 rounded-lg hover:bg-gray-50 text-xs">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Switch Vehicle Modal */}
      {activeModal === 'switch' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Switch Vehicle Unit</h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
            </div>
            <form onSubmit={handleVehicleSwitchSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">
                  Switching from <span className="font-bold">{vehicle.make} {vehicle.model} ({vehicle.licensePlate})</span>.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">New Unit Candidate</label>
                {availableSwitchVehicles.length === 0 ? (
                  <p className="text-xs text-red-500 italic bg-red-50 p-2 rounded">
                    No available replacement units in the fleet.
                  </p>
                ) : (
                  <select 
                    required
                    className="w-full border rounded-lg p-2 bg-white text-xs border-gray-300"
                    value={switchForm.newVehicleId}
                    onChange={e => setSwitchForm({ ...switchForm, newVehicleId: e.target.value })}
                  >
                    <option value="">Select available unit...</option>
                    {availableSwitchVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} - Plate: {v.licensePlate} (${v.dailyRate}/day)
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Swap Upgrade Fee ($)</label>
                <input 
                  type="number" 
                  step="1"
                  required
                  className="w-full border rounded-lg p-2 outline-none font-semibold text-base"
                  value={switchForm.upgradeFee}
                  onChange={e => setSwitchForm({ ...switchForm, upgradeFee: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Swap Notes / Details</label>
                <textarea 
                  className="w-full border rounded-lg p-2 text-xs outline-none"
                  placeholder="Reason for upgrade or unit swap..."
                  value={switchForm.notes}
                  onChange={e => setSwitchForm({ ...switchForm, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  disabled={!switchForm.newVehicleId}
                  className="flex-1 py-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs shadow-sm py-2"
                >
                  Confirm Switch
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 border border-gray-250 text-gray-700 rounded-lg hover:bg-gray-50 text-xs">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Manage Security Deposit Modal */}
      {activeModal === 'deposit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h4 className="font-bold text-gray-900">Manage Security Deposit</h4>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
            </div>
            
            <div className="p-6">
              {/* CURRENT DEPOSIT IS NONE OR PENDING -> PROCESS HOLD */}
              {(reservation.securityDepositStatus === 'None' || reservation.securityDepositStatus === 'Pending') && (
                <form onSubmit={handleProcessDeposit} className="space-y-4 text-sm">
                  <p className="text-xs text-gray-505">
                    No active hold found. Setup a preauthorized security deposit.
                  </p>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Authorized Hold ($)</label>
                    <input 
                      type="number" 
                      required
                      className="w-full border rounded-lg p-2 font-semibold text-base"
                      value={depositForm.amount}
                      onChange={e => setDepositForm({ ...depositForm, amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Hold Expiry Until Date</label>
                    <input 
                      type="date" 
                      required 
                      className="w-full border rounded-lg p-2 font-medium"
                      value={depositForm.holdUntil}
                      onChange={e => setDepositForm({ ...depositForm, holdUntil: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm">
                      Apply Preauth Hold
                    </button>
                    <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 border border-gray-250 text-gray-700 rounded-lg hover:bg-gray-50 text-xs">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* CURRENT DEPOSIT IS ON HOLD -> PROCESS REFUND */}
              {reservation.securityDepositStatus === 'On Hold' && (
                <form onSubmit={handleRefundDepositSubmit} className="space-y-4 text-xs">
                  <div className="bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200">
                    <span className="font-bold block text-[11px] uppercase tracking-wider mb-0.5">Deposit on Hold</span>
                    Currently Holding: <strong className="font-bold">${(reservation.securityDepositAmount || 0).toFixed(2)}</strong>
                  </div>

                  {/* Refund Type Selection */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1.5">Refund Option</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRefundType('Full');
                          setDeductionAmount(0);
                        }}
                        className={`flex-1 py-2 font-bold rounded-lg border text-xs transition-all ${
                          refundType === 'Full'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold shadow-xs'
                            : 'bg-white border-gray-250 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Full Refund
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRefundType('Partial');
                          setDeductionAmount(Math.min(reservation.securityDepositAmount, 100));
                        }}
                        className={`flex-1 py-2 font-bold rounded-lg border text-xs transition-all ${
                          refundType === 'Partial'
                            ? 'bg-amber-50 border-amber-500 text-amber-700 font-bold shadow-xs'
                            : 'bg-white border-gray-250 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Partial Refund
                      </button>
                    </div>
                  </div>

                  {/* If Partial: show reason and refund deductions */}
                  {refundType === 'Partial' && (
                    <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-150 animate-fade-in">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Reason for Deduction / Charge Fee</label>
                        <select 
                          className="w-full border rounded-lg p-1.5 bg-white text-xs"
                          value={deductionReason}
                          onChange={e => setDeductionReason(e.target.value as any)}
                        >
                          <option value="Late Return">Late Return</option>
                          <option value="Car Damage">Car Damage</option>
                          <option value="Traffic Violation">Traffic Violation</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Deduction Amount ($)</label>
                        <input 
                          type="number" 
                          required
                          min="0"
                          max={reservation.securityDepositAmount}
                          step="0.01"
                          className="w-full border rounded-lg p-1.5 font-semibold text-xs animate-pulse-once"
                          value={deductionAmount}
                          onChange={e => setDeductionAmount(Math.min(reservation.securityDepositAmount, parseFloat(e.target.value) || 0))}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Deduction Notes / Fee Explanation</label>
                        <textarea 
                          rows={2}
                          required={refundType === 'Partial'}
                          placeholder="Provide details about why the full deposit is not returned..."
                          className="w-full border rounded-lg p-1.5 text-xs outline-none focus:border-indigo-500 font-medium"
                          value={refundNotes}
                          onChange={e => setRefundNotes(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Summary of what will be refunded/kept */}
                  <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1.5 border border-dashed border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-medium">Original Preauthorized Deposit:</span>
                      <span className="font-semibold text-gray-800">${(reservation.securityDepositAmount || 0).toFixed(2)}</span>
                    </div>
                    {refundType === 'Partial' && (
                      <div className="flex justify-between text-rose-600 font-medium">
                        <span>Deducted Amount (To Be Kept):</span>
                        <span>-${(deductionAmount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-100 pt-1.5 font-bold text-emerald-700">
                      <span>Total Amount Refunded:</span>
                      <span>${(refundType === 'Full' ? (reservation.securityDepositAmount || 0) : Math.max(0, (reservation.securityDepositAmount || 0) - (deductionAmount || 0))).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Refund Release Instrument */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Refund Release Method</label>
                    <select 
                      className="w-full border p-2 bg-white text-xs rounded-lg font-medium"
                      value={refundForm.method}
                      onChange={e => setRefundForm({ ...refundForm, method: e.target.value })}
                    >
                      <option value="Credit Card">Original Credit Card</option>
                      <option value="Cash">Cash Return</option>
                      <option value="Wire Transfer">Wire Transfer</option>
                    </select>
                  </div>

                  {/* Button Submission */}
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md">
                      Refund and Complete
                    </button>
                    <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-semibold">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* CURRENT DEPOSIT IS REFUNDED */}
              {reservation.securityDepositStatus === 'Refunded' && (
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto text-green-600">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Refund Completed</p>
                    <p className="text-xs text-gray-500 mt-1">
                      This deposit has already been fully refunded. No additional changes are allowed.
                    </p>
                    <p className="text-xs bg-gray-100 p-2 rounded font-mono mt-3">
                      Amount: ${reservation.securityDepositRefundAmount?.toFixed(2)} via {reservation.securityDepositRefundMethod}
                    </p>
                  </div>
                  <button type="button" onClick={() => setActiveModal(null)} className="w-full py-2 bg-gray-900 text-white rounded-lg font-bold text-xs">
                    Okay
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Return Vehicle Checklist Modal */}
      {activeModal === 'returnVehicle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-slate-50 border-b flex justify-between items-center">
              <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-indigo-600" /> Return & Finalize
              </h4>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">×</button>
            </div>
            <form onSubmit={handleProcessReturn} className="p-6 space-y-6">
              <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm text-green-900 font-medium">Verify the vehicle has been physically returned and keys collected.</p>
              </div>

              {/* Security deposit refund options removed from return modal because it can be refunded 1-2 weeks later */}

              <div className="pt-2 flex gap-3">
                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold shadow-lg shadow-indigo-200 transition">
                  Confirm & Complete
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Initial Checkout Modal */}
      {activeModal === 'initial_checkout' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded shadow-xl max-w-xl w-full border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-zinc-800 border-b border-zinc-700 flex justify-between items-center text-white">
               <h3 className="font-bold tracking-wide uppercase text-sm flex items-center gap-2"><CreditCard className="w-5 h-5"/> Checkout & Payment</h3>
               <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white">&times;</button>
            </div>
            
            <form onSubmit={handleInitialCheckout} className="p-6 text-sm">
                <div className="mb-6 bg-blue-50 border border-blue-200 p-5 rounded-lg">
                   <div className="flex justify-between items-center text-blue-900 mb-2 border-b border-blue-100 pb-2">
                     <span className="font-bold uppercase tracking-wide text-xs">Subtotal (Actual Charges)</span>
                     <span className="text-xl font-extrabold">${(reservation.balance || 0).toFixed(2)}</span>
                   </div>
                   {depositForm.amount > 0 && (
                     <div className="flex justify-between items-center text-blue-700 mb-2 border-b border-blue-100 pb-2">
                       <span className="font-medium text-xs">Security Deposit (Refundable)</span>
                       <span className="text-base font-bold">${(depositForm.amount || 0).toFixed(2)}</span>
                     </div>
                   )}
                   <div className="flex justify-between items-center text-blue-950 pt-1">
                     <span className="font-black uppercase tracking-wide text-xs">Total Amount to Collect</span>
                     <span className="text-3xl font-black">${((reservation.balance || 0) + (depositForm.amount || 0)).toFixed(2)}</span>
                   </div>
                   {reservation.balance === 0 && depositForm.amount === 0 && <div className="mt-2 text-sm text-green-700 font-bold text-center">Nothing due to collected upfront.</div>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                   <div>
                     <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wide mb-1 flex items-center gap-1">Payment Method</label>
                     <select 
                        required 
                        className="w-full border-2 border-zinc-200 rounded p-2 text-sm bg-white" 
                        value={paymentForm.method} 
                        onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}
                     >
                       <option value="Credit Card">Credit Card</option>
                       <option value="Cash">Cash</option>
                       <option value="Wire Transfer">Wire Transfer</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wide mb-1 flex items-center gap-1">Deposit Charge ($)</label>
                     <div className="relative">
                       <span className="absolute left-3 top-2.5 text-zinc-500 font-bold">$</span>
                       <input 
                          type="number" step="0.01" required min="0"
                          className="w-full border-2 border-zinc-200 rounded p-2 pl-7 text-sm font-bold bg-white" 
                          value={depositForm.amount} 
                          onChange={e => setDepositForm({...depositForm, amount: parseFloat(e.target.value) || 0})}
                       />
                     </div>
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wide mb-1 flex items-center gap-1">Hold Until Date</label>
                     <input 
                        type="date" 
                        required 
                        className="w-full border-2 border-zinc-200 rounded p-1.5 text-sm font-bold bg-white outline-none" 
                        value={depositForm.holdUntil || format(parseISO(reservation.returnDate), 'yyyy-MM-dd')}
                        onChange={e => setDepositForm({...depositForm, holdUntil: e.target.value})}
                     />
                   </div>
                </div>

                <div className="bg-zinc-50 rounded p-4 border border-zinc-200 mb-6 text-xs text-zinc-600 space-y-1">
                   <p>&bull; This will process a charge of <strong>${(reservation.balance || 0).toFixed(2)}</strong> via {paymentForm.method}.</p>
                   {(depositForm.amount || 0) > 0 && <p>&bull; A separate authorization hold of <strong>${(depositForm.amount || 0).toFixed(2)}</strong> will be applied.</p>}
                   <p>&bull; The reservation status will be advanced to <strong>"Checked In"</strong>.</p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                    <button type="button" onClick={() => setActiveModal(null)} className="px-5 py-2 font-semibold text-zinc-500 hover:text-zinc-800 transition rounded hover:bg-zinc-100">Cancel</button>
                    <button type="submit" disabled={reservation.balance < 0} className="px-6 py-2 bg-green-600 text-white font-bold rounded shadow-sm hover:bg-green-700 transition flex items-center gap-2">
                       Complete Payment <Check className="w-4 h-4"/>
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Rental Agreement View Modal */}
      {activeModal === 'agreement' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-2 sm:p-4 no-print-backdrop">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-gray-150 overflow-hidden flex flex-col max-h-[92vh]" id="printable-agreement">
            
            {/* Header - Hidden during actual device printing if .no-print classes are applied elsewhere */}
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-150 flex justify-between items-center no-print">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> Print & Digital Rental Agreement
              </h4>
              <button onClick={() => { setActiveModal(null); setHasSeenAgreement(true); }} className="text-gray-400 hover:text-gray-600 font-bold text-xl">×</button>
            </div>
            
            <div className="p-8 overflow-y-auto font-sans text-sm text-slate-800 space-y-6">
              
              {/* Document Header with Logo and Metadata */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 gap-4">
                <div className="flex items-center gap-4">
                  <img 
                    src="https://i.imgur.com/NMk2vsy.png" 
                    alt="Company Logo" 
                    className="h-16 w-auto object-contain" 
                    referrerPolicy="no-referrer" 
                  />
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-950 uppercase">RENT A.i.</h2>
                    <p className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">AI POWERED RENTAL MANAGEMENT SYSTEM</p>
                  </div>
                </div>
                <div className="text-left sm:text-right font-mono">
                  <h1 className="text-xl font-bold uppercase text-indigo-700 tracking-tight leading-tight">Rental Contract</h1>
                  <p className="text-xs text-slate-500 mt-1">Agreement #: <span className="font-bold font-sans text-slate-900">REF-{reservation.id.substring(0, 8).toUpperCase()}</span></p>
                  <p className="text-[10px] text-slate-400">Date Issued: {format(new Date(), 'MM/dd/yyyy')}</p>
                  <div className="mt-2 text-xs font-bold font-sans flex items-center justify-start sm:justify-end gap-1.5">
                    Agreement Status: {reservation.agreementStatus === 'Signed' ? '🟢 Signed' : '🟡 Pending Signature'}
                  </div>
                </div>
              </div>

              {/* Dynamic Customer & Vehicle Disclosures Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h5 className="font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200 mb-2">Lessee (Customer Profile)</h5>
                  <p className="font-extrabold text-slate-900 text-sm mb-1">{customer.firstName} {customer.lastName}</p>
                  <p className="text-slate-600">{customer.street}</p>
                  {customer.street2 && <p className="text-slate-600">{customer.street2}</p>}
                  <p className="text-slate-600 mb-2">{customer.city}, {customer.state} {customer.zip}</p>
                  <div className="font-mono text-slate-500 space-y-0.5 pt-1 border-t border-slate-200/50">
                    <p>Lic: <span className="font-bold text-slate-700">{customer.driverLicenseNumber}</span></p>
                    <p>Phone: <span className="text-slate-700">{customer.phone}</span></p>
                    <p>Email: <span className="text-slate-700">{customer.email}</span></p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h5 className="font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100 mb-2">Vehicle Assignment</h5>
                  <p className="font-extrabold text-slate-900 text-sm mb-1">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                  <p className="text-slate-600 font-mono">License Plate: <span className="bg-slate-200 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[10px]">{vehicle.licensePlate}</span></p>
                  <p className="text-slate-600 font-mono mt-1 text-[11px]">VIN Number: {vehicle.VIN}</p>
                  
                  <h5 className="font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100 mt-4 mb-2 text-[10px]">Rental Term Summary</h5>
                  <div className="text-slate-600 space-y-0.5">
                    <p><strong>Pickup:</strong> {reservation.pickupDate} at {reservation.pickupTime}</p>
                    <p><strong>Return:</strong> {reservation.returnDate} at {reservation.returnTime}</p>
                    <p className="text-slate-900 mt-1 font-bold">Total Duration: {rentalDays} rental day{rentalDays > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown Invoice Table */}
              <div>
                <h5 className="font-bold uppercase tracking-wider text-slate-500 mb-2 pb-1 text-xs border-b border-slate-200">Financial Disclosure Breakdown</h5>
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        <th className="px-4 py-2.5">Charge Item Description</th>
                        <th className="px-4 py-2.5 text-right">Calculation Factor</th>
                        <th className="px-4 py-2.5 text-right w-32">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-mono text-slate-700">
                      <tr>
                        <td className="px-4 py-2 font-sans font-medium text-slate-900">Base Vehicle Rental Rate</td>
                        <td className="px-4 py-2 text-right">${(vehicle?.dailyRate || 0).toFixed(2)} / Day × {rentalDays} Days</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-900">${(reservation.baseRental || 0).toFixed(2)}</td>
                      </tr>
                      {charges.map(c => (
                        <tr key={c.id}>
                          <td className="px-4 py-2 font-sans font-medium text-slate-900">
                            {c.description} <span className="text-[10px] text-slate-400">({c.category})</span>
                          </td>
                          <td className="px-4 py-2 text-right text-slate-500">-</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-900">${(c.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t border-slate-250">
                        <td colSpan={2} className="px-4 py-2.5 font-sans uppercase tracking-wide text-right text-slate-600 font-bold text-[10px]">Subtotal (Actual Charges)</td>
                        <td className="px-4 py-2.5 text-right text-sm text-slate-900 font-extrabold">${(reservation.totalAmount || 0).toFixed(2)}</td>
                      </tr>
                      {(reservation.securityDepositAmount || 0) > 0 && (
                        <tr className="text-slate-600 bg-slate-50/40">
                          <td colSpan={2} className="px-4 py-2 font-sans text-right text-[10px] uppercase font-bold">
                            Security Deposit (Refundable)
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-slate-950">${(reservation.securityDepositAmount || 0).toFixed(2)}</td>
                        </tr>
                      )}
                      <tr className="bg-blue-50 font-bold border-t border-blue-200">
                        <td colSpan={2} className="px-4 py-2.5 font-sans uppercase tracking-wide text-right text-blue-900 font-bold text-[10px]">Total Amount to Collect</td>
                        <td className="px-4 py-2.5 text-right text-sm text-blue-955 font-extrabold">${((reservation.totalAmount || 0) + (reservation.securityDepositAmount || 0)).toFixed(2)}</td>
                      </tr>
                      <tr className="text-emerald-700 bg-emerald-50/50">
                        <td colSpan={2} className="px-4 py-2 font-sans text-right font-bold text-[10px] uppercase">Paid Upfront Payments</td>
                        <td className="px-4 py-2 text-right font-extrabold">-${((reservation.totalAmount || 0) - (reservation.balance || 0)).toFixed(2)}</td>
                      </tr>
                      <tr className="bg-indigo-50 font-black border-t-2 border-indigo-200">
                        <td colSpan={2} className="px-4 py-3 font-sans uppercase tracking-wide text-right text-indigo-900 font-bold text-[10px]">Unpaid Balance Due</td>
                        <td className="px-4 py-3 text-right text-base text-indigo-950 font-black">${(reservation.balance || 0).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Standard Policy Terms & Disclosures */}
              <div className="text-[11px] text-slate-600 leading-relaxed space-y-2 pt-4 border-t border-slate-100 whitespace-pre-wrap font-sans">
                {activeContractObj ? (
                  activeContractObj.content
                ) : (
                  <>
                    <p><strong>1. Driver Certification:</strong> By signing below, the Lessee certifies that they hold a valid driver's license as detailed above, and are fully qualified and permitted to operate the assigned vehicle unit under current local, state, and federal laws.</p>
                    <p><strong>2. Insurance & Liability:</strong> The Lessee assumes full financial responsibility for any physical vehicle damage, regulatory fines, speeding tickets, toll violations, or third-party liabilities incurred during the scope of this active rental period.</p>
                    <p><strong>3. Security Deposit:</strong> A deposit authorization hold is recorded on the corporate ledger. It will be fully released or liquidated as necessary to offset unpaid tolls, high-wear damages, fuel replacement fees, or cleanup costs upon active physical return inspection.</p>
                    <p><strong>4. Return Rules:</strong> Vehicles must be returned to the authorized depot on or before the specified date and time. Overdue returns exceeding a 1-hour grace margin will represent active default and escalate to additional rental day rates.</p>
                  </>
                )}
              </div>

              {/* Signature Blocks with Cursive/Handwriting style digital indicator */}
              <div className="pt-8 flex flex-col sm:flex-row gap-12">
                <div className="flex-1 border-t border-slate-200 pt-2 text-center">
                  <div className="h-8 flex items-center justify-center">
                    <span className="font-serif italic text-base text-indigo-750 font-semibold tracking-wide">
                      {customer.firstName} {customer.lastName}
                    </span>
                  </div>
                  <p className="font-bold text-xs text-slate-700">Lessee Signature</p>
                  <p className="text-[10px] text-slate-400">Digitally Verified & Completed</p>
                </div>
                <div className="flex-1 border-t border-slate-200 pt-2 text-center">
                  <div className="h-8 flex items-center justify-center text-xs text-slate-600 font-semibold">
                    <span>Authorized Agent #SW-{reservation.id.substring(0, 4).toUpperCase()}</span>
                  </div>
                  <p className="font-bold text-xs text-slate-700">Authorized Officer Signature</p>
                  <p className="text-[10px] text-slate-400">System logged on {format(new Date(), 'MM/dd/yyyy')}</p>
                </div>
              </div>

            </div>

            {/* Footer Buttons - Hidden in browser Print PDF */}
            <div className="px-6 py-4 bg-slate-50 border-t border-gray-150 flex flex-wrap justify-end gap-3 rounded-b-xl no-print">
               <button 
                 disabled={isSendingEmail}
                 onClick={handleSendAgreementEmail}
                 className="px-4 py-2 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-100 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isSendingEmail ? (
                   <>
                     <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-blue-700 border-t-transparent rounded-full"></span>
                     Sending...
                   </>
                 ) : (
                   <>📧 Send via Email</>
                 )}
               </button>
               <button 
                 disabled={isRegenerating}
                 onClick={handleRegenerate}
                 className="px-4 py-2 border border-violet-300 text-violet-700 bg-violet-50 rounded-lg text-sm font-bold shadow-sm hover:bg-violet-100 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isRegenerating ? (
                   <>
                     <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-violet-700 border-t-transparent rounded-full"></span>
                     Regenerating...
                   </>
                 ) : (
                   <>
                     <RefreshCw className="w-3.5 h-3.5" />
                     Regenerate Contract
                   </>
                 )}
               </button>
               {reservation.agreementStatus !== 'Signed' ? (
                 <button 
                   onClick={async () => {
                     const todayStr = new Date().toISOString().split('T')[0];
                     await store.updateReservation(reservation.id, {
                       agreementStatus: 'Signed',
                       agreementSignedDate: formatDate(todayStr)
                     });
                   }} 
                   className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 cursor-pointer flex items-center gap-1.5"
                 >
                   🟢 Mark as Signed
                 </button>
               ) : (
                 <button 
                   onClick={async () => {
                     await store.updateReservation(reservation.id, {
                       agreementStatus: 'Pending',
                       agreementSignedDate: undefined
                     });
                   }} 
                   className="px-4 py-2 bg-zinc-200 text-zinc-800 rounded-lg text-sm font-bold shadow-sm hover:bg-zinc-300 cursor-pointer flex items-center gap-1.5"
                 >
                   🟡 Mark as Pending
                 </button>
               )}
               <button 
                 onClick={() => window.print()} 
                 className="px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 cursor-pointer flex items-center gap-1.5"
               >
                 <Printer className="w-4 h-4" /> Print Contract / PDF
               </button>
               <button 
                 onClick={() => { setActiveModal(null); setHasSeenAgreement(true); }} 
                 className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 cursor-pointer"
               >
                 Close Agreement
               </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
