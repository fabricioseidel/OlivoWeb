import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

interface CheckoutStepsProps {
  currentStep: number;
}

const STEPS = [
  { n: 1, label: 'Envío' },
  { n: 2, label: 'Pago' },
];

/**
 * Indicador de paso del checkout.
 *
 * El activo marcaba el texto en azul y el círculo en verde, dos colores de
 * marca distintos en el mismo elemento. Aquí el estado se comunica solo con
 * el verde de marca y el gris neutro.
 */
export default function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  return (
    <nav aria-label="Progreso del checkout" className="mb-8">
      <ol className="mx-auto flex max-w-sm items-center">
        {STEPS.map((step, i) => {
          const done = currentStep > step.n;
          const active = currentStep >= step.n;
          return (
            <React.Fragment key={step.n}>
              <li className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-brand-600 text-white'
                      : 'border border-neutral-300 bg-white text-neutral-400'
                  }`}
                >
                  {done ? <CheckIcon className="size-4 stroke-[2.5]" /> : step.n}
                </span>
                <span
                  className={`text-sm font-medium ${active ? 'text-neutral-900' : 'text-neutral-400'}`}
                  aria-current={currentStep === step.n ? 'step' : undefined}
                >
                  {step.label}
                </span>
              </li>
              {i < STEPS.length - 1 && (
                <li aria-hidden="true" className="mx-3 h-px flex-1">
                  <div
                    className={`h-full w-full ${
                      currentStep > step.n ? 'bg-brand-600' : 'bg-neutral-200'
                    }`}
                  />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
