import { SectionLabel } from './Shared';

interface StepAdditionalInfoProps {
  onNext: () => void;
  onBack: () => void;
}

export const StepAdditionalInfo = ({
  onNext,
  onBack,
}: StepAdditionalInfoProps) => (
  <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_300px]">
    {/* Left */}
    <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r space-y-6">
      <SectionLabel>Accommodation</SectionLabel>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <p className="text-base font-bold text-navy">Accommodation Information</p>
        <p className="text-sm text-ink-muted leading-relaxed">
          For the convenience of IABSE Congress Incheon 2026 participants, we are pleased to provide information on accommodation options near the venue. Detailed information regarding hotels and rates can be found at the link below:
        </p>
        
        <div className="rounded-xl bg-gold-tint border border-gold-soft/50 p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-gold font-bold text-base">•</span>
            <span className="font-semibold text-sm text-ink">Official Reservation Link:</span>
          </div>
          <a
            href="https://iabse2026.mice.link/"
            target="_blank"
            rel="noreferrer"
            className="text-gold hover:text-gold-hover font-bold text-sm break-all underline pl-3"
          >
            https://iabse2026.mice.link/
          </a>
        </div>

        <p className="text-xs text-ink-faint leading-relaxed pt-2">
          Please note that this information is provided for your reference only. Booking through this link is <strong className="text-ink-muted">entirely optional</strong>, and participants are free to arrange their own accommodations according to their preferences.
        </p>
      </div>
    </div>

    {/* Right sidebar */}
    <div className="bg-gold-tint p-6 flex flex-col">
      <SectionLabel>Selection Summary</SectionLabel>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold text-ink-muted mb-1">Accommodation Status</p>
        <p className="text-xs text-ink-faint leading-relaxed">
          Accommodation is managed independently via the official Mice Link system.
        </p>
      </div>

      <div className="mt-auto space-y-2">
        <button
          onClick={onNext}
          className="btn-primary"
        >
          Continue to Summary
        </button>
        <button
          onClick={onBack}
          className="w-full rounded-lg border border-slate-200 py-2 text-sm text-ink-muted transition hover:bg-slate-50"
        >
          Back
        </button>
      </div>
    </div>
  </div>
);
