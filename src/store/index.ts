import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays, parseISO } from 'date-fns';
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

  archivedCustomers: Customer[];
  archivedVehicles: Vehicle[];
  archivedReservations: Reservation[];
  archivedChargeTemplates: ChargeTemplate[];

  // User Actions
  addSystemUser: (user: Omit<SystemUser, 'id'>) => void;
  updateSystemUser: (id: string, user: Partial<SystemUser>) => void;
  deleteSystemUser: (id: string) => void;

  // Actions
  addCustomer: (customer: Omit<Customer, 'id' | 'totalRentals' | 'activeReservations' | 'totalPaid' | 'outstandingBalance' | 'totalClaims' | 'totalFines' | 'lifetimeRevenue'>) => string;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;


  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;

  deleteCustomer: (id: string) => void;
  deleteCustomers: (ids: string[]) => void;
  deleteVehicle: (id: string) => void;
  deleteVehicles: (ids: string[]) => void;
  deleteReservation: (id: string) => void;
  deleteReservations: (ids: string[]) => void;
  addChargeTemplate: (template: Omit<ChargeTemplate, 'id'>) => void;
  updateChargeTemplate: (id: string, template: Partial<ChargeTemplate>) => void;
  deleteChargeTemplate: (id: string) => void;
  deleteChargeTemplates: (ids: string[]) => void;

  createReservation: (reservationData: Omit<Reservation, 'id' | 'baseRental' | 'totalAmount' | 'balance' | 'bookingDate' | 'vehicleReturned' | 'securityDepositStatus' | 'securityDepositRefunded'>, selectedChargeTemplateIds: string[]) => string;
  updateReservationStatus: (id: string, status: ReservationStatus) => void;
  updateReservation: (id: string, data: Partial<Reservation>) => void;
  markVehicleReturned: (id: string) => void;

  addPayment: (payment: Omit<Payment, 'id'>) => void;
  addChargeItem: (charge: Omit<ChargeItem, 'id'>) => void;
  updateChargeItemStatus: (id: string, status: 'Pending' | 'Paid') => void;
  
  processSecurityDeposit: (reservationId: string, amount: number, holdUntil: string) => void;
  refundSecurityDeposit: (reservationId: string, amount: number, method: string) => void;

  recalculateCustomerStats: (customerId: string) => void;
  recalculateReservationTotals: (reservationId: string) => void;
  syncVehicleStatus: (reservation: Reservation) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      systemUsers: [
        {
          id: 'admin-override',
          name: 'Cerez Vincent',
          email: 'Cerezvincent1@gmail.com',
          role: 'Admin',
          status: 'Active',
          password: 'admin1234!', // Hardcoded for demo/mock login
        }
      ],
      customers: [],
      vehicles: [],
      reservations: [],
      payments: [],
      chargeItems: [],
      chargeTemplates: [
        { id: 't1', name: 'Insurance', category: 'External Charge', rate: 30, perDay: true },
        { id: 't2', name: 'Toll Fee', category: 'External Charge', rate: 20, perDay: true },
        { id: 't3', name: 'Smoking Fee', category: 'Fine', rate: 150, perDay: false },
        { id: 't4', name: 'Damage Claim', category: 'Claim', rate: 500, perDay: false },
      ],
      maintenances: [],
      archivedCustomers: [],
      archivedVehicles: [],
      archivedReservations: [],
      archivedChargeTemplates: [],

      addSystemUser: (data) =>
        set((state) => ({ systemUsers: [...state.systemUsers, { ...data, id: uuidv4() }] })),

      updateSystemUser: (id, data) =>
        set((state) => ({
          systemUsers: state.systemUsers.map((u) => (u.id === id ? { ...u, ...data } : u)),
        })),

      deleteSystemUser: (id) =>
        set((state) => ({
          systemUsers: state.systemUsers.filter((u) => u.id !== id),
        })),

      addCustomer: (data) => {
        const id = uuidv4();
        set((state) => ({
          customers: [
            ...state.customers,
            {
              ...data,
              id,
              totalRentals: 0,
              activeReservations: 0,
              totalPaid: 0,
              outstandingBalance: 0,
              totalClaims: 0,
              totalFines: 0,
              lifetimeRevenue: 0,
            },
          ],
        }));
        return id;
      },

      updateCustomer: (id, data) =>
        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),

      deleteCustomer: (id) =>
        set((state) => {
          const toArchive = state.customers.find(c => c.id === id);
          return {
            customers: state.customers.filter((c) => c.id !== id),
            archivedCustomers: toArchive ? [...state.archivedCustomers, toArchive] : state.archivedCustomers,
          };
        }),

      deleteCustomers: (ids) =>
        set((state) => {
          const toArchive = state.customers.filter(c => ids.includes(c.id));
          return {
            customers: state.customers.filter((c) => !ids.includes(c.id)),
            archivedCustomers: [...state.archivedCustomers, ...toArchive],
          };
        }),

      addVehicle: (data) =>
        set((state) => ({ vehicles: [...state.vehicles, { ...data, id: uuidv4() }] })),

      updateVehicle: (id, data) =>
        set((state) => ({
          vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, ...data } : v)),
        })),

      deleteVehicle: (id) =>
        set((state) => {
          const toArchive = state.vehicles.find(v => v.id === id);
          return {
            vehicles: state.vehicles.filter((v) => v.id !== id),
            archivedVehicles: toArchive ? [...state.archivedVehicles, toArchive] : state.archivedVehicles,
          };
        }),

      deleteVehicles: (ids) =>
        set((state) => {
          const toArchive = state.vehicles.filter(v => ids.includes(v.id));
          return {
            vehicles: state.vehicles.filter((v) => !ids.includes(v.id)),
            archivedVehicles: [...state.archivedVehicles, ...toArchive],
          };
        }),

      deleteReservation: (id) =>
        set((state) => {
          const toArchive = state.reservations.find(r => r.id === id);
          return {
            reservations: state.reservations.filter((r) => r.id !== id),
            archivedReservations: toArchive ? [...state.archivedReservations, toArchive] : state.archivedReservations,
          };
        }),

      deleteReservations: (ids) =>
        set((state) => {
          const toArchive = state.reservations.filter(r => ids.includes(r.id));
          return {
            reservations: state.reservations.filter((r) => !ids.includes(r.id)),
            archivedReservations: [...state.archivedReservations, ...toArchive],
          };
        }),

      addChargeTemplate: (data) =>
        set((state) => ({
          chargeTemplates: [...state.chargeTemplates, { ...data, id: uuidv4() }],
        })),

      updateChargeTemplate: (id, data) =>
        set((state) => ({
          chargeTemplates: state.chargeTemplates.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),

      deleteChargeTemplate: (id) =>
        set((state) => {
          const toArchive = state.chargeTemplates.find(t => t.id === id);
          return {
            chargeTemplates: state.chargeTemplates.filter((t) => t.id !== id),
            archivedChargeTemplates: toArchive ? [...state.archivedChargeTemplates, toArchive] : state.archivedChargeTemplates,
          };
        }),

      deleteChargeTemplates: (ids) =>
        set((state) => {
          const toArchive = state.chargeTemplates.filter(t => ids.includes(t.id));
          return {
            chargeTemplates: state.chargeTemplates.filter((t) => !ids.includes(t.id)),
            archivedChargeTemplates: [...state.archivedChargeTemplates, ...toArchive],
          };
        }),

      createReservation: (data, selectedChargeTemplateIds) => {
        const id = uuidv4();
        const state = get();
        
        // Double booking check logic could go here or in UI
        const overlap = state.reservations.some(r => 
          r.vehicleId === data.vehicleId && 
          r.status !== 'Cancelled' &&
          r.status !== 'Completed' &&
          ((data.pickupDate >= r.pickupDate && data.pickupDate <= r.returnDate) ||
           (data.returnDate >= r.pickupDate && data.returnDate <= r.returnDate))
        );
        if (overlap) throw new Error("Vehicle already reserved for selected dates.");

        const vehicle = state.vehicles.find((v) => v.id === data.vehicleId);
        if (!vehicle) return;

        let days = differenceInDays(parseISO(data.returnDate), parseISO(data.pickupDate));
        if (days < 1) days = 1;

        const baseRental = vehicle.dailyRate * days;

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

        const newCharges: ChargeItem[] = selectedChargeTemplateIds.map((templateId) => {
          const t = state.chargeTemplates.find((t) => t.id === templateId);
          if (!t) return null;
          const amount = t.perDay ? t.rate * days : t.rate;
          const descriptionDesc = t.perDay ? `${t.name} $${t.rate.toFixed(2)}/Day ${days} Days` : t.name;
          return {
            id: uuidv4(),
            reservationId: id,
            customerId: data.customerId,
            vehicleId: data.vehicleId,
            category: t.category,
            description: descriptionDesc,
            amount,
            paymentStatus: 'Pending',
            date: new Date().toISOString(),
          };
        }).filter(Boolean) as ChargeItem[];

        set((state) => ({
          reservations: [...state.reservations, newReservation],
          chargeItems: [...state.chargeItems, ...newCharges],
        }));

        get().recalculateReservationTotals(id);
        get().syncVehicleStatus(newReservation);
        
        return id;
      },

      updateReservationStatus: (id, status) => {
        set((state) => {
          const reservations = state.reservations.map((r) => {
            if (r.id !== id) return r;
            return { ...r, status };
          });
          return { reservations };
        });
        const r = get().reservations.find(r => r.id === id);
        if (r) get().syncVehicleStatus(r);
        if (r) get().recalculateCustomerStats(r.customerId);
      },
      
      updateReservation: (id, data) => {
        set((state) => ({
          reservations: state.reservations.map(r => r.id === id ? { ...r, ...data } : r)
        }));
        const res = get().reservations.find(r => r.id === id);
        if (res) {
          get().recalculateCustomerStats(res.customerId);
          get().syncVehicleStatus(res);
        }
      },

      markVehicleReturned: (id) => {
        set((state) => ({
          reservations: state.reservations.map((r) =>
            r.id === id ? { ...r, vehicleReturned: true, status: 'Checked In' } : r
          ),
        }));
        const res = get().reservations.find(r => r.id === id);
        if (res) {
          get().syncVehicleStatus(res);
          get().recalculateCustomerStats(res.customerId);
        }
      },

      addPayment: (payment) => {
        set((state) => ({ payments: [...state.payments, { ...payment, id: uuidv4() }] }));
        get().recalculateReservationTotals(payment.reservationId);
      },

      addChargeItem: (charge) => {
        set((state) => ({ chargeItems: [...state.chargeItems, { ...charge, id: uuidv4() }] }));
        get().recalculateReservationTotals(charge.reservationId);
      },

      updateChargeItemStatus: (id, status) => {
        set((state) => ({
          chargeItems: state.chargeItems.map((c) =>
            c.id === id ? { ...c, paymentStatus: status } : c
          ),
        }));
        const c = get().chargeItems.find(c => c.id === id);
        if (c) get().recalculateReservationTotals(c.reservationId);
      },

      processSecurityDeposit: (reservationId, amount, holdUntil) => {
        const date = new Date().toISOString();
        set((state) => ({
          reservations: state.reservations.map((r) =>
            r.id === reservationId
              ? {
                  ...r,
                  securityDepositAmount: amount,
                  securityDepositStatus: 'On Hold',
                  securityDepositCollectedDate: date,
                  securityDepositHoldUntil: holdUntil,
                }
              : r
          ),
          payments: [
            ...state.payments,
            {
              id: uuidv4(),
              reservationId,
              customerId: state.reservations.find((r) => r.id === reservationId)?.customerId || '',
              amount,
              date,
              method: 'Credit Card',
              type: 'deposit',
              label: 'Security Deposit Held',
            },
          ],
        }));
        get().recalculateReservationTotals(reservationId);
      },

      refundSecurityDeposit: (reservationId, amount, method) => {
        const date = new Date().toISOString();
        set((state) => ({
          reservations: state.reservations.map((r) =>
            r.id === reservationId
              ? {
                  ...r,
                  securityDepositStatus: 'Refunded',
                  securityDepositRefunded: true,
                  securityDepositRefundAmount: amount,
                  securityDepositRefundMethod: method,
                  securityDepositRefundDate: date,
                }
              : r
          ),
          payments: [
            ...state.payments,
            {
              id: uuidv4(),
              reservationId,
              customerId: state.reservations.find((r) => r.id === reservationId)?.customerId || '',
              amount, // Positive amount for refund transaction record
              date,
              method,
              type: 'refund',
              label: 'Security Deposit Refund',
            },
          ],
        }));
        get().recalculateReservationTotals(reservationId);
      },

      recalculateReservationTotals: (reservationId) => {
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
          .filter((p) => p.type === 'payment') // Only standard payments count to reduce balance
          .reduce((sum, p) => sum + p.amount, 0);

        const balance = totalAmount - totalPaid;

        set((state) => {
          const updatedReservations = state.reservations.map((r) => {
            if (r.id !== reservationId) return r;

            const isFullyPaid = balance <= 0;
            const isDepositRecorded = r.securityDepositStatus === 'On Hold';

            let updatedStatus = r.status;
            if (isFullyPaid && isDepositRecorded && ['Pending', 'Confirmed'].includes(r.status)) {
              updatedStatus = 'Checked Out';
            }

            return { ...r, totalAmount, balance, status: updatedStatus };
          });

          return { reservations: updatedReservations };
        });

        const updatedRes = get().reservations.find((r) => r.id === reservationId);
        if (updatedRes) {
          get().syncVehicleStatus(updatedRes);
          get().recalculateCustomerStats(updatedRes.customerId);
        }
      },

      recalculateCustomerStats: (customerId) => {
        const state = get();
        
        const customerReservations = state.reservations.filter((r) => r.customerId === customerId);
        const activeReservations = customerReservations.filter((r) => !['Completed', 'Cancelled'].includes(r.status)).length;
        const totalRentals = customerReservations.length;
        const lastRentalInfo = customerReservations.sort((a,b) => new Date(b.pickupDate).getTime() - new Date(a.pickupDate).getTime())[0];
        const lastRentalDate = lastRentalInfo?.pickupDate;

        const customerPayments = state.payments.filter((p) => p.customerId === customerId && p.type === 'payment');
        const lifetimeRevenue = customerPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalPaid = lifetimeRevenue;

        const outstandingBalance = customerReservations.reduce((sum, r) => sum + Math.max(0, r.balance), 0);

        const customerCharges = state.chargeItems.filter((c) => c.customerId === customerId);
        const totalClaims = customerCharges.filter(c => c.category === 'Claim').reduce((sum, c) => sum + c.amount, 0);
        const totalFines = customerCharges.filter(c => c.category === 'Fine').reduce((sum, c) => sum + c.amount, 0);

        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === customerId
              ? {
                  ...c,
                  totalRentals,
                  activeReservations,
                  totalPaid,
                  outstandingBalance,
                  totalClaims,
                  totalFines,
                  lifetimeRevenue,
                  lastRentalDate,
                }
              : c
          ),
        }));
      },

      syncVehicleStatus: (reservation) => {
        let newStatus = '';
        if (reservation.status === 'Checked Out') newStatus = 'Rented';
        else if (reservation.status === 'Checked In') {
            // Need to check if there are other reservations. If not, Available.
            newStatus = 'Available';
        }
        else if (reservation.status === 'Completed' || reservation.status === 'Cancelled') {
            newStatus = 'Available';
        }

        if (newStatus) {
            set((state) => ({
                vehicles: state.vehicles.map(v => v.id === reservation.vehicleId ? { ...v, status: newStatus as any } : v)
            }));
        }
      }
    }),
    {
      name: 'car-rental-storage',
    }
  )
);
