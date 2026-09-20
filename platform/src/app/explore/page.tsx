import { ExploreMarketplaceNav } from "./ExploreMarketplaceNav";
import { ExploreDirectory } from "./ExploreDirectory";

export default function ExplorePage() {
  return (
    <main className="explore-luxe explore-luxe--directory min-h-screen">
      <ExploreMarketplaceNav current="explore" />
      <ExploreDirectory />
    </main>
  );
}
