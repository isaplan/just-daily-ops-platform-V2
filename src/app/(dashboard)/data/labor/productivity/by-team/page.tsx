import { ProductivityByTeamClient } from './ProductivityByTeamClient';

export const revalidate = 1800;

export default function ProductivityByTeamPage() {
  return (
    <ProductivityByTeamClient
      initialData={{
        locations: [],
      }}
    />
  );
}




