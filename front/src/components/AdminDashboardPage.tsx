import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetAdminUsers,
  apiUpdateUserMemberType,
  apiGetAdminIasbseMembers,
  apiGetAdminPayments,
  apiGetAdminOptions,
  apiUpdateOptionCapacity,
  apiDeleteUser,
} from '../lib/api';
import type { MemberType } from '../types';

type SubTab = 'USERS' | 'IABSE' | 'PAYMENTS' | 'OPTIONS';

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
  
  const toggleExpandPayment = (id: number) => {
    setExpandedPaymentId((prev) => (prev === id ? null : id));
  };

  const queryClient = useQueryClient();

  // Queries
  const {
    data: users,
    isLoading: loadingUsers,
    isError: errorUsers,
  } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: apiGetAdminUsers,
    enabled: activeTab === 'USERS',
  });

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
    enabled: activeTab === 'PAYMENTS',
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

  const {
    data: options,
    isLoading: loadingOptions,
    isError: errorOptions,
  } = useQuery({
    queryKey: ['adminOptions'],
    queryFn: apiGetAdminOptions,
    enabled: activeTab === 'OPTIONS',
  });

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
      'Net Amount (KRW)',
      'VAT (KRW)',
      'Gross Total (KRW)',
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
        p.subtotal || 0,
        p.tax || 0,
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
        <div className="flex bg-slate-900/50 p-0.5 rounded-xl border border-slate-700/50">
          {(['USERS', 'IABSE', 'PAYMENTS', 'OPTIONS'] as SubTab[]).map((tab) => (
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
                : 'Ticket Inventory'}
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
                Total count: {users?.length ?? 0}
              </span>
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
              </div>
            </div>

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
                      <th className="px-4 py-3.5">First Name</th>
                      <th className="px-4 py-3.5">Last Name</th>
                      <th className="px-4 py-3.5">Company / Affiliation</th>
                      <th className="px-4 py-3.5">Membership Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {iasbseMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3.5 font-semibold text-slate-800">{m.firstName}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800">{m.lastName}</td>
                        <td className="px-4 py-3.5 font-medium text-slate-600">{m.company}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            m.status.toLowerCase() === 'active'
                              ? 'bg-teal-100 border border-teal-200 text-teal-800'
                              : 'bg-slate-200 border border-slate-300 text-slate-600'
                          }`}>
                            {m.status}
                          </span>
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
                      <th className="px-4 py-3.5 text-right">Net Amount</th>
                      <th className="px-4 py-3.5 text-right">VAT (10%)</th>
                      <th className="px-4 py-3.5 text-right font-bold text-slate-800">Gross Total</th>
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
                          <td colSpan={10} className="p-0">
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
                                    <div className="text-[10px] text-slate-600 font-medium truncate max-w-[150px]">
                                      {p.affiliation}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-medium text-slate-500">
                                    {formatPrice(p.subtotal)}
                                  </td>
                                  <td className="px-4 py-3.5 text-right font-medium text-slate-500">
                                    {formatPrice(p.tax)}
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
                                    <td colSpan={10} className="px-6 py-4">
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
                                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tax &amp; Price Breakdown</h5>
                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
                                              <div className="flex justify-between text-xs text-slate-650 font-medium">
                                                <span>Supply Net Value (Subtotal):</span>
                                                <span className="font-mono text-slate-800 font-semibold">{formatPrice(p.subtotal)}</span>
                                              </div>
                                              <div className="flex justify-between text-xs text-slate-650 font-medium">
                                                <span>VAT (10% Tax):</span>
                                                <span className="font-mono text-slate-800 font-semibold">{formatPrice(p.tax)}</span>
                                              </div>
                                              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-850">
                                                <span>Gross Total Amount:</span>
                                                <span className="font-mono text-teal-600 text-base">{formatPrice(p.totalAmount)}</span>
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
      </div>
    </div>
  );
};
