import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "./ui/alert-dialog";
import { useEntryStore } from "../stores/entryStore";

interface DeleteEntryDialogProps {
  entryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteEntryDialog({
  entryId,
  open,
  onOpenChange,
}: DeleteEntryDialogProps) {
  const handleConfirm = async () => {
    await useEntryStore.getState().deleteEntry(entryId);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This entry will be permanently deleted. You can't undo this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={handleConfirm}
          >
            Delete Entry
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
