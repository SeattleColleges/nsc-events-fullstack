import React, { useEffect, useState } from "react";
import { ActivityDatabase } from "@/models/activityDatabase";
import Dialog from "@mui/material/Dialog";
// NOTE: We specify the generic type for the pickers to resolve type errors
import { DatePicker, LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { Box, Button, Stack, Typography } from "@mui/material";
import TextField from "@mui/material/TextField";
import { textFieldStyle } from "@/components/InputFields";
import TagSelector from "@/components/TagSelector";
import { useEditForm } from "@/hooks/useEditForm";
import { format, isSameDay, isSameHour, isSameMinute } from "date-fns";
import { EventTags } from "@/utility/tags";

interface EditDialogProps {
    isOpen: boolean,
    event: ActivityDatabase
    toggleEditDialog: () => void;
}

const EditDialog = ({ isOpen, event, toggleEditDialog }: EditDialogProps) => {
    const {
        handleDateChange,
        onStartTimeChange,
        onEndTimeChange,
        eventData,
        handleInputChange,
        handleSocialMediaChange,
        handleTagClick,
        handleSubmit,
        errors,
        selectedDate,
        timeError,
        successMessage,
        errorMessage,
        startTimeDate,
        endTimeDate,
        to12HourTime,
    } = useEditForm(event);
    
    // Store the initial data to compare for changes
    const [initialEventData, setInitialEventData] = useState(event);    

    useEffect(() => {
        if (isOpen) {
            // Set initial data when dialog opens
            setInitialEventData(event);
        }
    }, [isOpen, event]);

    /**
     * Checks if the event data has been updated by comparing the state in the form
     * against the initial data.
     */
    const isEventUpdated = () => {
        // 1. Check for changes in text/array/social media fields
        const isDataChanged = JSON.stringify(initialEventData) !== JSON.stringify(eventData);

        // 2. Check for changes in date/time pickers
        let isDateTimeChanged = false;

        // Since eventData is type-safe now (assuming you fixed Activity.ts), 
        // we can safely access startDate and endDate
        if (selectedDate && eventData.startDate && startTimeDate && eventData.endDate && endTimeDate) {
            const initialStartDate = new Date(initialEventData.startDate);
            const initialEndDate = new Date(initialEventData.endDate);

            // Check if the date part has changed
            const isDateSame = isSameDay(selectedDate, initialStartDate);

            // Check if the start time part has changed (only comparing hour/minute)
            const isStartTimeSame = isSameHour(startTimeDate, initialStartDate) && isSameMinute(startTimeDate, initialStartDate);

            // Check if the end time part has changed (only comparing hour/minute)
            const isEndTimeSame = isSameHour(endTimeDate, initialEndDate) && isSameMinute(endTimeDate, initialEndDate);

            if (!isDateSame || !isStartTimeSame || !isEndTimeSame) {
                isDateTimeChanged = true;
            }
        }
        
        return isDataChanged || isDateTimeChanged;
    };

    return (
        <>
            <Dialog open={isOpen} maxWidth={"md"} fullWidth={true}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Box component="form" onSubmit={handleSubmit} noValidate autoComplete="off" sx={{ p: 3 }}>
                        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: 'black', mb: 2 }}>
                            Edit Event
                        </Typography>
                        <Stack spacing={2}>
                            <TextField
                                id="event-title"
                                label="Event Title"
                                variant="outlined"
                                name="eventTitle"
                                value={eventData.eventTitle || ""}
                                onChange={handleInputChange}
                                error={!!errors.eventTitle}
                                helperText={errors.eventTitle}
                                InputProps={{ style: textFieldStyle.input }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                                placeholder="Enter the title of the event"
                            />
                            <TextField
                                id="event-description"
                                label="Event Description"
                                multiline
                                maxRows={3}
                                variant="outlined"
                                name="eventDescription"
                                value={eventData.eventDescription || ""}
                                onChange={handleInputChange}
                                error={!!errors.eventDescription}
                                helperText={errors.eventDescription}
                                InputProps={{ style: textFieldStyle.input }}
                                inputProps={{ maxLength: 300 }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                                placeholder="Enter the description of the event"
                            />
                            <Box sx={{ backgroundColor: 'inherit' }}>
                                {/* FIX: Using renderInput instead of slotProps for compatibility */}
                                <DatePicker
                                    label="Event Date"
                                    value={selectedDate}
                                    onChange={(newDate) => handleDateChange(newDate as Date | null)}
                                    minDate={new Date()}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            error={!!errors.startDate}
                                            helperText={errors.startDate}
                                        />
                                    )}
                                />
                            </Box>
                            <Box sx={{ backgroundColor: 'inherit' }}>
                                {/* FIX: Using renderInput instead of slotProps for compatibility */}
                                <TimePicker
                                    label="Start Time"
                                    value={startTimeDate}
                                    onChange={(newTime) => onStartTimeChange(newTime as Date | null)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            error={!!errors.startDate}
                                            helperText={errors.startDate}
                                        />
                                    )}
                                />
                            </Box>
                            <Box sx={{ backgroundColor: 'inherit' }}>
                                {/* FIX: Using renderInput instead of slotProps for compatibility */}
                                <TimePicker
                                    label="End Time"
                                    value={endTimeDate}
                                    onChange={(newTime) => onEndTimeChange(newTime as Date | null)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            error={!!errors.endDate}
                                            helperText={errors.endDate || timeError}
                                        />
                                    )}
                                />
                            </Box>
                            <TextField
                                id="event-location"
                                label="Event Location"
                                variant="outlined"
                                name="eventLocation"
                                value={eventData.eventLocation || ''}
                                onChange={handleInputChange}
                                error={!!errors.eventLocation}
                                helperText={errors.eventLocation}
                                InputProps={{ style: textFieldStyle.input }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                                placeholder="Enter the location of the event"
                            />
                            <TextField
                                id="event-host"
                                label="Event Host"
                                variant="outlined"
                                name="eventHost"
                                value={eventData.eventHost || ''}
                                onChange={handleInputChange}
                                error={!!errors.eventHost}
                                helperText={errors.eventHost}
                                InputProps={{ style: textFieldStyle.input }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                                placeholder="Enter the host of the event"
                            />
                            <TextField
                                id="event-registration"
                                label="Event Registration"
                                variant="outlined"
                                name="eventRegistration"
                                value={eventData.eventRegistration || ''}
                                onChange={handleInputChange}
                                error={!!errors.eventRegistration}
                                helperText={errors.eventRegistration}
                                InputProps={{ style: textFieldStyle.input }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                                placeholder="Enter the registration link of the event"
                            />
                            <TextField
                                id="event-contact"
                                label="Event Contact"
                                variant="outlined"
                                name="eventContact"
                                value={eventData.eventContact || ''}
                                onChange={handleInputChange}
                                error={!!errors.eventContact}
                                helperText={errors.eventContact}
                                InputProps={{ style: textFieldStyle.input }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                                placeholder="Enter the contact information for the event"
                            />
                            <TextField
                                id="event-tags"
                                label="Event Tags"
                                variant="outlined"
                                name="eventTags"
                                value={eventData.eventTags.join(', ')}
                                onChange={(e) => {
                                    const tags = e.target.value.split(',').map(tag => tag.trim());
                                    handleInputChange({ target: { name: 'eventTags', value: tags } } as any);
                                }}
                                error={!!errors.eventTags}
                                helperText={errors.eventTags}
                                InputProps={{ style: textFieldStyle.input }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                                placeholder="Enter the tags of the event"
                            />
                            <TagSelector
                                selectedTags={eventData.eventTags || []}
                                allTags={EventTags}
                                onTagClick={handleTagClick}
                            />
                            {/* Social Media Inputs */}
                            <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>Social Media Links</Typography>
                            <TextField
                                id="facebook"
                                label="Facebook"
                                variant="outlined"
                                name="facebook"
                                value={eventData.eventSocialMedia.facebook || ''}
                                onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                                error={!!errors.eventSocialMedia?.facebook}
                                helperText={errors.eventSocialMedia?.facebook}
                                InputProps={{ style: textFieldStyle.input }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                                placeholder="Enter the Facebook link of the event"
                            />
                            <TextField
                                id="twitter"
                                label="Twitter"
                                variant="outlined"
                                name="twitter"
                                value={eventData.eventSocialMedia.twitter || ''}
                                onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                                error={!!errors.eventSocialMedia?.twitter}
                                helperText={errors.eventSocialMedia?.twitter}
                                InputProps={{ style: textFieldStyle.input }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                                placeholder="Enter the Twitter link of the event"
                            />
                            <TextField
                                id="instagram"
                                label="Instagram"
                                variant="outlined"
                                name="instagram"
                                value={eventData.eventSocialMedia.instagram || ''}
                                onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                                error={!!errors.eventSocialMedia?.instagram}
                                helperText={errors.eventSocialMedia?.instagram}
                                InputProps={{ style: textFieldStyle.input }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                                placeholder="Enter the Instagram link of the event"
                            />
                            <TextField
                                id="hashtag"
                                label="Hashtag"
                                variant="outlined"
                                name="hashtag"
                                value={eventData.eventSocialMedia.hashtag || ''}
                                onChange={(e) => handleSocialMediaChange('hashtag', e.target.value)}
                                error={!!errors.eventSocialMedia?.hashtag}
                                helperText={errors.eventSocialMedia?.hashtag}
                                InputProps={{ style: textFieldStyle.input }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                                placeholder="Enter the hashtag of the event"
                            />
                            <TextField
                                id="event-privacy"
                                label="Event Privacy"
                                variant="outlined"
                                name="eventPrivacy"
                                value={eventData.eventPrivacy || ''}
                                onChange={handleInputChange}
                                error={!!errors.eventPrivacy}
                                helperText={errors.eventPrivacy}
                                InputProps={{ style: textFieldStyle.input }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                                placeholder="Enter the privacy of the event"
                            />
                            <TextField
                                id="event-accessibility"
                                label="Event Accessibility"
                                variant="outlined"
                                name="eventAccessibility"
                                value={eventData.eventAccessibility || ''}
                                onChange={handleInputChange}
                                error={!!errors.eventAccessibility}
                                helperText={errors.eventAccessibility}
                                InputProps={{ style: textFieldStyle.input }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                                placeholder="Enter the accessibility of the event"
                            />
                            <TextField
                                id="event-note"
                                label="Event Note"
                                variant="outlined"
                                name="eventNote"
                                value={eventData.eventNote || ''}
                                onChange={handleInputChange}
                                error={!!errors.eventNote}
                                helperText={errors.eventNote}
                                InputProps={{ style: textFieldStyle.input }}
                                InputLabelProps={{ style: textFieldStyle.label }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }} >
                                <Box>
                                <Button type="submit" variant="contained" color="primary" style={{ textTransform: "none" }} disabled={!isEventUpdated()}>
                                    Confirm Edit
                                </Button>
                                <div className="error-messages">
                                    {/* Display non-nested errors */}
                                    {Object.entries(errors).map(([key, value]) => {
                                        if (typeof value === 'string' && value) {
                                            return <p key={key} className="error-text" style={{ color: "red" }}>{value}</p>;
                                        }
                                        return null;
                                    })}
                                    {/* Display nested social media errors */}
                                     {errors.eventSocialMedia && Object.entries(errors.eventSocialMedia).map(([nestedKey, nestedError]) => (
                                                nestedError ? <p key={`social-${nestedKey}`} className="error-text" style={{ color: "red" }}>
                                                    {`${nestedKey}: ${nestedError}`}
                                                </p> : null
                                            ))}
                                </div>
                                </Box>

                                <Button variant="contained" color="primary" sx={{ textTransform: "none", flex: "0 0 auto" }} onClick={() => {
                                    toggleEditDialog()
                                }}>
                                    Cancel
                                </Button>
                            </Box>


                        </Stack>
                        {/* Success/Error message upon button click */}
                        {successMessage && (
                            <Typography color="green" sx={{ mb: 2 }}>
                                {successMessage}
                            </Typography>
                        )
                        }

                        {errorMessage && (
                            <Typography color="error" sx={{ mb: 2 }}>
                                {errorMessage}
                            </Typography>
                        )
                        }
                    </Box>
                </LocalizationProvider>
            </Dialog>

        </>
    )


}

export default EditDialog;