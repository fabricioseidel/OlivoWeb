import DashboardShell from "@/components/layout/DashboardShell";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard | Tecno Olivo",
    description: "Panel de administración - Tecno Olivo",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardShell title="Panel de Control">{children}</DashboardShell>;
}
