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

      <div className="grid grid-cols-2 gap-3">
        {/* Yes */}
        <button
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
              <p className="text-sm font-semibold text-gold">Invitation Letter Requested</p>
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
          onClick={onNext}
          disabled={needsLetter === null}
          className="btn-primary"
        >
          Continue
        </button>
        <button
          onClick={onBack}
          className="w-full rounded-lg border border-slate-200 py-2 text-sm text-ink-muted transition hover:bg-slate-50"
        >
          Back
        </button>
      </div>
    </div>
  </div >
);
