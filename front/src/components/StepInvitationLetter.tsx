import { useState, useEffect } from 'react';
import { SectionLabel } from './Shared';

interface StepInvitationLetterProps {
  needsLetter: boolean | null;
  onSelect: (needs: boolean) => void;
  passportFirstName: string;
  onPassportFirstNameChange: (val: string) => void;
  passportLastName: string;
  onPassportLastNameChange: (val: string) => void;
  passportNumber: string;
  onPassportNumberChange: (val: string) => void;
  birthDate: string;
  onBirthDateChange: (val: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepInvitationLetter = ({
  needsLetter,
  onSelect,
  passportFirstName,
  onPassportFirstNameChange,
  passportLastName,
  onPassportLastNameChange,
  passportNumber,
  onPassportNumberChange,
  birthDate,
  onBirthDateChange,
  onNext,
  onBack,
}: StepInvitationLetterProps) => {
  const [localYear, setLocalYear] = useState('');
  const [localMonth, setLocalMonth] = useState('');
  const [localDay, setLocalDay] = useState('');

  useEffect(() => {
    if (birthDate) {
      const parts = birthDate.split('-');
      setLocalYear(parts[0] || '');
      setLocalMonth(parts[1] || '');
      setLocalDay(parts[2] || '');
    } else {
      setLocalYear('');
      setLocalMonth('');
      setLocalDay('');
    }
  }, [birthDate]);

  const handleYearChange = (val: string) => {
    setLocalYear(val);
    if (val && localMonth && localDay) {
      onBirthDateChange(`${val}-${localMonth.padStart(2, '0')}-${localDay.padStart(2, '0')}`);
    } else {
      onBirthDateChange('');
    }
  };

  const handleMonthChange = (val: string) => {
    setLocalMonth(val);
    if (localYear && val && localDay) {
      onBirthDateChange(`${localYear}-${val.padStart(2, '0')}-${localDay.padStart(2, '0')}`);
    } else {
      onBirthDateChange('');
    }
  };

  const handleDayChange = (val: string) => {
    setLocalDay(val);
    if (localYear && localMonth && val) {
      onBirthDateChange(`${localYear}-${localMonth.padStart(2, '0')}-${val.padStart(2, '0')}`);
    } else {
      onBirthDateChange('');
    }
  };

  // Check if all fields are filled when needsLetter is true
  const isValid =
    needsLetter === false ||
    (needsLetter === true &&
      passportFirstName.trim() !== '' &&
      passportLastName.trim() !== '' &&
      passportNumber.trim() !== '' &&
      birthDate.trim() !== '');

  return (
    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
      {/* Left */}
      <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
        <SectionLabel>Invitation Letter</SectionLabel>

        <div className="mb-6 rounded-lg border border-navy/10 bg-navy/5 p-4">
          <div className="flex gap-3">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div className="text-xs text-ink leading-relaxed">
              <p className="font-semibold mb-1 text-navy">Letter of Invitation</p>
              <p className="mb-2 text-ink-muted">
                Invitation Letter for Visa Application: If you require an official Letter of Invitation to apply for a visa to enter the Republic of Korea, please indicate this during the registration process.
              </p>
              <p className="font-medium mb-1 text-navy">Please note that:</p>
              <ul className="list-disc ml-4 space-y-0.5 text-ink-muted">
                <li>The letter will only be issued to <strong className="text-ink">fully registered and paid</strong> delegates.</li>
                <li>The letter of invitation does not guarantee the granting of a visa.</li>
                <li>Participants are responsible for their own visa application process and costs.</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="text-sm font-medium text-ink mb-4">
          Do you require an official invitation letter for visa or travel purposes?
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Yes */}
          <button
            type="button"
            onClick={() => onSelect(true)}
            className={`rounded-xl border p-5 text-left transition ${needsLetter === true
              ? 'border-navy bg-navy/5 text-navy ring-1 ring-navy'
              : 'border-slate-200 bg-white hover:border-navy/30'
              }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${needsLetter === true ? 'bg-navy/10' : 'bg-slate-100'
                  }`}
              >
                <svg
                  className={`h-4 w-4 ${needsLetter === true ? 'text-navy' : 'text-ink-faint'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
                </svg>
              </div>
              <p className={`text-sm ${needsLetter === true ? 'text-navy font-bold' : 'text-ink font-semibold'}`}>
                Yes, I need an invitation letter.
              </p>
            </div>
          </button>

          {/* No */}
          <button
            type="button"
            onClick={() => onSelect(false)}
            className={`rounded-xl border p-5 text-left transition ${needsLetter === false
              ? 'border-navy bg-navy/5 text-navy ring-1 ring-navy'
              : 'border-slate-200 bg-white hover:border-navy/30'
              }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${needsLetter === false ? 'bg-navy/10' : 'bg-slate-100'
                  }`}
              >
                <svg
                  className={`h-4 w-4 ${needsLetter === false ? 'text-navy' : 'text-ink-faint'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className={`text-sm ${needsLetter === false ? 'text-navy font-bold' : 'text-ink font-semibold'}`}>
                No, I do not need one.
              </p>
            </div>
          </button>
        </div>

        {/* Toggle passport input section */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${needsLetter === true
            ? 'max-h-[500px] opacity-100 border-t border-slate-100 pt-6 mt-4'
            : 'max-h-0 opacity-0 pointer-events-none'
            }`}
        >
          <div className="p-5 rounded-2xl border border-slate-150 bg-slate-50/50 space-y-4">
            <div className="flex items-start gap-2.5 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
              <svg className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs font-semibold text-slate-800 leading-normal">
                Please ensure all information is entered exactly as it appears on your passport.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Passport First Name <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={passportFirstName}
                  onChange={(e) => onPassportFirstNameChange(e.target.value)}
                  className="input-base"
                  placeholder="Enter your first name (e.g. Gildong)"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Passport Last Name <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={passportLastName}
                  onChange={(e) => onPassportLastNameChange(e.target.value)}
                  className="input-base"
                  placeholder="Enter your last name (e.g. Hong)"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Passport Number <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={passportNumber}
                onChange={(e) => onPassportNumberChange(e.target.value)}
                className="input-base"
                placeholder="Enter your passport number"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Date of Birth <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="flex gap-2">
                {/* Year Select */}
                <select
                  value={localYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="input-base py-1.5 text-xs text-slate-800 w-28 flex-1 min-w-[80px]"
                  required
                >
                  <option value="">Year</option>
                  {Array.from({ length: 2026 - 1920 + 1 }, (_, i) => 2026 - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                {/* Month Select */}
                <select
                  value={localMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="input-base py-1.5 text-xs text-slate-800 w-36 flex-[1.5] min-w-[110px]"
                  required
                >
                  <option value="">Month</option>
                  {[
                    '01 - January',
                    '02 - February',
                    '03 - March',
                    '04 - April',
                    '05 - May',
                    '06 - June',
                    '07 - July',
                    '08 - August',
                    '09 - September',
                    '10 - October',
                    '11 - November',
                    '12 - December'
                  ].map((mStr) => {
                    const val = mStr.substring(0, 2);
                    return (
                      <option key={val} value={val}>
                        {mStr}
                      </option>
                    );
                  })}
                </select>

                {/* Day Select */}
                <select
                  value={localDay}
                  onChange={(e) => handleDayChange(e.target.value)}
                  className="input-base py-1.5 text-xs text-slate-800 w-24 flex-1 min-w-[70px]"
                  required
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
                    <option key={d} value={d}>{parseInt(d)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="bg-gold-tint p-6 flex flex-col">
        <SectionLabel>Selection Summary</SectionLabel>

        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          {needsLetter === null ? (
            <p className="text-xs text-ink-faint">Please select an option above.</p>
          ) : needsLetter ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-4 w-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <p className="text-sm font-semibold text-ink">Invitation Letter Requested</p>
              </div>
              <p className="text-xs text-ink-faint">
                Will be sent to your email within 5 business days of payment confirmation.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <p className="text-sm text-ink-muted">No invitation letter needed</p>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-2">
          <button
            type="button"
            onClick={onNext}
            disabled={needsLetter === null || !isValid}
            className="btn-primary"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-lg border border-slate-200 py-2 text-sm text-ink-muted transition hover:bg-slate-50"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};
