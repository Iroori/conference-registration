import { SectionLabel } from './Shared';

interface StepInvitationLetterProps {
  needsLetter: boolean | null;
  onSelect: (needs: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepInvitationLetter = ({
  needsLetter,
  onSelect,
  onNext,
  onBack,
}: StepInvitationLetterProps) => (
  <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
    {/* Left */}
    <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
      <SectionLabel>Invitation Letter</SectionLabel>

      <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
        <div className="flex gap-3">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <div className="text-xs text-blue-700 leading-relaxed">
            <p className="font-semibold mb-1">Letter of Invitation</p>
            <p className="mb-2">
              Invitation Letter for Visa Application: If you require an official Letter of Invitation to apply for a visa to enter the Republic of Korea, please indicate this during the registration process.
            </p>
            <p className="font-medium mb-1">Please note that:</p>
            <ul className="list-disc ml-4 space-y-0.5">
              <li>The letter will only be issued to <strong>fully registered and paid</strong> delegates.</li>
              <li>The letter of invitation does not guarantee the granting of a visa.</li>
              <li>Participants are responsible for their own visa application process and costs.</li>
            </ul>
          </div>
        </div>
      </div>

      <p className="text-sm font-medium text-slate-700 mb-4">
        Do you require an official invitation letter for visa or travel purposes?
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Yes */}
        <button
          onClick={() => onSelect(true)}
          className={`rounded-xl border p-5 text-left transition ${needsLetter === true
            ? 'border-teal-400 bg-teal-50 ring-1 ring-teal-200'
            : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${needsLetter === true ? 'bg-teal-100' : 'bg-slate-100'
                }`}
            >
              <svg
                className={`h-4 w-4 ${needsLetter === true ? 'text-teal-600' : 'text-slate-400'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
              </svg>
            </div>
            <p className={`text-sm font-semibold ${needsLetter === true ? 'text-teal-700' : 'text-slate-700'}`}>
              Yes, I need an invitation letter
            </p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            An official invitation letter will be issued and sent to your registered email address
            after payment is confirmed.
          </p>
          <p className="text-xs font-semibold text-teal-600 mt-2">Free of charge</p>
        </button>

        {/* No */}
        <button
          onClick={() => onSelect(false)}
          className={`rounded-xl border p-5 text-left transition ${needsLetter === false
            ? 'border-slate-400 bg-slate-50 ring-1 ring-slate-200'
            : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${needsLetter === false ? 'bg-slate-200' : 'bg-slate-100'
                }`}
            >
              <svg
                className="h-4 w-4 text-slate-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className={`text-sm font-semibold ${needsLetter === false ? 'text-slate-700' : 'text-slate-700'}`}>
              No, I do not need one
            </p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            I do not need an invitation letter for visa or travel purposes.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            You can request one later if needed.
          </p>
        </button>
      </div>

      {/* Accommodation Information */}
      <div className="mt-8 mb-4">
        <SectionLabel>Accommodation</SectionLabel>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-800 mb-2">Accommodation Information</p>
        <p className="text-sm text-slate-600 mb-3 leading-relaxed">
          For the convenience of IABSE Congress Incheon 2026 participants, we are pleased to provide information on accommodation options near the venue. Detailed information regarding hotels and rates can be found at the link below:
        </p>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-teal-500 font-bold">•</span>
          <span className="font-semibold text-slate-700">Link:</span>
          <a href="https://iabse2026.mice.link/" target="_blank" rel="noreferrer" className="text-teal-600 hover:text-teal-800 font-medium break-all">
            https://iabse2026.mice.link/
          </a>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Please note that this information is provided for your reference only. Booking through this link is <strong>entirely optional</strong>, and participants are free to arrange their own accommodations according to their preferences.
        </p>
      </div>
    </div>

    {/* Right sidebar */}
    <div className="bg-teal-50/40 p-6 flex flex-col">
      <SectionLabel>Selection Summary</SectionLabel>

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        {needsLetter === null ? (
          <p className="text-xs text-slate-400">Please select an option above.</p>
        ) : needsLetter ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg className="h-4 w-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <p className="text-sm font-semibold text-teal-700">Invitation Letter Requested</p>
            </div>
            <p className="text-xs text-slate-400">
              Will be sent to your email within 5 business days of payment confirmation.
            </p>
            <p className="text-sm font-bold text-teal-600 mt-2">Free</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-sm text-slate-500">No invitation letter needed</p>
          </div>
        )}
      </div>

      <div className="mt-auto space-y-2">
        <button
          onClick={onNext}
          disabled={needsLetter === null}
          className="btn-primary"
        >
          Continue to Summary
        </button>
        <button
          onClick={onBack}
          className="w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-500 transition hover:bg-slate-50"
        >
          Back
        </button>
      </div>
    </div>
  </div >
);
