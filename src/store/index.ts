import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays, parseISO } from 'date-fns';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Customer,
  Vehicle,
  Reservation,
  Payment,
  ChargeItem,
  ChargeTemplate,
  Maintenance,
  ReservationStatus,
  ChargeCategory,
  SystemUser,
  RentalContract,
} from '../types';

interface AppState {
  systemUsers: SystemUser[];
  customers: Customer[];
  vehicles: Vehicle[];
  reservations: Reservation[];
  payments: Payment[];
  chargeItems: ChargeItem[];
  chargeTemplates: ChargeTemplate[];
  maintenances: Maintenance[];
  contracts: RentalContract[];

  archivedCustomers: Customer[];
  archivedVehicles: Vehicle[];
  archivedReservations: Reservation[];
  archivedChargeTemplates: ChargeTemplate[];

  // Lists requested by requirement 3
  securityDeposits: any[];
  claims: any[];
  fines: any[];
  externalCharges: any[];
  commissions: any[];

  // User Actions
  addSystemUser: (user: Omit<SystemUser, 'id'>) => Promise<void>;
  updateSystemUser: (id: string, user: Partial<SystemUser>) => Promise<void>;
  deleteSystemUser: (id: string) => Promise<void>;

  // Actions
  addCustomer: (customer: Omit<Customer, 'id' | 'totalRentals' | 'activeReservations' | 'totalPaid' | 'outstandingBalance' | 'totalClaims' | 'totalFines' | 'lifetimeRevenue'>) => Promise<string>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;

  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<void>;

  deleteCustomer: (id: string) => Promise<void>;
  deleteCustomers: (ids: string[]) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  deleteVehicles: (ids: string[]) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  deleteReservations: (ids: string[]) => Promise<void>;
  addChargeTemplate: (template: Omit<ChargeTemplate, 'id'>) => Promise<void>;
  updateChargeTemplate: (id: string, template: Partial<ChargeTemplate>) => Promise<void>;
  deleteChargeTemplate: (id: string) => Promise<void>;
  deleteChargeTemplates: (ids: string[]) => Promise<void>;

  createReservation: (reservationData: Omit<Reservation, 'id' | 'baseRental' | 'totalAmount' | 'balance' | 'bookingDate' | 'vehicleReturned' | 'securityDepositStatus' | 'securityDepositRefunded'>, selectedChargeTemplateIds: string[]) => Promise<string>;
  updateReservationStatus: (id: string, status: ReservationStatus) => Promise<void>;
  updateReservation: (id: string, data: Partial<Reservation>) => Promise<void>;
  markVehicleReturned: (id: string) => Promise<void>;

  addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
  addChargeItem: (charge: Omit<ChargeItem, 'id'>) => Promise<void>;
  updateChargeItemStatus: (id: string, status: 'Pending' | 'Paid') => Promise<void>;
  
  processSecurityDeposit: (reservationId: string, amount: number, holdUntil: string) => Promise<void>;
  refundSecurityDeposit: (reservationId: string, amount: number, method: string) => Promise<void>;

  recalculateCustomerStats: (customerId: string) => Promise<void>;
  recalculateReservationTotals: (reservationId: string) => Promise<void>;
  syncVehicleStatus: (reservation: Reservation) => Promise<void>;

  // Contract Actions
  addContract: (contract: Omit<RentalContract, 'id' | 'uploadedAt' | 'status' | 'uploadedBy'>, uploadedByEmail: string) => Promise<void>;
  activateContract: (id: string) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
}

// Default Seed Data definitions to run if database collections are empty
const seedCustomers: Customer[] = [
  {
    id: 'cust-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@gmail.com',
    phone: '215-555-0199',
    street: '1500 Market St',
    city: 'Philadelphia',
    state: 'PA',
    zip: '19102',
    country: 'USA',
    driverLicenseNumber: 'DL1234567',
    driverLicenseExpiration: '2028-12-31',
    totalRentals: 1,
    activeReservations: 0,
    totalPaid: 450,
    outstandingBalance: 0,
    totalClaims: 0,
    totalFines: 0,
    lifetimeRevenue: 450,
    lastRentalDate: '2026-06-10'
  },
  {
    id: 'cust-2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@yahoo.com',
    phone: '267-555-0144',
    street: '2301 Arch St',
    city: 'Philadelphia',
    state: 'PA',
    zip: '19103',
    country: 'USA',
    driverLicenseNumber: 'DL9876543',
    driverLicenseExpiration: '2027-05-15',
    totalRentals: 1,
    activeReservations: 1,
    totalPaid: 720,
    outstandingBalance: 180,
    totalClaims: 0,
    totalFines: 0,
    lifetimeRevenue: 720,
    lastRentalDate: '2026-06-15'
  }
];

const seedVehicles: Vehicle[] = [
  {
    id: 'veh-1',
    make: 'Toyota',
    model: 'Camry',
    year: 2024,
    licensePlate: 'PHL-8821',
    status: 'Available',
    dailyRate: 50,
    category: 'Sedan',
    color: 'Silver',
    VIN: '4T1BF1FKXRU123456',
    mileage: 12450
  },
  {
    id: 'veh-2',
    make: 'Jeep',
    model: 'Grand Cherokee',
    year: 2023,
    licensePlate: 'PHL-5544',
    status: 'Rented',
    dailyRate: 90,
    category: 'SUV',
    color: 'Black',
    VIN: '1C4RJFAG6PC789012',
    mileage: 18200
  },
  {
    id: 'veh-3',
    make: 'Ford',
    model: 'F-150',
    year: 2023,
    licensePlate: 'PHL-2101',
    status: 'Available',
    dailyRate: 110,
    category: 'Truck',
    color: 'Red',
    VIN: '1FTFW1RG4KD345678',
    mileage: 24100
  },
  {
    id: 'veh-4',
    make: 'Tesla',
    model: 'Model Y',
    year: 2024,
    licensePlate: 'PHL-3000',
    status: 'Maintenance',
    dailyRate: 100,
    category: 'Electric',
    color: 'White',
    VIN: '5YJYGDEE5PF456789',
    mileage: 8200
  }
];

const seedReservations: Reservation[] = [
  {
    id: 'res-1',
    customerId: 'cust-1',
    vehicleId: 'veh-1',
    status: 'Completed',
    pickupDate: '2026-06-10',
    pickupTime: '10:00',
    returnDate: '2026-06-15',
    returnTime: '16:00',
    baseRental: 250,
    totalAmount: 450,
    balance: 0,
    bookingDate: '2026-06-01T09:00:00Z',
    vehicleReturned: true,
    securityDepositAmount: 200,
    securityDepositStatus: 'Refunded',
    securityDepositRefunded: true,
    securityDepositRefundAmount: 200,
    securityDepositRefundMethod: 'Credit Card',
    securityDepositRefundDate: '2026-06-15'
  },
  {
    id: 'res-2',
    customerId: 'cust-2',
    vehicleId: 'veh-2',
    status: 'Checked Out',
    pickupDate: '2026-06-15',
    pickupTime: '09:30',
    returnDate: '2026-06-25',
    returnTime: '11:00',
    baseRental: 900,
    totalAmount: 900,
    balance: 180,
    bookingDate: '2026-06-05T14:22:00Z',
    vehicleReturned: false,
    securityDepositAmount: 300,
    securityDepositStatus: 'On Hold',
    securityDepositRefunded: false,
    securityDepositCollectedDate: '2026-06-15'
  }
];

const seedPayments: Payment[] = [
  {
    id: 'pay-1',
    reservationId: 'res-1',
    customerId: 'cust-1',
    amount: 450,
    date: '2026-06-10T10:15:00Z',
    method: 'Credit Card',
    type: 'payment',
    label: 'Rental Charge Settlement'
  },
  {
    id: 'pay-2',
    reservationId: 'res-2',
    customerId: 'cust-2',
    amount: 720,
    date: '2026-06-15T09:45:00Z',
    method: 'Credit Card',
    type: 'payment',
    label: 'Partial Initial Payment'
  },
  {
    id: 'pay-3',
    reservationId: 'res-2',
    customerId: 'cust-2',
    amount: 300,
    date: '2026-06-15T09:46:00Z',
    method: 'Credit Card',
    type: 'deposit',
    label: 'Security Deposit Held'
  }
];

const seedChargeTemplates: ChargeTemplate[] = [
  { id: 't1', name: 'Insurance', category: 'External Charge', rate: 30, perDay: true },
  { id: 't2', name: 'Toll Fee', category: 'External Charge', rate: 20, perDay: true },
  { id: 't3', name: 'Smoking Fee', category: 'Fine', rate: 150, perDay: false },
  { id: 't4', name: 'Damage Claim', category: 'Claim', rate: 500, perDay: false },
];

export const useStore = create<AppState>((set, get) => ({
  systemUsers: [],
  customers: [],
  vehicles: [],
  reservations: [],
  payments: [],
  chargeItems: [],
  chargeTemplates: [],
  maintenances: [],
  contracts: [],

  archivedCustomers: [],
  archivedVehicles: [],
  archivedReservations: [],
  archivedChargeTemplates: [],

  securityDeposits: [],
  claims: [],
  fines: [],
  externalCharges: [],
  commissions: [],

  addSystemUser: async (data) => {
    const id = uuidv4();
    await setDoc(doc(db, 'users', id), { ...data, id });
  },

  updateSystemUser: async (id, data) => {
    await updateDoc(doc(db, 'users', id), data);
  },

  deleteSystemUser: async (id) => {
    await deleteDoc(doc(db, 'users', id));
  },

  addCustomer: async (data) => {
    const id = uuidv4();
    const customerObj = {
      ...data,
      id,
      totalRentals: 0,
      activeReservations: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      totalClaims: 0,
      totalFines: 0,
      lifetimeRevenue: 0,
    };
    await setDoc(doc(db, 'customers', id), customerObj);
    return id;
  },

  updateCustomer: async (id, data) => {
    await updateDoc(doc(db, 'customers', id), data);
  },

  deleteCustomer: async (id) => {
    const c = get().customers.find((cust) => cust.id === id);
    if (c) {
      await setDoc(doc(db, 'archivedCustomers', id), c);
      await deleteDoc(doc(db, 'customers', id));
    }
  },

  deleteCustomers: async (ids) => {
    for (const id of ids) {
      await get().deleteCustomer(id);
    }
  },

  addVehicle: async (data) => {
    const id = uuidv4();
    await setDoc(doc(db, 'vehicles', id), { ...data, id });
  },

  updateVehicle: async (id, data) => {
    await updateDoc(doc(db, 'vehicles', id), data);
  },

  deleteVehicle: async (id) => {
    const v = get().vehicles.find((veh) => veh.id === id);
    if (v) {
      await setDoc(doc(db, 'archivedVehicles', id), v);
      await deleteDoc(doc(db, 'vehicles', id));
    }
  },

  deleteVehicles: async (ids) => {
    for (const id of ids) {
      await get().deleteVehicle(id);
    }
  },

  deleteReservation: async (id) => {
    const r = get().reservations.find((res) => res.id === id);
    if (r) {
      await setDoc(doc(db, 'archivedReservations', id), r);
      await deleteDoc(doc(db, 'reservations', id));
    }
  },

  deleteReservations: async (ids) => {
    for (const id of ids) {
      await get().deleteReservation(id);
    }
  },

  addChargeTemplate: async (data) => {
    const id = uuidv4();
    await setDoc(doc(db, 'chargeTemplates', id), { ...data, id });
  },

  updateChargeTemplate: async (id, data) => {
    await updateDoc(doc(db, 'chargeTemplates', id), data);
  },

  deleteChargeTemplate: async (id) => {
    const t = get().chargeTemplates.find((tem) => tem.id === id);
    if (t) {
      await setDoc(doc(db, 'archivedChargeTemplates', id), t);
      await deleteDoc(doc(db, 'chargeTemplates', id));
    }
  },

  deleteChargeTemplates: async (ids) => {
    for (const id of ids) {
      await get().deleteChargeTemplate(id);
    }
  },

  createReservation: async (data, selectedChargeTemplateIds) => {
    const id = uuidv4();
    const state = get();

    // Check overlap
    const overlap = state.reservations.some(r => 
      r.vehicleId === data.vehicleId && 
      r.status !== 'Cancelled' &&
      r.status !== 'Completed' &&
      ((data.pickupDate >= r.pickupDate && data.pickupDate <= r.returnDate) ||
       (data.returnDate >= r.pickupDate && data.returnDate <= r.returnDate))
    );
    if (overlap) throw new Error("Vehicle already reserved for selected dates.");

    const vehicle = state.vehicles.find((v) => v.id === data.vehicleId);
    let days = differenceInDays(parseISO(data.returnDate), parseISO(data.pickupDate));
    if (days < 1) days = 1;

    const baseRental = vehicle ? vehicle.dailyRate * days : 0;

    const newReservation: Reservation = {
      ...data,
      id,
      baseRental,
      totalAmount: baseRental,
      balance: baseRental,
      bookingDate: new Date().toISOString(),
      vehicleReturned: false,
      securityDepositAmount: data.securityDepositAmount || 0,
      securityDepositStatus: (data.securityDepositAmount && data.securityDepositAmount > 0) ? 'Pending' : 'None',
      securityDepositRefunded: false,
    };

    // Save Reservation Room
    await setDoc(doc(db, 'reservations', id), newReservation);

    // Save Charges
    for (const templateId of selectedChargeTemplateIds) {
      const t = state.chargeTemplates.find((temp) => temp.id === templateId);
      if (t) {
        const amount = t.perDay ? t.rate * days : t.rate;
        const descriptionDesc = t.perDay ? `${t.name} $${t.rate.toFixed(2)}/Day ${days} Days` : t.name;
        const chargeId = uuidv4();
        const chargeObj = {
          id: chargeId,
          reservationId: id,
          customerId: data.customerId,
          vehicleId: data.vehicleId,
          category: t.category,
          description: descriptionDesc,
          amount,
          paymentStatus: 'Pending' as const,
          date: new Date().toISOString(),
        };

        await setDoc(doc(db, 'chargeItems', chargeId), chargeObj);

        // Store into category collections
        if (t.category === 'Claim') {
          await setDoc(doc(db, 'claims', chargeId), chargeObj);
        } else if (t.category === 'Fine') {
          await setDoc(doc(db, 'fines', chargeId), chargeObj);
        } else if (t.category === 'External Charge') {
          await setDoc(doc(db, 'externalCharges', chargeId), chargeObj);
        }
      }
    }

    // Trigger update chains
    setTimeout(async () => {
      await get().recalculateReservationTotals(id);
      await get().syncVehicleStatus(newReservation);
    }, 400);

    return id;
  },

  updateReservationStatus: async (id, status) => {
    await updateDoc(doc(db, 'reservations', id), { status });
    setTimeout(async () => {
      const r = get().reservations.find(res => res.id === id);
      if (r) {
        await get().syncVehicleStatus(r);
        await get().recalculateCustomerStats(r.customerId);
      }
    }, 400);
  },
  
  updateReservation: async (id, data) => {
    await updateDoc(doc(db, 'reservations', id), data);
    setTimeout(async () => {
      const res = get().reservations.find(r => r.id === id);
      if (res) {
        await get().recalculateCustomerStats(res.customerId);
        await get().syncVehicleStatus(res);
      }
    }, 400);
  },

  markVehicleReturned: async (id) => {
    await updateDoc(doc(db, 'reservations', id), { vehicleReturned: true, status: 'Checked In' });
    setTimeout(async () => {
      const res = get().reservations.find(r => r.id === id);
      if (res) {
        await get().syncVehicleStatus(res);
        await get().recalculateCustomerStats(res.customerId);
      }
    }, 400);
  },

  addPayment: async (payment) => {
    const id = uuidv4();
    const payObj = { ...payment, id };
    await setDoc(doc(db, 'payments', id), payObj);
    setTimeout(async () => {
      await get().recalculateReservationTotals(payment.reservationId);
    }, 400);
  },

  addChargeItem: async (charge) => {
    const id = uuidv4();
    const chargeObj = { ...charge, id };
    await setDoc(doc(db, 'chargeItems', id), chargeObj);

    if (charge.category === 'Claim') {
      await setDoc(doc(db, 'claims', id), chargeObj);
    } else if (charge.category === 'Fine') {
      await setDoc(doc(db, 'fines', id), chargeObj);
    } else if (charge.category === 'External Charge' || charge.category === 'Vehicle Switch') {
      await setDoc(doc(db, 'externalCharges', id), chargeObj);
    }

    setTimeout(async () => {
      await get().recalculateReservationTotals(charge.reservationId);
    }, 400);
  },

  updateChargeItemStatus: async (id, status) => {
    await updateDoc(doc(db, 'chargeItems', id), { paymentStatus: status });
    try { await updateDoc(doc(db, 'claims', id), { paymentStatus: status }); } catch (err) {}
    try { await updateDoc(doc(db, 'fines', id), { paymentStatus: status }); } catch (err) {}
    try { await updateDoc(doc(db, 'externalCharges', id), { paymentStatus: status }); } catch (err) {}

    setTimeout(async () => {
      const c = get().chargeItems.find(item => item.id === id);
      if (c) await get().recalculateReservationTotals(c.reservationId);
    }, 400);
  },
  
  processSecurityDeposit: async (reservationId, amount, holdUntil) => {
    const date = new Date().toISOString();
    const r = get().reservations.find((res) => res.id === reservationId);
    const customerId = r ? r.customerId : '';

    await updateDoc(doc(db, 'reservations', reservationId), {
      securityDepositAmount: amount,
      securityDepositStatus: 'On Hold',
      securityDepositCollectedDate: date,
      securityDepositHoldUntil: holdUntil,
    });

    const payId = uuidv4();
    const paymentObj = {
      id: payId,
      reservationId,
      customerId,
      amount,
      date,
      method: 'Credit Card',
      type: 'deposit' as const,
      label: 'Security Deposit Held',
    };
    await setDoc(doc(db, 'payments', payId), paymentObj);

    const depId = uuidv4();
    const depositObj = {
      id: depId,
      reservationId,
      customerId,
      amount,
      status: 'On Hold',
      collectedDate: date,
      holdUntil,
      notes: 'Security Deposit Processed'
    };
    await setDoc(doc(db, 'securityDeposits', depId), depositObj);

    setTimeout(async () => {
      await get().recalculateReservationTotals(reservationId);
    }, 450);
  },

  refundSecurityDeposit: async (reservationId, amount, method) => {
    const date = new Date().toISOString();
    const r = get().reservations.find((res) => res.id === reservationId);
    const customerId = r ? r.customerId : '';

    await updateDoc(doc(db, 'reservations', reservationId), {
      securityDepositStatus: 'Refunded',
      securityDepositRefunded: true,
      securityDepositRefundAmount: amount,
      securityDepositRefundMethod: method,
      securityDepositRefundDate: date,
    });

    const payId = uuidv4();
    const paymentObj = {
      id: payId,
      reservationId,
      customerId,
      amount,
      date,
      method,
      type: 'refund' as const,
      label: 'Security Deposit Refund',
    };
    await setDoc(doc(db, 'payments', payId), paymentObj);

    const depId = uuidv4();
    const depositObj = {
      id: depId,
      reservationId,
      customerId,
      amount: -amount,
      status: 'Refunded',
      collectedDate: date,
      refundAmount: amount,
      refundMethod: method,
      refundDate: date,
      notes: 'Security Deposit Refunded'
    };
    await setDoc(doc(db, 'securityDeposits', depId), depositObj);

    setTimeout(async () => {
      await get().recalculateReservationTotals(reservationId);
    }, 450);
  },

  recalculateReservationTotals: async (reservationId) => {
    const state = get();
    const res = state.reservations.find((r) => r.id === reservationId);
    if (!res) return;

    const charges = state.chargeItems.filter((c) => c.reservationId === reservationId);
    const payments = state.payments.filter((p) => p.reservationId === reservationId);

    let totalAmount = res.baseRental;
    charges.forEach((c) => {
      totalAmount += c.amount;
    });

    const totalPaid = payments
      .filter((p) => p.type === 'payment')
      .reduce((sum, p) => sum + p.amount, 0);

    const balance = totalAmount - totalPaid;

    const isFullyPaid = balance <= 0;
    const isDepositRecorded = res.securityDepositStatus === 'On Hold';

    let updatedStatus = res.status;
    if (isFullyPaid && isDepositRecorded && ['Pending', 'Confirmed'].includes(res.status)) {
      updatedStatus = 'Checked Out';
    }

    await updateDoc(doc(db, 'reservations', reservationId), {
      totalAmount,
      balance,
      status: updatedStatus
    });

    setTimeout(async () => {
      const updatedRes = get().reservations.find((r) => r.id === reservationId);
      if (updatedRes) {
        await get().syncVehicleStatus(updatedRes);
        await get().recalculateCustomerStats(updatedRes.customerId);
      }
    }, 400);
  },

  recalculateCustomerStats: async (customerId) => {
    const state = get();
    
    const customerReservations = state.reservations.filter((r) => r.customerId === customerId);
    const activeReservations = customerReservations.filter((r) => !['Completed', 'Cancelled'].includes(r.status)).length;
    const totalRentals = customerReservations.length;
    const lastRentalInfo = [...customerReservations].sort((a,b) => new Date(b.pickupDate).getTime() - new Date(a.pickupDate).getTime())[0];
    const lastRentalDate = lastRentalInfo?.pickupDate || '';

    const customerPayments = state.payments.filter((p) => p.customerId === customerId && p.type === 'payment');
    const lifetimeRevenue = customerPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = lifetimeRevenue;

    const outstandingBalance = customerReservations.reduce((sum, r) => sum + Math.max(0, r.balance), 0);

    const customerCharges = state.chargeItems.filter((c) => c.customerId === customerId);
    const totalClaims = customerCharges.filter(c => c.category === 'Claim').reduce((sum, c) => sum + c.amount, 0);
    const totalFines = customerCharges.filter(c => c.category === 'Fine').reduce((sum, c) => sum + c.amount, 0);

    await updateDoc(doc(db, 'customers', customerId), {
      totalRentals,
      activeReservations,
      totalPaid,
      outstandingBalance,
      totalClaims,
      totalFines,
      lifetimeRevenue,
      lastRentalDate,
    });
  },

  syncVehicleStatus: async (reservation) => {
    let newStatus = '';
    if (reservation.status === 'Checked Out') newStatus = 'Rented';
    else if (reservation.status === 'Checked In') {
        newStatus = 'Available';
    }
    else if (reservation.status === 'Completed' || reservation.status === 'Cancelled') {
        newStatus = 'Available';
    }

    if (newStatus) {
      await updateDoc(doc(db, 'vehicles', reservation.vehicleId), { status: newStatus });
    }
  },

  addContract: async (data, uploadedByEmail) => {
    const id = uuidv4();
    const contractObj: RentalContract = {
      ...data,
      id,
      status: 'Inactive',
      uploadedAt: new Date().toISOString(),
      uploadedBy: uploadedByEmail
    };
    await setDoc(doc(db, 'contracts', id), contractObj);
  },

  activateContract: async (id) => {
    const state = get();
    const contractsList = state.contracts;
    for (const contract of contractsList) {
      const activeStatus = contract.id === id ? 'Active' : 'Inactive';
      await setDoc(doc(db, 'contracts', contract.id), {
        ...contract,
        status: activeStatus
      });
    }
  },

  deleteContract: async (id) => {
    await deleteDoc(doc(db, 'contracts', id));
  }
}));

// Subscribe to all Firebase Collections in real-time to keep the local Zustand state perfectly updated!
export function setupFirebaseSync() {
  console.log('[Firebase] Initialising dynamic collection sync listeners...');

  // 1. Users
  onSnapshot(collection(db, 'users'), (snap) => {
    if (snap.empty) {
      // Seed first admin user
      const id = 'admin-override';
      setDoc(doc(db, 'users', id), {
        id,
        name: 'Cerez Vincent',
        email: 'Cerezvincent1@gmail.com',
        role: 'Admin',
        status: 'Active',
        password: 'admin1234!',
      });
    } else {
      const list = snap.docs.map(d => ({ ...d.data() } as SystemUser));
      useStore.setState({ systemUsers: list });
    }
  });

  // 2. Customers
  onSnapshot(collection(db, 'customers'), (snap) => {
    if (snap.empty) {
      seedCustomers.forEach(c => setDoc(doc(db, 'customers', c.id), c));
    } else {
      const list = snap.docs.map(d => ({ ...d.data() } as Customer));
      useStore.setState({ customers: list });
    }
  });

  // 3. Vehicles
  onSnapshot(collection(db, 'vehicles'), (snap) => {
    if (snap.empty) {
      seedVehicles.forEach(v => setDoc(doc(db, 'vehicles', v.id), v));
    } else {
      const list = snap.docs.map(d => ({ ...d.data() } as Vehicle));
      useStore.setState({ vehicles: list });
    }
  });

  // 4. Reservations
  onSnapshot(collection(db, 'reservations'), (snap) => {
    if (snap.empty) {
      seedReservations.forEach(r => setDoc(doc(db, 'reservations', r.id), r));
    } else {
      const list = snap.docs.map(d => ({ ...d.data() } as Reservation));
      useStore.setState({ reservations: list });
    }
  });

  // 5. Payments
  onSnapshot(collection(db, 'payments'), (snap) => {
    if (snap.empty) {
      seedPayments.forEach(p => setDoc(doc(db, 'payments', p.id), p));
    } else {
      const list = snap.docs.map(d => ({ ...d.data() } as Payment));
      useStore.setState({ payments: list });
    }
  });

  // 6. Charge Templates
  onSnapshot(collection(db, 'chargeTemplates'), (snap) => {
    if (snap.empty) {
      seedChargeTemplates.forEach(t => setDoc(doc(db, 'chargeTemplates', t.id), t));
    } else {
      const list = snap.docs.map(d => ({ ...d.data() } as ChargeTemplate));
      useStore.setState({ chargeTemplates: list });
    }
  });

  // 7. Maintenances
  onSnapshot(collection(db, 'maintenance'), (snap) => {
    const list = snap.docs.map(d => ({ ...d.data() } as Maintenance));
    useStore.setState({ maintenances: list });
  });

  // 8. Charge Items (all combined)
  onSnapshot(collection(db, 'chargeItems'), (snap) => {
    const list = snap.docs.map(d => ({ ...d.data() } as ChargeItem));
    useStore.setState({ chargeItems: list });
  });

  // 9. Archived Customers
  onSnapshot(collection(db, 'archivedCustomers'), (snap) => {
    const list = snap.docs.map(d => ({ ...d.data() } as Customer));
    useStore.setState({ archivedCustomers: list });
  });

  // 10. Archived Vehicles
  onSnapshot(collection(db, 'archivedVehicles'), (snap) => {
    const list = snap.docs.map(d => ({ ...d.data() } as Vehicle));
    useStore.setState({ archivedVehicles: list });
  });

  // 11. Archived Reservations
  onSnapshot(collection(db, 'archivedReservations'), (snap) => {
    const list = snap.docs.map(d => ({ ...d.data() } as Reservation));
    useStore.setState({ archivedReservations: list });
  });

  // 12. Archived Charge Templates
  onSnapshot(collection(db, 'archivedChargeTemplates'), (snap) => {
    const list = snap.docs.map(d => ({ ...d.data() } as ChargeTemplate));
    useStore.setState({ archivedChargeTemplates: list });
  });

  // 13. Security Deposits
  onSnapshot(collection(db, 'securityDeposits'), (snap) => {
    const list = snap.docs.map(d => d.data());
    useStore.setState({ securityDeposits: list });
  });

  // 14. Claims
  onSnapshot(collection(db, 'claims'), (snap) => {
    const list = snap.docs.map(d => d.data());
    useStore.setState({ claims: list });
  });

  // 15. Fines
  onSnapshot(collection(db, 'fines'), (snap) => {
    const list = snap.docs.map(d => d.data());
    useStore.setState({ fines: list });
  });

  // 16. External Charges
  onSnapshot(collection(db, 'externalCharges'), (snap) => {
    const list = snap.docs.map(d => d.data());
    useStore.setState({ externalCharges: list });
  });

  // 17. Commissions
  onSnapshot(collection(db, 'commissions'), (snap) => {
    const list = snap.docs.map(d => d.data());
    useStore.setState({ commissions: list });
  });

  // 18. Contracts & Agreements
  onSnapshot(collection(db, 'contracts'), (snap) => {
    if (snap.empty) {
      const defaultContracts: RentalContract[] = [
        {
          id: 'contract-standard',
          name: 'Philly Car Rental Agreement (Standard)',
          type: 'Standard Rental Agreement',
          content: `VEHICLE RENTAL TERMS AND CONDITIONS

1. RENTAL CONTRACT
This Vehicle Rental Agreement ("Agreement") is made between Philly Car Rental System ("Company") and the Renter ("Customer"). Under this Agreement, the Company agrees to rent the vehicle to the Customer subject to all terms and conditions detailed herein.

2. VEHICLE USE & RESTRICTIONS
The Vehicle must not be driven by any person other than the authorized Customer or permitted additional driver specified. The Customer agrees not to use the Vehicle for any illegal activity, racing, hauling commercially beyond specified limits, or off-road driving.

3. PAYMENT, CHARGES & SECURITY DEPOSIT
The Customer agrees to settle all rental charges, toll fees, fines, and fuel costs as calculated. A refundable security deposit ($200.00 to $500.00 depending on vehicle class) is charged before vehicle handover. This deposit is kept "On Hold" and refunded promptly upon successful return of the vehicle in its original condition.

4. INSURANCE & DAMAGE RESPONSIBILITY
The Customer agrees that they are responsible for any physical damage, loss, theft, or vandalism to the vehicle during the rental term. If personal insurance does not cover the incident, the Customer will be held financially responsible for repairs and any loss of use of the vehicle.

5. RESPONSIBILITY FOR FINES AND VIOLATIONS
The Customer is fully responsible for all parking tickets, traffic violations, toll bypasses, and towing fees incurred during the rental duration. Supplemental processing charges may apply per violation.

6. VEHICLE RETURN POLICY
The Vehicle must be returned to the designated location on the agreed-upon return date and time specified in the Reservation. Late returns may trigger additional daily or hourly rate surcharges.`,
          status: 'Active',
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'system@fleetpro.com',
          fileName: 'standard_rental_agreement_2026.pdf',
          fileSize: '342 KB'
        },
        {
          id: 'contract-suv',
          name: 'SUV & Luxury Specialty Vehicle Waiver',
          type: 'Premium SUV Waiver',
          content: `SUPPLEMENTAL SPECIALTY ROAD & OFF-ROAD WAIVER

1. OVERVIEW & SCOPE
This specialty waiver is required for all premium classes (SUV, Elite Electric, and Light Trucks) rented through Philly Car Rental. These terms complement the primary leasing agreement.

2. SPECIALTY MILEAGE LIMITS
While standard sedans support uninhibited regional driving, specialty class vehicles are capped at 250 miles per day. Overages are charged at an incremental $0.45 per surplus mile traveled.

3. DAMAGE INSPECTION AND EXCESS CHARGES
Due to higher repair costs on luxury components and larger SUV body panels, the minimum temporary security deposit is established at $300.00. Both the client and fleet representative must sign off on the standard pre-rental video checklist before keys are handed over.

4. TOWING AND TRAILER HAULING
Towing of any secondary equipment, boats, trailers, or disabled vehicles is strictly prohibited unless specifically authorized on the reservation sheet. Unauthorized hauling voids optional waiver coverages and renders the renter fully liable.`,
          status: 'Inactive',
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'system@fleetpro.com',
          fileName: 'suv_luxury_waiver_rev2.pdf',
          fileSize: '185 KB'
        }
      ];
      defaultContracts.forEach(c => setDoc(doc(db, 'contracts', c.id), c));
    } else {
      const list = snap.docs.map(d => ({ ...d.data() } as RentalContract));
      useStore.setState({ contracts: list });
    }
  });
}
