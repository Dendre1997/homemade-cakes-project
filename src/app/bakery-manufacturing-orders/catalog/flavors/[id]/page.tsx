import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: {
    id: string;
  };
}

export default function EditFlavorPage({ params }: Props) {
  const isNew = params.id === "new";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/bakery-manufacturing-orders/catalog?tab=flavors">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isNew ? "Create Flavor" : "Edit Flavor"}
          </h1>
          <p className="text-muted-foreground">
            {isNew
              ? "Add a new flavor to your catalog"
              : "Update flavor details and availability"}
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
         <p>Flavor editing is under construction.</p>
      </div>
    </div>
  );
}
