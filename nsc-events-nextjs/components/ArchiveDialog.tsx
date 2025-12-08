import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import { Button, SnackbarContent } from "@mui/material";
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Snackbar from "@mui/material/Snackbar";
import { ActivityDatabase } from "@/models/activityDatabase";

interface ArchiveDialogProps {
  isOpen: boolean;
  event: ActivityDatabase;
  dialogToggle: () => void;
}

const ArchiveDialog = ({ isOpen, event, dialogToggle }: ArchiveDialogProps) => {
  const router = useRouter();
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const toggleArchiveEvent = async (id: string, isArchived: boolean) => {
    const token = localStorage.getItem("token");
    try {
      // IMPORTANT: Must use NEXT_PUBLIC_ prefix for browser-accessible env vars
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const endpoint = isArchived ? 'unarchive' : 'archive';
      const response = await fetch(`${apiUrl}/events/${endpoint}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to ${endpoint} event: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error("error: ", error);
      throw error;
    }
  };
  const queryClient = useQueryClient();
  const { mutate: toggleArchiveMutation } = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      toggleArchiveEvent(id, isArchived),
    onSuccess: async (_data, variables) => {
      const action = variables.isArchived ? "unarchived" : "archived";
      setSnackbarMessage(`Successfully ${action} event.`);
      await queryClient.refetchQueries({ queryKey: ["events", "myEvents", "archivedEvents"] });
      setTimeout(() => {
        router.refresh();
        // Unarchive redirects to my-events, archive redirects to archived-events
        router.push(variables.isArchived ? "/my-events" : "/archived-events");
      }, 1200);
    },
    onError: (error: Error, variables) => {
      const action = variables.isArchived ? "unarchive" : "archive";
      setSnackbarMessage(`Failed to ${action} event.`);
      console.error(`Failed to ${action} event: `, error);
    },
  });

  const handleClick = () => {
    dialogToggle();
  };

  return (
    <>
      <Dialog open={isOpen}>
        <DialogTitle>{!event.isArchived ? "Archive Event?" : "Unarchive Event?"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to {!event.isArchived ? "archive" : "unarchive"} this event?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              handleClick();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              toggleArchiveMutation({ id: event.id, isArchived: event.isArchived ?? false });
              handleClick();
            }}
            autoFocus
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(snackbarMessage)}
        onClose={() => {
          setSnackbarMessage("");
        }}
        autoHideDuration={1200}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <SnackbarContent message={snackbarMessage} sx={{ backgroundColor: "white", color: "black" }} />
      </Snackbar>
    </>
  );
};

export default ArchiveDialog;
