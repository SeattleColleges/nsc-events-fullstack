'use client';

import useAuth from "@/hooks/useAuth";
import {
  Button,
  Container,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Box,
  InputAdornment
} from "@mui/material";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import React, { useEffect, useState, useCallback } from "react";
import UnauthorizedPageMessage from "../../components/UnauthorizedPageMessage";
import { ActivityDatabase } from "@/models/activityDatabase";
import EventCard from "../../components/EventCard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ArchiveDialog from "@/components/ArchiveDialog";

const ArchivedEvents = () => {
    const { isAuth, user } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<ActivityDatabase[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [hostFilter, setHostFilter] = useState('');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');

    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Menu state
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedEvent, setSelectedEvent] = useState<ActivityDatabase | null>(null);
    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.between('xs', 'sm'));
    const EVENTS_PER_PAGE = 12;

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1); // Reset to first page on search
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch events with filters
    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const apiUrl = process.env.NSC_EVENTS_PUBLIC_API_URL;
            const params = new URLSearchParams({
                page: String(page),
                numEvents: String(EVENTS_PER_PAGE),
                isArchived: 'true',
            });

            // Add filters if they exist
            if (locationFilter) {
                params.append('location', locationFilter);
            }
            if (hostFilter) {
                params.append('host', hostFilter);
            }
            if (startDateFilter) {
                params.append('startDate', startDateFilter);
            }
            if (endDateFilter) {
                params.append('endDate', endDateFilter);
            }

            // Use search endpoint if search query exists
            let url = `${apiUrl}/events`;
            if (debouncedSearch) {
                url = `${apiUrl}/events/search`;
                params.set('q', debouncedSearch);
            }

            const response = await fetch(`${url}?${params.toString()}`);
            const data = await response.json();

            if (isMobile) {
                // Infinite scroll for mobile
                if (page === 1) {
                    setEvents(data);
                } else {
                    setEvents(prev => [...prev, ...data]);
                }
                setHasMore(data.length === EVENTS_PER_PAGE);
            } else {
                // Pagination for desktop
                setEvents(data);
                // Calculate total pages (this is approximate since we don't have total count)
                if (data.length < EVENTS_PER_PAGE) {
                    setTotalPages(page);
                } else {
                    setTotalPages(page + 1);
                }
            }
        } catch (error) {
            console.error('Error fetching archived events:', error);
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, locationFilter, hostFilter, startDateFilter, endDateFilter, isMobile]);

    useEffect(() => {
        if (isAuth && (user?.role === 'admin' || user?.role === 'creator')) {
            fetchEvents();
        }
    }, [isAuth, user, fetchEvents]);

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLoadMore = () => {
        setPage(prev => prev + 1);
    };

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, eventData: ActivityDatabase) => {
        setAnchorEl(event.currentTarget);
        setSelectedEvent(eventData);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleUnarchive = () => {
        if (selectedEvent) {
            setArchiveDialogOpen(true);
        }
        handleMenuClose();
    };

    const handleViewDetails = () => {
        if (selectedEvent) {
            router.push(`/event-detail?id=${selectedEvent.id}&from=archived`);
        }
        handleMenuClose();
    };

    const clearFilters = () => {
        setSearchQuery('');
        setLocationFilter('');
        setHostFilter('');
        setStartDateFilter('');
        setEndDateFilter('');
        setPage(1);
    };

    const hasActiveFilters = searchQuery || locationFilter || hostFilter || startDateFilter || endDateFilter;

    if (!isAuth || (user?.role !== 'admin' && user?.role !== 'creator')) {
        return <UnauthorizedPageMessage />;
    }

    if (isMobile) {
        return (
            <Container maxWidth={false} sx={{ py: 3 }}>
                <Typography fontSize="1.75rem" textAlign="center" padding="1rem" marginBottom="1rem">
                    Archived Events
                </Typography>

                {/* Search and Filters */}
                <Stack spacing={2} mb={3}>
                    <TextField
                        fullWidth
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                            endAdornment: searchQuery && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearchQuery('')}>
                                        <ClearIcon />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <TextField
                        fullWidth
                        placeholder="Filter by location"
                        value={locationFilter}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocationFilter(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        placeholder="Filter by host"
                        value={hostFilter}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHostFilter(e.target.value)}
                    />
                    {hasActiveFilters && (
                        <Button variant="outlined" onClick={clearFilters} startIcon={<ClearIcon />}>
                            Clear Filters
                        </Button>
                    )}
                </Stack>

                {/* Events List */}
                {loading && page === 1 ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container direction="column" spacing={2} alignItems="center">
                        {events.map((event) => (
                            <Grid key={event.id} item>
                                <Link
                                    href={{
                                        pathname: "/event-detail",
                                        query: { id: event.id, from: 'archived' },
                                    }}
                                >
                                    <EventCard event={event} />
                                </Link>
                            </Grid>
                        ))}
                        {events.length === 0 && !loading && (
                            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
                                No archived events found
                            </Typography>
                        )}
                        {hasMore && events.length > 0 && (
                            <Button
                                onClick={handleLoadMore}
                                variant="contained"
                                disabled={loading}
                                sx={{ mt: 2 }}
                            >
                                {loading ? <CircularProgress size={24} /> : 'Load More'}
                            </Button>
                        )}
                    </Grid>
                )}
            </Container>
        );
    }

    // Desktop view
    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Typography variant="h4" textAlign="center" mb={4}>
                Archived Events
            </Typography>

            {/* Search and Filters */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Search"
                            placeholder="Search by title, description, location, or host..."
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                                endAdornment: searchQuery && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearchQuery('')}>
                                            <ClearIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            label="Location"
                            placeholder="Filter by location"
                            value={locationFilter}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocationFilter(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            label="Host"
                            placeholder="Filter by host"
                            value={hostFilter}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHostFilter(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Start Date (From)"
                            type="date"
                            value={startDateFilter}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDateFilter(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="End Date (To)"
                            type="date"
                            value={endDateFilter}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDateFilter(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    {hasActiveFilters && (
                        <Grid item xs={12}>
                            <Button variant="outlined" onClick={clearFilters} startIcon={<ClearIcon />}>
                                Clear All Filters
                            </Button>
                        </Grid>
                    )}
                </Grid>
            </Paper>

            {/* Events Table */}
            {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    <TableContainer component={Paper}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ backgroundColor: isDarkMode ? '#333' : 'inherit', color: isDarkMode ? 'white' : 'inherit', fontWeight: 'bold' }}>
                                        Event Title
                                    </TableCell>
                                    <TableCell sx={{ backgroundColor: isDarkMode ? '#333' : 'inherit', color: isDarkMode ? 'white' : 'inherit', fontWeight: 'bold' }}>
                                        Date
                                    </TableCell>
                                    <TableCell sx={{ backgroundColor: isDarkMode ? '#333' : 'inherit', color: isDarkMode ? 'white' : 'inherit', fontWeight: 'bold' }}>
                                        Location
                                    </TableCell>
                                    <TableCell sx={{ backgroundColor: isDarkMode ? '#333' : 'inherit', color: isDarkMode ? 'white' : 'inherit', fontWeight: 'bold' }}>
                                        Host
                                    </TableCell>
                                    <TableCell sx={{ backgroundColor: isDarkMode ? '#333' : 'inherit', color: isDarkMode ? 'white' : 'inherit', fontWeight: 'bold' }}>
                                        Contact
                                    </TableCell>
                                    <TableCell align="right" sx={{ backgroundColor: isDarkMode ? '#333' : 'inherit' }}>
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {events.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                            <Typography variant="body1" color="text.secondary">
                                                No archived events found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    events.map((event) => (
                                        <TableRow key={event.id} hover>
                                            <TableCell>{event.eventTitle}</TableCell>
                                            <TableCell>
                                                {new Date(event.startDate).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>{event.eventLocation}</TableCell>
                                            <TableCell>{event.eventHost}</TableCell>
                                            <TableCell>{event.eventContact}</TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    onClick={(e: React.MouseEvent<HTMLElement>) => handleMenuClick(e, event)}
                                                    size="small"
                                                >
                                                    <MoreVertIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination */}
                    {events.length > 0 && (
                        <Stack alignItems="center" mt={3}>
                            <Pagination
                                color="primary"
                                page={page}
                                onChange={handlePageChange}
                                count={totalPages}
                                showFirstButton
                                showLastButton
                                variant="outlined"
                                shape="rounded"
                                size="large"
                            />
                        </Stack>
                    )}
                </>
            )}

            {/* Action Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleViewDetails}>View Details</MenuItem>
                <MenuItem onClick={handleUnarchive}>Unarchive</MenuItem>
            </Menu>

            {/* Dialogs */}
            {selectedEvent && (
                <ArchiveDialog
                    isOpen={archiveDialogOpen}
                    event={selectedEvent}
                    dialogToggle={() => {
                        setArchiveDialogOpen(false);
                        setSelectedEvent(null);
                        fetchEvents(); // Refresh the list
                    }}
                />
            )}
        </Container>
    );
};

export default ArchivedEvents;
