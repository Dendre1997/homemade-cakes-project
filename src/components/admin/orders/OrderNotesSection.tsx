"use client";

import { useState, useTransition } from "react";
import { Order } from "@/types";
import {
  addOrderNote,
  deleteOrderNote,
  updateOrderNote,
} from "@/app/actions/order-notes";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { format } from "date-fns";
import {
  Loader2,
  StickyNote,
  Send,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { useAlert } from "@/contexts/AlertContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";

interface OrderNotesSectionProps {
  order: Order;
  onUpdate?: () => void;
}

export const OrderNotesSection = ({
  order,
  onUpdate,
}: OrderNotesSectionProps) => {
  const [noteContent, setNoteContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showAlert } = useAlert();
  const showConfirmation = useConfirmation();

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");

  const handleAddNote = () => {
    if (!noteContent.trim()) return;

    startTransition(async () => {
      const result = await addOrderNote(order._id, noteContent);
      if (result.success) {
        setNoteContent("");
        showAlert("Note added successfully", "success");
        if (onUpdate) onUpdate();
      } else {
        showAlert(result.error || "Failed to add note", "error");
      }
    });
  };

  const handleDeleteNote = async (noteId: string) => {
    const confirmed = await showConfirmation({
      title: "Delete Note",
      body: "Are you sure you want to delete this note? This action cannot be undone.",
      variant: "danger",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteOrderNote(order._id, noteId);
      if (result.success) {
        showAlert("Note deleted successfully", "success");
        if (onUpdate) onUpdate();
      } else {
        showAlert(result.error || "Failed to delete note", "error");
      }
    });
  };

  const handleStartEdit = (noteId: string, currentContent: string) => {
    setEditingNoteId(noteId);
    setEditedContent(currentContent);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditedContent("");
  };

  const handleSaveEdit = async (noteId: string) => {
    if (editedContent.trim() === "") return;

    startTransition(async () => {
      const result = await updateOrderNote(order._id, noteId, editedContent);
      if (result.success) {
        showAlert("Note updated successfully", "success");
        setEditingNoteId(null);
        setEditedContent("");
        if (onUpdate) onUpdate();
      } else {
        showAlert(result.error || "Failed to update note", "error");
      }
    });
  };

  // Sort notes: Newest first
  const sortedNotes = [...(order.notesLog || [])].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <StickyNote className="w-5 h-5 text-primary" />
          Backer Notes
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-6 p-6">
        {/* Input Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">
            Add new note
          </label>
          <div className="relative">
            <Textarea
              placeholder="Write an note about this order (e.g., 'Customer confirmed pickup time change via phone')..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
              className="resize-none pr-12 focus-visible:ring-primary"
              disabled={isPending}
            />
            <Button
              onClick={handleAddNote}
              disabled={!noteContent.trim() || isPending}
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8 rounded-full"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* History Log */}
        <div className="flex-1 space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Notes
          </h4>

          {!sortedNotes || sortedNotes.length === 0 ? (
            <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg bg-muted/10 text-muted-foreground text-sm">
              No notes added yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {sortedNotes.map((note) => (
                <div
                  key={note.id}
                  className="relative group bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Edit Mode */}
                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="min-h-[80px] text-sm resize-y"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          disabled={isPending}
                        >
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Check className="w-3 h-3 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* View Mode */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          onClick={() => handleStartEdit(note.id, note.content)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-red-500"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pr-6">
                        {note.content}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t pt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {format(
                            new Date(note.createdAt),
                            "MMM d, yyyy 'at' h:mm a"
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
