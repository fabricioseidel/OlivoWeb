import React from 'react';

interface CheckoutStepsProps {
  currentStep: number;
}

export default function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-center max-w-md mx-auto">
        <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'} relative`}>
          <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 font-semibold ${currentStep >= 1 ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 bg-white'}`}>
            {currentStep > 1 ? '✓' : '1'}
          </div>
          <div className="ml-3 font-medium hidden sm:block">Envío</div>
        </div>
        <div className={`flex-1 h-1 mx-4 rounded ${currentStep >= 2 ? "bg-emerald-600" : "bg-gray-200"}`}></div>
        <div className={`flex items-center relative ${currentStep >= 2 ? "text-blue-600" : "text-gray-400"}`}>
          <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 font-semibold ${currentStep >= 2 ? "border-emerald-600 bg-emerald-600 text-white" : "border-gray-300 bg-white"}`}>
            2
          </div>
          <div className="ml-3 font-medium hidden sm:block">Pago</div>
        </div>
      </div>
    </div>
  );
}
