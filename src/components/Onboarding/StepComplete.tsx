'use client';

/**
 * StepComplete — Success screen at end of onboarding.
 * Author: ASPEN
 * Company: Axovia AI
 */

import Link from 'next/link';

interface Props {
  onGoToDashboard: () => void;
}

export default function StepComplete({ onGoToDashboard }: Props) {
  return (
    <div className="text-center space-y-6">
      <div className="text-6xl animate-bounce" role="img" aria-label="Party popper">
        🎉
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">You&apos;re all set!</h2>
        <p className="text-gray-600">
          Flipper AI is configured and ready to find deals for you. Head to your dashboard to run
          your first scan.
        </p>
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onGoToDashboard}
          className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard →
        </button>
        <Link
          href="/settings"
          className="block text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Adjust settings later
        </Link>
      </div>
    </div>
  );
}
