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
              placeholder="Write an note about this order (e.g., 'Customer confirmed pickup time change via phone')…"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
              className="resize-none rounded-xl pb-16 focus-visible:ring-primary"
              disabled={isPending}
            />
            <Button
              onClick={handleAddNote}
              disabled={!noteContent.trim() || isPending}
              className="absolute bottom-2 right-2 h-11 w-11 rounded-xl p-0 sm:h-10 sm:w-10"
              aria-label="Add note"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Send className="h-4 w-4 shrink-0" />
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
            <div className="space-y-3 max-h-[400px] overflow-y-auto overscroll-contain pr-2 custom-scrollbar">
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
                        className="min-h-[80px] resize-y rounded-xl text-sm"
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="ghost"
                          onClick={handleCancelEdit}
                          disabled={isPending}
                          className="h-11 rounded-xl sm:h-10"
                        >
                          <X className="mr-1 h-4 w-4 shrink-0" /> Cancel
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={isPending}
                          className="h-11 rounded-xl sm:h-10"
                        >
                          {isPending ? (
                            <Loader2 className="mr-1 h-4 w-4 shrink-0 animate-spin" />
                          ) : (
                            <Check className="mr-1 h-4 w-4 shrink-0" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* View Mode */}
                      <div className="mb-2 flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          className="h-11 w-11 rounded-xl p-0 text-muted-foreground hover:text-primary sm:h-10 sm:w-10"
                          onClick={() => handleStartEdit(note.id, note.content)}
                          aria-label="Edit note"
                        >
                          <Pencil className="h-4 w-4 shrink-0" />
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-11 w-11 rounded-xl p-0 text-muted-foreground hover:text-red-500 sm:h-10 sm:w-10"
                          onClick={() => handleDeleteNote(note.id)}
                          aria-label="Delete note"
                        >
                          <Trash2 className="h-4 w-4 shrink-0" />
                        </Button>
                      </div>

                      <p className="min-w-0 break-words text-sm leading-relaxed text-foreground whitespace-pre-wrap">
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
