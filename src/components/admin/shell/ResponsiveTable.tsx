"use client";

import React, { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  hideOnMobile?: boolean;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  renderMobileCard?: (row: T, index: number) => ReactNode;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  stickyHeader?: boolean;
};

export default function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  renderMobileCard,
  emptyState,
  onRowClick,
  className = "",
  stickyHeader = false,
}: Props<T>) {
  if (rows.length === 0 && emptyState) {
    return <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-8">{emptyState}</div>;
  }

  return (
    <div className={className}>
      {/* Desktop / tablet table */}
      <div className="hidden md:block rounded-2xl bg-white ring-1 ring-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead
              className={`bg-gray-50 ${stickyHeader ? "sticky top-0 z-10" : ""}`}
            >
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, idx) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={
                    onRowClick
                      ? "cursor-pointer hover:bg-emerald-50/40 transition-colors"
                      : ""
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-gray-700 ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      }`}
                    >
                      {col.cell(row, idx)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {rows.map((row, idx) =>
          renderMobileCard ? (
            <React.Fragment key={rowKey(row)}>
              {renderMobileCard(row, idx)}
            </React.Fragment>
          ) : (
            <div
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`rounded-2xl bg-white ring-1 ring-gray-200 p-3 ${
                onRowClick ? "active:scale-[0.99] transition-transform" : ""
              }`}
            >
              <dl className="space-y-1.5">
                {columns
                  .filter((c) => !c.hideOnMobile)
                  .map((col) => (
                    <div
                      key={col.key}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">
                        {col.header}
                      </dt>
                      <dd className="text-gray-800 text-right min-w-0 truncate">
                        {col.cell(row, idx)}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          )
        )}
      </div>
    </div>
  );
}
