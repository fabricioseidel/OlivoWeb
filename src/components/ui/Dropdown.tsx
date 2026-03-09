"use client";
import { Fragment, ReactNode } from "react";
import { Menu, Transition } from "@headlessui/react";
import Link from "next/link";

export interface DropdownItem {
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  isDanger?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
  triggerClassName?: string;
}

const Dropdown = ({
  trigger,
  items,
  align = "right",
  className = "",
  triggerClassName = "",
}: DropdownProps) => {
  return (
    <Menu as="div" className={`relative inline-block text-left ${className}`}>
      {({ open }) => (
        <>
          <Menu.Button className={triggerClassName}>
            {trigger}
          </Menu.Button>
          <Transition
            as={Fragment}
            show={open}
            enter="transition ease-out duration-200"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items
              className={`absolute ${align === "right" ? "right-0" : "left-0"} mt-2 w-56 rounded-lg shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50`}
            >
              {items.map((item, idx) => (
                <Menu.Item key={idx}>
                  {({ active }) => {
                    if (item.href) {
                      return (
                        <Link
                          href={item.href}
                          className={`${
                            active
                              ? `${item.isDanger ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`
                              : `${item.isDanger ? "text-red-600" : "text-gray-700"}`
                          } block w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                            item.className || ""
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    }
                    return (
                      <button
                        onClick={() => {
                          item.onClick?.();
                        }}
                        className={`${
                          active
                            ? `${item.isDanger ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`
                            : `${item.isDanger ? "text-red-600" : "text-gray-700"}`
                        } block w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                          item.className || ""
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  }}
                </Menu.Item>
              ))}
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};

export default Dropdown;
