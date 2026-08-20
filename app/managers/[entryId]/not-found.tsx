import { PageHeader } from "@/components/league/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ManagerNotFound() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Manager" title="Not found" />
      <Card>
        <CardHeader>
          <CardTitle>No manager with that ID</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Check the link, or go back to the managers list.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
