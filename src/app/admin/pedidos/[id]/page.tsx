import OrderDetailClient from '@/components/admin/OrderDetailClient';
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <OrderDetailClient params={resolvedParams} />;
}
