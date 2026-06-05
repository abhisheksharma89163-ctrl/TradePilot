import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  title,
  phase,
  note,
}: {
  title: string;
  phase: string;
  note?: string;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Construction className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">{title} module — scheduled for {phase}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {note ??
              "The database schema and RLS for this module are already migrated. The UI follows the same pattern as the Parties and Products modules."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
