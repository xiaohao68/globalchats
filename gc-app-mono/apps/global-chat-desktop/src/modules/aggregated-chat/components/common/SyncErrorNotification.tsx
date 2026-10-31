import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@gc/ui/components/alert";
import { Button } from "@gc/ui/components/button";
import { useSyncStore } from "../../store/syncStore";

export function SyncErrorNotification() {
  const { error, poll, resetError } = useSyncStore();

  if (!error) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>同步失败</AlertTitle>
      <AlertDescription>
        <div className="mt-1">{error}</div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={poll}>
            重试
          </Button>
          <Button size="sm" variant="outline" onClick={resetError}>
            重置
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
