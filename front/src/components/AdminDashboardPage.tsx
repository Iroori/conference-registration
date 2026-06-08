import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetAdminUsers,
  apiUpdateUserMemberType,
  apiGetAdminIasbseMembers,
  apiGetAdminPayments,
  apiGetAdminOptions,
  apiUpdateOptionCapacity,
  apiDeleteUser,
  apiAddAdminIasbseMember,
  apiDeleteAdminIasbseMember,
  apiGetAdminDiscountCodes,
  apiCreateAdminDiscountCode,
  apiDeleteAdminDiscountCode,
  apiDeleteAdminPayment,
} from '../lib/api';
import type { MemberType } from '../types';

type SubTab = 'USERS' | 'IABSE' | 'PAYMENTS' | 'OPTIONS' | 'DISCOUNT_CODES';

const OptionInventoryRow = ({
  option,
  onSave,
  isPending,
}: {
  option: any;
  onSave: (id: string, cap: number) => void;
  isPending: boolean;
}) => {
  const [cap, setCap] = useState<number>(option.maxCapacity ?? 0);
  const isValid = cap >= (option.currentCount ?? 0);

  return (
    <tr className="hover:bg-slate-50/50 transition">
      <td className="px-4 py-3.5">
        <span className="font-semibold text-slate-900">{option.nameEn}</span>
      </td>
      <td className="px-4 py-3.5 font-bold text-slate-800 text-center">
        {option.currentCount ?? 0}
      </td>
      <td className="px-4 py-3.5 font-semibold text-slate-500 text-center">
        {option.maxCapacity ?? 'Unlimited'}
      </td>
      <td className="px-4 py-3.5 text-center">
        <span className={`font-bold ${option.maxCapacity - option.currentCount <= 5 ? 'text-red-500 font-extrabold' : 'text-teal-600'}`}>
          {option.maxCapacity - option.currentCount}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2 max-w-[180px]">
          <input
            type="number"
            min={option.currentCount ?? 0}
            value={cap}
            onChange={(e) => setCap(parseInt(e.target.value) || 0)}
            className={`w-20 px-2 py-1 text-xs border rounded-lg focus:outline-none focus:ring-1 ${
              isValid
                ? 'border-slate-200 focus:border-teal-500 focus:ring-teal-100 bg-white text-slate-800'
                : 'border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50 text-red-700'
            }`}
          />
          <button
            onClick={() => onSave(option.id, cap)}
            disabled={!isValid || isPending || cap === option.maxCapacity}
            className="px-3 py-1 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-lg text-[11px] shadow-sm transition"
          >
            Save
          </button>
        </div>
        {!isValid && (
          <p className="text-[9px] text-red-550 mt-1 font-medium">Cannot be less than sold count ({option.currentCount})</p>
        )}
      </td>
    </tr>
  );
};

export const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState<SubTab>('USERS');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newIabseId, setNewIabseId] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');

  // Discount code form states
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [memberRate, setMemberRate] = useState<number>(0);
  const [nonMemberRate, setNonMemberRate] = useState<number>(0);
  const [galaFree, setGalaFree] = useState(false);
  const [accompFree, setAccompFree] = useState(false);
  const [tourFree, setTourFree] = useState(false);
  
  const toggleExpandPayment = (id: number) => {
    setExpandedPaymentId((prev) => (prev === id ? null : id));
  };

  const queryClient = useQueryClient();

  const [userPage, setUserPage] = useState(0);
  const [userTabSearchInput, setUserTabSearchInput] = useState('');
  const [userTabSearchTerm, setUserTabSearchTerm] = useState('');

  // Queries
  const {
    data: usersResponse,
    isLoading: loadingUsers,
    isError: errorUsers,
  } = useQuery({
    queryKey: ['adminUsers', userPage, userTabSearchTerm, activeTab === 'DISCOUNT_CODES' ? userSearchTerm : ''],
    queryFn: () => {
      const search = activeTab === 'DISCOUNT_CODES' ? userSearchTerm : userTabSearchTerm;
      const size = activeTab === 'DISCOUNT_CODES' ? 50 : 20;
      const page = activeTab === 'DISCOUNT_CODES' ? 0 : userPage;
      return apiGetAdminUsers(page, size, search);
    },
    enabled: activeTab === 'USERS' || activeTab === 'DISCOUNT_CODES',
  });

  const users = usersResponse?.users;

  const getPageNumbers = () => {
    const total = usersResponse?.totalPages ?? 0;
    const current = usersResponse?.currentPage ?? 0;
    
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i);
    }
    
    if (current < 4) {
      return [0, 1, 2, 3, 4, '...', total - 1];
    }
    
    if (current > total - 5) {
      return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1];
    }
    
    return [0, '...', current - 1, current, current + 1, '...', total - 1];
  };

  const {
    data: iasbseMembers,
    isLoading: loadingIasbse,
    isError: errorIasbse,
  } = useQuery({
    queryKey: ['adminIasbseMembers', searchTerm],
    queryFn: () => apiGetAdminIasbseMembers(searchTerm),
    enabled: activeTab === 'IABSE',
  });

  const handleSearchSubmit = () => {
    setSearchTerm(searchInput);
  };

  const handleSearchClear = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  const {
    data: payments,
    isLoading: loadingPayments,
    isError: errorPayments,
  } = useQuery({
    queryKey: ['adminPayments'],
    queryFn: apiGetAdminPayments,
    enabled: activeTab === 'PAYMENTS' || activeTab === 'USERS',
  });

  // Grade update mutation
  const updateGradeMutation = useMutation({
    mutationFn: ({ userId, memberType }: { userId: number; memberType: MemberType }) =>
      apiUpdateUserMemberType(userId, memberType),
    onSuccess: () => {
      // Invalidate and refetch users list immediately
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      alert('Member type updated successfully.');
    },
    onError: (err: any) => {
      console.error(err);
      alert('Failed to update member type. Please try again.');
    },
  });

  const handleGradeChange = (userId: number, memberType: MemberType) => {
    if (window.confirm(`Are you sure you want to change this user's grade to ${memberType}?`)) {
      updateGradeMutation.mutate({ userId, memberType });
    }
  };

  // User delete mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => apiDeleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      alert('User and all associated registration data have been permanently deleted.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete user. Please try again.';
      alert(msg);
    },
  });

  const handleDeleteUser = (userId: number, name: string) => {
    const message = `[WARNING - PERMANENT DELETION]\n\nAre you sure you want to PERMANENTLY delete registered user "${name}"?\n\nThis will:\n1. Erase their user account from the database.\n2. Permanently delete all associated payment records.\n3. Remove their Accompanying Person registration.\n4. Release and restore all reserved seats/tickets (like Technical Tour, Gala Dinner, etc.) back to the inventory.\n\nThis action CANNOT be undone. Click OK to proceed.`;
    if (window.confirm(message)) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Payment delete mutation
  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: number) => apiDeleteAdminPayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPayments'] });
      queryClient.invalidateQueries({ queryKey: ['adminOptions'] });
      alert('Payment record deleted successfully, options capacity and discount code status have been restored.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete payment record. Please try again.';
      alert(msg);
    },
  });

  const handleDeletePayment = (paymentId: number, regNo: string) => {
    const message = `[WARNING - PAYMENT RECORD DELETION]\n\nAre you sure you want to PERMANENTLY delete payment record "${regNo}"?\n\nThis will:\n1. Delete the payment record itself.\n2. Release and restore reserved program/registration option counts.\n3. Mark the applied discount code (if any) as unused so it can be used again.\n\nThis action cannot be undone. Click OK to proceed.`;
    if (window.confirm(message)) {
      deletePaymentMutation.mutate(paymentId);
    }
  };

  // IABSE manual member mutations
  const addIasbseMemberMutation = useMutation({
    mutationFn: (req: { iabseId: string; firstName: string; lastName: string }) =>
      apiAddAdminIasbseMember(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminIasbseMembers'] });
      setNewIabseId('');
      setNewFirstName('');
      setNewLastName('');
      setIsAddingMember(false);
      alert('IABSE member added successfully.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to add IABSE member. Please try again.';
      alert(msg);
    },
  });

  const deleteIasbseMemberMutation = useMutation({
    mutationFn: (id: number) => apiDeleteAdminIasbseMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminIasbseMembers'] });
      alert('IABSE member deleted successfully.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete IABSE member. Please try again.';
      alert(msg);
    },
  });

  const handleDeleteIasbseMember = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete IABSE member "${name}"?`)) {
      deleteIasbseMemberMutation.mutate(id);
    }
  };

  const handleAddIasbseMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIabseId.trim() || !newFirstName.trim() || !newLastName.trim()) {
      alert('Please fill in all fields.');
      return;
    }
    addIasbseMemberMutation.mutate({
      iabseId: newIabseId.trim(),
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
    });
  };

  const {
    data: options,
    isLoading: loadingOptions,
    isError: errorOptions,
  } = useQuery({
    queryKey: ['adminOptions'],
    queryFn: apiGetAdminOptions,
    enabled: activeTab === 'OPTIONS',
  });

  const {
    data: discountCodes,
    isLoading: loadingCodes,
    isError: errorCodes,
  } = useQuery({
    queryKey: ['adminDiscountCodes'],
    queryFn: apiGetAdminDiscountCodes,
    enabled: activeTab === 'DISCOUNT_CODES',
  });

  const createDiscountCodeMutation = useMutation({
    mutationFn: (req: {
      userEmail: string;
      iabseMemberDiscountRate: number;
      nonIabseMemberDiscountRate: number;
      galaDinnerFree: boolean;
      accompanyingPersonFree: boolean;
      technicalTourFree: boolean;
    }) => apiCreateAdminDiscountCode(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDiscountCodes'] });
      alert('Discount code generated and assigned successfully.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to create discount code.';
      alert(msg);
    },
  });

  const deleteDiscountCodeMutation = useMutation({
    mutationFn: (id: number) => apiDeleteAdminDiscountCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDiscountCodes'] });
      alert('Discount code deleted successfully.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete discount code.';
      alert(msg);
    },
  });

  const filteredSuggestions = useMemo(() => {
    if (!userSearchTerm.trim() || !users) return [];
    return users
      .filter((u) => 
        u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearchTerm.toLowerCase())
      )
      .slice(0, 5);
  }, [userSearchTerm, users]);

  const updateCapacityMutation = useMutation({
    mutationFn: ({ optionId, maxCapacity }: { optionId: string; maxCapacity: number }) =>
      apiUpdateOptionCapacity(optionId, maxCapacity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOptions'] });
      alert('Ticket capacity updated successfully.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update capacity.';
      alert(msg);
    },
  });

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExportExcel = () => {
    if (!payments || payments.length === 0) return;

    const headers = [
      'Registration No.',
      'Attendee Name',
      'Email',
      'Member Type',
      'Affiliation',
      'Total Amount (KRW)',
      'Payment Method',
      'Status',
      'Processed At',
      'Selected Options',
      'Accompanying Person'
    ];

    const rows = payments.map((p: any) => {
      const optionsStr = p.selectedOptions 
        ? p.selectedOptions.map((opt: any) => `${opt.nameEn} (${opt.category})`).join('; ')
        : '';
      
      const accompanyingStr = p.accompanyingPersons && p.accompanyingPersons.length > 0
        ? p.accompanyingPersons.map((ap: any) => `${ap.firstName} ${ap.lastName}`).join(', ')
        : '';

      return [
        p.registrationNumber || '',
        `${p.firstName} ${p.lastName}`,
        p.email || '',
        p.memberType || '',
        p.affiliation || '',
        p.totalAmount || 0,
        p.paymentMethod ? p.paymentMethod.replace('_', ' ') : '',
        p.status || '',
        p.paidAt ? formatDate(p.paidAt) : '',
        optionsStr,
        accompanyingStr
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const stringVal = String(val).replace(/"/g, '""');
          return `"${stringVal}"`;
        }).join(',')
      )
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `IABSE_Payments_Export_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderUserRegistrationAndOptions = (userEmail: string) => {
    const userPayment = payments?.find(
      (p) => p.email === userEmail && p.status === 'COMPLETED'
    );

    if (!userPayment) {
      return <span className="text-slate-400 font-medium italic">Unpaid / No Registration</span>;
    }

    const regOpt = userPayment.selectedOptions.find((o) => o.category === 'REGISTRATION');
    const programOpts = userPayment.selectedOptions.filter(
      (o) => o.category === 'PROGRAM' && !o.id.startsWith('OPT-TECH-TOUR-') && !o.id.startsWith('OPT-ACCOMP-')
    );
    const tourOpt = userPayment.selectedOptions.find((o) => o.id.startsWith('OPT-TECH-TOUR-'));
    const accompOpt = userPayment.selectedOptions.find((o) => o.id.startsWith('OPT-ACCOMP-'));

    return (
      <div className="space-y-1.5 text-[11px] leading-relaxed max-w-[240px]">
        {/* Registration Option */}
        {regOpt && (
          <div>
            <span className="font-semibold text-slate-800 bg-teal-50 border border-teal-200 text-teal-700 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">
              {regOpt.nameEn}
            </span>
          </div>
        )}

        {/* Program Options */}
        {programOpts.length > 0 && (
          <div className="text-slate-650 bg-slate-50/50 rounded-lg p-1.5 border border-slate-100">
            <span className="font-bold text-slate-500 uppercase text-[8px] tracking-wider block mb-0.5">Social Programme:</span>
            <ul className="list-disc list-inside pl-0.5 space-y-0.5">
              {programOpts.map((o) => (
                <li key={o.id} className="truncate" title={o.nameEn}>
                  {o.nameEn}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Technical Tour */}
        {tourOpt && (
          <div className="text-slate-650 bg-slate-50/50 rounded-lg p-1.5 border border-slate-100">
            <span className="font-bold text-slate-500 uppercase text-[8px] tracking-wider block mb-0.5">Technical Tour:</span>
            <span className="pl-0.5 truncate block" title={tourOpt.nameEn}>
              {tourOpt.nameEn}
            </span>
          </div>
        )}

        {/* Accompanying Person */}
        {accompOpt && userPayment.accompanyingPersons && userPayment.accompanyingPersons.length > 0 && (
          <div className="text-slate-650 bg-slate-50/50 rounded-lg p-1.5 border border-slate-100">
            <span className="font-bold text-slate-500 uppercase text-[8px] tracking-wider block mb-0.5">
              Accompanying ({userPayment.accompanyingPersons.length}):
            </span>
            <span className="pl-0.5 truncate block" title={userPayment.accompanyingPersons.map(p => `${p.firstName} ${p.lastName}`).join(', ')}>
              {userPayment.accompanyingPersons.map(p => `${p.firstName} ${p.lastName}`).join(', ')}
            </span>
          </div>
        )}

        {/* Payment Total */}
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between font-bold text-teal-700">
          <span>Gross Paid:</span>
          <span>{formatPrice(userPayment.totalAmount)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Admin Dashboard header */}
      <div className="bg-slate-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-400">
            Administrative Management Panel
          </h2>
        </div>

        {/* Sub-tabs switch */}
        <div className="flex bg-slate-900/50 p-0.5 rounded-xl border border-slate-700/50 flex-wrap">
          {(['USERS', 'IABSE', 'PAYMENTS', 'OPTIONS', 'DISCOUNT_CODES'] as SubTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                activeTab === tab
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'USERS'
                ? 'Registered Users'
                : tab === 'IABSE'
                ? 'IABSE Members (Excel)'
                : tab === 'PAYMENTS'
                ? 'Total Payments'
                : tab === 'OPTIONS'
                ? 'Ticket Inventory'
                : 'Discount Codes'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 bg-slate-50 min-h-[400px]">
        {/* TAB 1: Registered Users */}
        {activeTab === 'USERS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Registered Conference Attendees</h3>
              <span className="text-xs text-slate-500 font-medium bg-slate-200/60 px-2.5 py-1 rounded-full">
                {userTabSearchTerm ? 'Filtered count: ' : 'Total count: '}
                {usersResponse?.totalElements ?? 0}
              </span>
            </div>

            {/* Search and Filter Panel for USERS */}
            <div className="flex flex-col sm:flex-row gap-2 rounded-xl bg-white p-3 border border-slate-200 shadow-sm transition-all duration-300">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={userTabSearchInput}
                  onChange={(e) => setUserTabSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setUserPage(0);
                      setUserTabSearchTerm(userTabSearchInput);
                    }
                  }}
                  placeholder="Search registered attendees by name, email, or affiliation..."
                  className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 placeholder-slate-400 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all duration-200"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {userTabSearchInput && (
                  <button
                    onClick={() => {
                      setUserTabSearchInput('');
                      setUserTabSearchTerm('');
                      setUserPage(0);
                    }}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-650 transition"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setUserPage(0);
                    setUserTabSearchTerm(userTabSearchInput);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold rounded-lg text-xs shadow-sm hover:shadow active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </button>
                {userTabSearchTerm && (
                  <button
                    onClick={() => {
                      setUserTabSearchInput('');
                      setUserTabSearchTerm('');
                      setUserPage(0);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-semibold rounded-lg text-xs transition active:scale-95 flex items-center gap-1"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            {loadingUsers && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500"></div>
                <p className="text-xs font-medium text-slate-500">Loading user database...</p>
              </div>
            )}

            {errorUsers && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center text-red-600 text-xs font-medium">
                Failed to load registered users. Please check server connection.
              </div>
            )}

            {users && users.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400 text-xs font-medium">
                No users registered in the system yet.
              </div>
            )}

            {users && users.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="px-4 py-3.5">Attendee Name</th>
                      <th className="px-4 py-3.5">Email</th>
                      <th className="px-4 py-3.5">Affiliation & Position</th>
                      <th className="px-4 py-3.5 text-center">Author</th>
                      <th className="px-4 py-3.5 text-center">Presenter</th>
                      <th className="px-4 py-3.5">Paper Info</th>
                      <th className="px-4 py-3.5">Current Grade</th>
                      <th className="px-4 py-3.5">Manual Grade Control</th>
                      <th className="px-4 py-3.5">Registration & Options</th>
                      <th className="px-4 py-3.5">Registered At</th>
                      <th className="px-4 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-900">{`${u.firstName} ${u.lastName}`}</span>
                          {u.admin && (
                            <span className="ml-1.5 inline-block bg-indigo-150 border border-indigo-200 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              ADMIN
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">{u.email}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-slate-900">{u.affiliation}</div>
                          <div className="text-[10px] text-slate-500">{u.position || '-'}, {u.country}</div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {u.author ? (
                            <span className="inline-block bg-teal-100 border border-teal-200 text-teal-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              YES
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {u.presenter ? (
                            <span className="inline-block bg-teal-100 border border-teal-200 text-teal-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              YES
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-500 truncate max-w-[120px]" title={u.paperInfo || '-'}>
                          {u.paperInfo || '-'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            u.memberType === 'MEMBER'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : u.memberType === 'YOUNG_ENGINEER'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : u.memberType === 'NON_MEMBER'
                              ? 'bg-slate-150 text-slate-700 border border-slate-200'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}>
                            {u.memberType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <select
                            value={u.memberType}
                            onChange={(e) => handleGradeChange(u.id, e.target.value as MemberType)}
                            disabled={u.admin || updateGradeMutation.isPending}
                            className="rounded-lg border border-slate-250 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-100 disabled:bg-slate-100 disabled:text-slate-400 transition"
                          >
                            <option value="MEMBER">MEMBER (IABSE)</option>
                            <option value="NON_MEMBER">NON-MEMBER</option>
                            <option value="NON_MEMBER_PLUS">NON-MEMBER PLUS</option>
                            <option value="YOUNG_ENGINEER">YOUNG ENGINEER</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5">
                          {renderUserRegistrationAndOptions(u.email)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`)}
                            disabled={u.admin || deleteUserMutation.isPending}
                            className="px-2.5 py-1 bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:bg-slate-150 disabled:text-slate-400 text-white font-semibold rounded-lg text-[10px] shadow-sm hover:shadow active:scale-95 transition-all duration-200"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {users && users.length > 0 && usersResponse && usersResponse.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">
                  Showing{' '}
                  <span className="font-semibold text-slate-800">
                    {usersResponse.currentPage * usersResponse.size + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-slate-800">
                    {Math.min(
                      (usersResponse.currentPage + 1) * usersResponse.size,
                      usersResponse.totalElements
                    )}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-slate-800">
                    {usersResponse.totalElements}
                  </span>{' '}
                  attendees
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setUserPage((prev) => Math.max(prev - 1, 0))}
                    disabled={usersResponse.currentPage === 0}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent text-slate-650 transition flex items-center justify-center"
                    title="Previous Page"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {getPageNumbers().map((pageNum, idx) => {
                    if (pageNum === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2.5 py-1 text-slate-400 font-semibold select-none">
                          ...
                        </span>
                      );
                    }

                    const isCurrent = pageNum === usersResponse.currentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setUserPage(pageNum as number)}
                        className={`px-3 py-1.5 border rounded-lg text-xs font-semibold transition ${
                          isCurrent
                            ? 'bg-teal-500 border-teal-500 text-white shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-100 active:bg-slate-200'
                        }`}
                      >
                        {(pageNum as number) + 1}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setUserPage((prev) => Math.min(prev + 1, usersResponse.totalPages - 1))}
                    disabled={usersResponse.currentPage === usersResponse.totalPages - 1}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent text-slate-650 transition flex items-center justify-center"
                    title="Next Page"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: IABSE Members Excel Source */}
        {activeTab === 'IABSE' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">IABSE Official Registered Database</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Source spreadsheet: 2026-04-28 Members IABSE (1).xls
                </p>
              </div>
              <span className="text-xs text-slate-500 font-medium bg-slate-200/60 px-2.5 py-1 rounded-full self-start sm:self-auto transition-all">
                {searchTerm ? 'Filtered records: ' : 'Total records: '}
                {iasbseMembers?.length ?? 0}
              </span>
            </div>

            {/* Premium Search and Filter Panel */}
            <div className="flex flex-col sm:flex-row gap-2 rounded-xl bg-white p-3 border border-slate-200 shadow-sm transition-all duration-300">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit();
                    }
                  }}
                  placeholder="Search by last name, first name, or company..."
                  className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 placeholder-slate-400 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all duration-200"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchInput && (
                  <button
                    onClick={handleSearchClear}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-650 transition"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSearchSubmit}
                  className="flex-1 sm:flex-none px-4 py-2 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold rounded-lg text-xs shadow-sm hover:shadow active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </button>
                {searchTerm && (
                  <button
                    onClick={handleSearchClear}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-semibold rounded-lg text-xs transition active:scale-95 flex items-center gap-1"
                  >
                    Clear Filter
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAddingMember(!isAddingMember)}
                  className={`px-3 py-2 ${
                    isAddingMember
                      ? 'bg-slate-700 hover:bg-slate-800 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow'
                  } font-semibold rounded-lg text-xs transition active:scale-95 flex items-center gap-1`}
                >
                  {isAddingMember ? 'Cancel' : '+ Add Member'}
                </button>
              </div>
            </div>

            {isAddingMember && (
              <form
                onSubmit={handleAddIasbseMemberSubmit}
                className="bg-white rounded-xl border border-slate-205 p-4 shadow-sm space-y-4 animate-fadeIn"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-650"></span>
                    Manually Add IABSE Member
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      IABSE ID <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newIabseId}
                      onChange={(e) => setNewIabseId(e.target.value)}
                      placeholder="e.g. 66811267"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      First Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Last Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(false)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-650 font-semibold rounded-lg text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addIasbseMemberMutation.isPending}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs shadow-sm transition"
                  >
                    {addIasbseMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
              </form>
            )}

            {loadingIasbse && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500"></div>
                <p className="text-xs font-medium text-slate-500">Retrieving official IABSE members...</p>
              </div>
            )}

            {errorIasbse && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center text-red-600 text-xs font-medium">
                Failed to load IABSE database. Please verify backend state.
              </div>
            )}

            {iasbseMembers && iasbseMembers.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400 text-xs font-medium">
                No IABSE members imported yet. Check seeding log.
              </div>
            )}

            {iasbseMembers && iasbseMembers.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm max-h-[500px]">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)] bg-slate-100">
                      <th className="px-4 py-3.5">IABSE ID</th>
                      <th className="px-4 py-3.5">First Name</th>
                      <th className="px-4 py-3.5">Last Name</th>
                      <th className="px-4 py-3.5 text-center w-[100px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {iasbseMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3.5 font-mono font-bold text-gold">{m.iabseId}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800">{m.firstName}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800">{m.lastName}</td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteIasbseMember(m.id, `${m.firstName} ${m.lastName}`)}
                            disabled={deleteIasbseMemberMutation.isPending}
                            className="px-2 py-1 bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:bg-slate-150 disabled:text-slate-400 text-white font-semibold rounded-lg text-[10px] shadow-sm hover:shadow active:scale-95 transition-all duration-200"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Total Payments */}
        {activeTab === 'PAYMENTS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Unified Payment & Order History</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportExcel}
                  disabled={!payments || payments.length === 0}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-lg text-xs shadow-sm transition flex items-center gap-1.5"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export to Excel
                </button>
                <span className="text-xs text-slate-500 font-medium bg-slate-200/60 px-2.5 py-1 rounded-full">
                  Total transactions: {payments?.length ?? 0}
                </span>
              </div>
            </div>

            {loadingPayments && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500"></div>
                <p className="text-xs font-medium text-slate-500">Compiling financial records...</p>
              </div>
            )}

            {errorPayments && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center text-red-600 text-xs font-medium">
                Failed to load payments database. Please check authorization.
              </div>
            )}

            {payments && payments.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400 text-xs font-medium">
                No transactions recorded in the system yet.
              </div>
            )}

            {payments && payments.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="px-4 py-3.5 w-[30px]"></th>
                      <th className="px-4 py-3.5">Reg No.</th>
                      <th className="px-4 py-3.5">Attendee / Contact</th>
                      <th className="px-4 py-3.5">Type & Affiliation</th>
                      <th className="px-4 py-3.5 text-right font-bold text-slate-800">Total Amount</th>
                      <th className="px-4 py-3.5">Method</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-4 py-3.5">Processed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {payments.map((p) => {
                      const isExpanded = expandedPaymentId === p.id;
                      return (
                        <tr key={p.id} className="divide-y divide-slate-100 bg-white">
                          <td colSpan={8} className="p-0">
                            <table className="w-full border-collapse text-left text-xs">
                              <tbody>
                                <tr 
                                  onClick={() => toggleExpandPayment(p.id)}
                                  className="hover:bg-slate-50/75 cursor-pointer transition select-none"
                                >
                                  <td className="px-4 py-3.5 w-[30px] text-center text-slate-400">
                                    <svg 
                                      className={`h-3 w-3 transform transition-transform duration-200 ${isExpanded ? 'rotate-90 text-teal-500' : ''}`} 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                    </svg>
                                  </td>
                                  <td className="px-4 py-3.5 font-bold text-slate-800 uppercase tracking-wide">
                                    {p.registrationNumber}
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="font-semibold text-slate-900">{`${p.firstName} ${p.lastName}`}</div>
                                    <div className="text-[10px] text-slate-500 font-medium">{p.email}</div>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <div className="font-semibold text-[9px] uppercase tracking-wider text-slate-500">
                                      {p.memberType}
                                    </div>
                                    <div className="text-[10px] text-slate-660 font-medium truncate max-w-[150px]">
                                      {p.affiliation}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-bold text-teal-600">
                                    {formatPrice(p.totalAmount)}
                                  </td>
                                  <td className="px-4 py-3.5 font-bold text-slate-600 text-[10px] uppercase">
                                    {p.paymentMethod.replace('_', ' ')}
                                  </td>
                                  <td className="px-4 py-3.5 text-center">
                                    <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                      p.status === 'COMPLETED'
                                        ? 'bg-green-100 border border-green-200 text-green-800'
                                        : p.status === 'PENDING'
                                        ? 'bg-amber-100 border border-amber-200 text-amber-800 animate-pulse'
                                        : 'bg-red-100 border border-red-200 text-red-800'
                                    }`}>
                                      {p.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3.5 text-slate-500 font-medium">
                                    {formatDate(p.paidAt)}
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="bg-slate-50/50 border-t border-slate-100">
                                    <td colSpan={8} className="px-6 py-4">
                                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500"></span>
                                            Detailed Payment Breakdown
                                          </h4>
                                          <span className="text-[10px] text-slate-400 font-mono">Reg No: {p.registrationNumber}</span>
                                        </div>

                                        {/* Accompanying Persons Info */}
                                        {p.accompanyingPersons && p.accompanyingPersons.length > 0 && (
                                          <div className="rounded-lg bg-teal-50 border border-teal-100/50 px-3 py-2 text-xs text-teal-800 space-y-1">
                                            <div className="flex items-center gap-2">
                                              <svg className="h-4 w-4 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                              </svg>
                                              <span className="font-semibold text-teal-800">Accompanying Persons:</span>
                                            </div>
                                            <div className="pl-6 space-y-1">
                                              {p.accompanyingPersons.map((ap: any, idx: number) => (
                                                <p key={idx} className="font-medium text-slate-800">- {ap.firstName} {ap.lastName}</p>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Exhibitor Badges Info */}
                                        {p.exhibitorBadges && p.exhibitorBadges.length > 0 && (
                                          <div className="rounded-lg bg-teal-50 border border-teal-100/50 px-3 py-2 text-xs text-teal-800 space-y-1">
                                            <div className="flex items-center gap-2">
                                              <svg className="h-4 w-4 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 014 0m-6 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.333 0 4 .667 4 2v1H5v-1c0-1.333 2.667-2 4-2z" />
                                              </svg>
                                              <span className="font-semibold text-teal-800">Exhibitors:</span>
                                            </div>
                                            <div className="pl-6 space-y-1">
                                              {p.exhibitorBadges.map((eb: any, idx: number) => (
                                                <p key={idx} className="font-medium text-slate-800">- {eb.firstName} {eb.lastName}</p>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          {/* Options List */}
                                          <div className="space-y-3">
                                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Option Items</h5>
                                            <div className="divide-y divide-slate-100 border border-slate-150 rounded-lg overflow-hidden bg-white">
                                              {p.selectedOptions && p.selectedOptions.map((opt) => (
                                                <div key={opt.id} className="flex justify-between items-center p-3 text-xs hover:bg-slate-50/50 transition">
                                                  <div className="flex items-center gap-2">
                                                    <span className={`inline-block rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
                                                      opt.category === 'REGISTRATION' 
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                                        : opt.category === 'PROGRAM'
                                                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                    }`}>
                                                      {opt.category === 'REGISTRATION' ? 'Registration' : opt.category === 'PROGRAM' ? 'Program' : 'Admin'}
                                                    </span>
                                                    <div>
                                                      <div className="font-semibold text-slate-850">{opt.nameEn}</div>
                                                    </div>
                                                  </div>
                                                  <span className="font-mono font-bold text-slate-700">{formatPrice(opt.price)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Financial calculations */}
                                          <div className="space-y-3">
                                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Summary</h5>
                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
                                              {p.appliedDiscountCode && (
                                                <>
                                                  <div className="flex justify-between text-xs text-slate-600">
                                                    <span>Subtotal:</span>
                                                    <span className="font-mono">{formatPrice(p.subtotal)}</span>
                                                  </div>
                                                  <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                                                    <span>Discount (Code: {p.appliedDiscountCode}):</span>
                                                    <span className="font-mono">-{formatPrice(p.discountTotalAmount || 0)}</span>
                                                  </div>
                                                  {p.discountRegAmount !== undefined && p.discountRegAmount > 0 && (
                                                    <div className="flex justify-between text-[10px] text-slate-500 pl-3">
                                                      <span>• Registration Fee Discount:</span>
                                                      <span className="font-mono">-{formatPrice(p.discountRegAmount)}</span>
                                                    </div>
                                                  )}
                                                  {p.discountGalaAmount !== undefined && p.discountGalaAmount > 0 && (
                                                    <div className="flex justify-between text-[10px] text-slate-500 pl-3">
                                                      <span>• Gala Dinner:</span>
                                                      <span className="font-mono">-{formatPrice(p.discountGalaAmount)}</span>
                                                    </div>
                                                  )}
                                                  {p.discountAccompAmount !== undefined && p.discountAccompAmount > 0 && (
                                                    <div className="flex justify-between text-[10px] text-slate-500 pl-3">
                                                      <span>• Accompanying Person:</span>
                                                      <span className="font-mono">-{formatPrice(p.discountAccompAmount)}</span>
                                                    </div>
                                                  )}
                                                  {p.discountTourAmount !== undefined && p.discountTourAmount > 0 && (
                                                    <div className="flex justify-between text-[10px] text-slate-500 pl-3">
                                                      <span>• Technical Tour:</span>
                                                      <span className="font-mono">-{formatPrice(p.discountTourAmount)}</span>
                                                    </div>
                                                  )}
                                                  <div className="border-t border-slate-200 my-1"></div>
                                                </>
                                              )}
                                              <div className="flex justify-between text-sm font-bold text-slate-850">
                                                <span>Total Amount Paid:</span>
                                                <span className="font-mono text-teal-600 text-base">{formatPrice(p.totalAmount)}</span>
                                              </div>
                                              <div className="border-t border-slate-200 pt-3 mt-3 flex justify-end">
                                                <button
                                                  onClick={() => handleDeletePayment(p.id, p.registrationNumber)}
                                                  disabled={deletePaymentMutation.isPending}
                                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-lg text-xs shadow-sm transition"
                                                >
                                                  {deletePaymentMutation.isPending ? 'Deleting...' : 'Delete Payment Record'}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Option Ticket Inventory */}
        {activeTab === 'OPTIONS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Option Ticket Capacities & Inventory</h3>
              <span className="text-xs text-slate-500 font-medium bg-slate-200/60 px-2.5 py-1 rounded-full">
                Tracked options: {options?.filter(o => o.maxCapacity != null).length ?? 0}
              </span>
            </div>

            {loadingOptions && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500"></div>
                <p className="text-xs font-medium text-slate-500">Retrieving option capacities...</p>
              </div>
            )}

            {errorOptions && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center text-red-600 text-xs font-medium">
                Failed to load option capacities. Please check server authorization.
              </div>
            )}

            {options && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="px-4 py-3.5">Program Name</th>
                      <th className="px-4 py-3.5 text-center">Sold Tickets</th>
                      <th className="px-4 py-3.5 text-center">Max Capacity</th>
                      <th className="px-4 py-3.5 text-center">Tickets Remaining</th>
                      <th className="px-4 py-3.5">Change Max Capacity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {options
                      .filter((o) => o.maxCapacity != null)
                      .map((o) => (
                        <OptionInventoryRow
                          key={o.id}
                          option={o}
                          isPending={updateCapacityMutation.isPending}
                          onSave={(id, cap) => {
                            if (window.confirm(`Are you sure you want to change the capacity of this program to ${cap}?`)) {
                              updateCapacityMutation.mutate({ optionId: id, maxCapacity: cap });
                            }
                          }}
                        />
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Discount Codes */}
        {activeTab === 'DISCOUNT_CODES' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Discount Code Management</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Generate unique 8-character codes and assign them to specific registered users.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-medium bg-slate-200/60 px-2.5 py-1 rounded-full">
                Total codes: {discountCodes?.length ?? 0}
              </span>
            </div>

            {/* Create Code Form */}
            <div className="bg-white rounded-xl border border-slate-205 p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500"></span>
                Generate & Assign New Discount Code
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User Search & Selection */}
                <div className="space-y-2 relative">
                  <label className="block text-[10px] font-bold uppercase text-slate-500">
                    Assignee User (Email or Name) <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => {
                      setUserSearchTerm(e.target.value);
                      if (selectedUserEmail && e.target.value !== selectedUserEmail) {
                        setSelectedUserEmail('');
                      }
                    }}
                    placeholder="Search attendee by email or name..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 bg-slate-50/50 focus:bg-white text-slate-800"
                  />
                  {selectedUserEmail && (
                    <p className="text-[10px] text-green-600 font-semibold mt-1">
                      ✓ Selected user: {selectedUserEmail}
                    </p>
                  )}
                  {/* Suggestion list */}
                  {!selectedUserEmail && filteredSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-25 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                      {filteredSuggestions.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserEmail(u.email);
                            setUserSearchTerm(u.email);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition flex justify-between items-center"
                        >
                          <span className="font-semibold text-slate-800">{u.email}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{u.firstName} {u.lastName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional Program checkboxes */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-500">
                    Optional Programs Discounts
                  </label>
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-slate-700">
                      <input
                        type="checkbox"
                        checked={galaFree}
                        onChange={(e) => setGalaFree(e.target.checked)}
                        className="rounded border-slate-305 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-medium">Gala Dinner Free (갈라디너 무료)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-slate-700">
                      <input
                        type="checkbox"
                        checked={accompFree}
                        onChange={(e) => setAccompFree(e.target.checked)}
                        className="rounded border-slate-305 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-medium">Accompanying Person (동반자 1인 무료)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-slate-700">
                      <input
                        type="checkbox"
                        checked={tourFree}
                        onChange={(e) => setTourFree(e.target.checked)}
                        className="rounded border-slate-305 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-medium">Technical Tours Free (기술투어 무료)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Registration Rate select drop downs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    IABSE Member Registration Fee Discount
                  </label>
                  <select
                    value={memberRate}
                    onChange={(e) => setMemberRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 bg-white text-slate-800"
                  >
                    <option value={0}>0% (No discount)</option>
                    <option value={50}>50% Off</option>
                    <option value={100}>100% Off (Free)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Non-IABSE Member Registration Fee Discount
                  </label>
                  <select
                    value={nonMemberRate}
                    onChange={(e) => setNonMemberRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 bg-white text-slate-800"
                  >
                    <option value={0}>0% (No discount)</option>
                    <option value={50}>50% Off</option>
                    <option value={100}>100% Off (Free)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserEmail('');
                    setUserSearchTerm('');
                    setMemberRate(0);
                    setNonMemberRate(0);
                    setGalaFree(false);
                    setAccompFree(false);
                    setTourFree(false);
                  }}
                  className="px-4 py-2 text-xs border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-lg font-semibold transition mr-2"
                >
                  Reset Form
                </button>
                <button
                  type="button"
                  disabled={!selectedUserEmail || createDiscountCodeMutation.isPending}
                  onClick={() => {
                    createDiscountCodeMutation.mutate({
                      userEmail: selectedUserEmail,
                      iabseMemberDiscountRate: memberRate,
                      nonIabseMemberDiscountRate: nonMemberRate,
                      galaDinnerFree: galaFree,
                      accompanyingPersonFree: accompFree,
                      technicalTourFree: tourFree,
                    }, {
                      onSuccess: () => {
                        setSelectedUserEmail('');
                        setUserSearchTerm('');
                        setMemberRate(0);
                        setNonMemberRate(0);
                        setGalaFree(false);
                        setAccompFree(false);
                        setTourFree(false);
                      }
                    });
                  }}
                  className="px-4 py-2 text-xs bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createDiscountCodeMutation.isPending ? 'Generating...' : 'Generate & Assign Code'}
                </button>
              </div>
            </div>

            {/* Codes List Table */}
            {loadingCodes && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500"></div>
                <p className="text-xs font-medium text-slate-500">Loading discount codes...</p>
              </div>
            )}

            {errorCodes && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center text-red-600 text-xs font-medium">
                Failed to load discount codes from database.
              </div>
            )}

            {discountCodes && discountCodes.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400 text-xs font-medium">
                No discount codes created yet.
              </div>
            )}

            {discountCodes && discountCodes.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="px-4 py-3.5">Discount Code</th>
                      <th className="px-4 py-3.5">Assignee User</th>
                      <th className="px-4 py-3.5">Registration Discount</th>
                      <th className="px-4 py-3.5">Option Freebies</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-4 py-3.5 text-center w-[100px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {discountCodes.map((dc) => (
                      <tr key={dc.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 rounded px-2 py-1 select-all">
                            {dc.code}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-750">{dc.userEmail}</td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-1">
                            <p className="text-slate-600 font-semibold">
                              Member: <span className={dc.iabseMemberDiscountRate > 0 ? "text-teal-600 font-extrabold" : "text-slate-400"}>{dc.iabseMemberDiscountRate}%</span>
                            </p>
                            <p className="text-slate-650 font-semibold">
                              Non-Member: <span className={dc.nonIabseMemberDiscountRate > 0 ? "text-teal-600 font-extrabold" : "text-slate-400"}>{dc.nonIabseMemberDiscountRate}%</span>
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-medium">
                          <div className="flex flex-wrap gap-1">
                            {dc.galaDinnerFree && (
                              <span className="bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded text-[10px]">
                                Gala Dinner Free
                              </span>
                            )}
                            {dc.accompanyingPersonFree && (
                              <span className="bg-amber-50 text-amber-700 border border-amber-105 px-1.5 py-0.5 rounded text-[10px]">
                                Accomp. (1 Free)
                              </span>
                            )}
                            {dc.technicalTourFree && (
                              <span className="bg-blue-50 text-blue-700 border border-blue-105 px-1.5 py-0.5 rounded text-[10px]">
                                Tours Free
                              </span>
                            )}
                            {!dc.galaDinnerFree && !dc.accompanyingPersonFree && !dc.technicalTourFree && (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {dc.used ? (
                            <span className="inline-block bg-slate-150 border border-slate-200 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                              USED
                            </span>
                          ) : (
                            <span className="inline-block bg-green-100 border border-green-200 text-green-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                              UNUSED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            disabled={deleteDiscountCodeMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to permanently delete discount code "${dc.code}"?`)) {
                                deleteDiscountCodeMutation.mutate(dc.id);
                              }
                            }}
                            className="px-2 py-1 bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg text-[10px] shadow-sm hover:shadow active:scale-95 transition-all duration-200"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
