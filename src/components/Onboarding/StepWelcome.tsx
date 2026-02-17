'use client';

/**
 * StepWelcome — First onboarding step. Introduces Flipper AI.
 * Author: ASPEN
 * Company: Axovia AI
 */

export default function StepWelcome({ name }: { name?: string }) {
  return (
    <div className="text-center space-y-6">
      <div className="text-6xl" role="img" aria-label="Flipper penguin">
        🐧
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Welcome{name ? `, ${name}` : ''}!
        </h2>
        <p className="text-gray-600">
          Flipper AI helps you find underpriced items across multiple marketplaces and flip them for
          profit. Let&apos;s get you set up in under 2 minutes.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-4 bg-blue-50 rounded-xl">
          <div className="text-2xl mb-1">🔍</div>
          <p className="text-xs font-medium text-gray-700">Scan marketplaces</p>
        </div>
        <div className="p-4 bg-green-50 rounded-xl">
          <div className="text-2xl mb-1">💡</div>
          <p className="text-xs font-medium text-gray-700">AI-powered insights</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-xl">
          <div className="text-2xl mb-1">💰</div>
          <p className="text-xs font-medium text-gray-700">Track profits</p>
        </div>
      </div>
    </div>
  );
}
