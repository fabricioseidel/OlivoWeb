import OrderDetailClient from '@/components/admin/OrderDetailClient';

export default function Page(props: any) {
  // Server wrapper: render a client component that reads from localStorage
  return <OrderDetailClient params={props.params} />;
}
