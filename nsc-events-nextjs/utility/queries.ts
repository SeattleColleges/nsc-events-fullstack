import { useQuery } from "@tanstack/react-query";
import { ActivityDatabase } from "@/models/activityDatabase";
import { normalizeActivityId, normalizeActivityIds } from './dbFieldMapper';

const numOfEventsToGet = 6;
const apiUrl = process.env.NSC_EVENTS_PUBLIC_API_URL;
const getEvents = async (page: any, tags: string[]) => {
    const params = new URLSearchParams({
        page: String(page),
        isArchived: String(false),
        tags: String(tags),
        numEvents: String(numOfEventsToGet),
    });
    const response = await fetch(`${apiUrl}/events?${params.toString()}`);
    const data = await response.json();
    // Normalize the ID fields to ensure compatibility
    return normalizeActivityIds(data);
}
export function useFilteredEvents(page: any, isEnabled: boolean, tags: string[] = []) {
    return useQuery<ActivityDatabase[], Error>({
        queryKey: ["events", page, tags],
        queryFn: async () => {
            const data = await getEvents(page, tags);
            return data as unknown as ActivityDatabase[];
        },
        enabled: isEnabled
    });
}

const getArchivedEvents = async (page: any) => {
    const params = new URLSearchParams({
        page: String(page),
        numEvents: String(numOfEventsToGet),
        isArchived: String(true)
    });
    const response = await fetch(`${apiUrl}/events?${String(params)}`);
    const data = await response.json();
    // Normalize the ID fields to ensure compatibility
    return normalizeActivityIds(data);
}
export function useArchivedEvents(page: any, isEnabled: boolean) {
    return useQuery<ActivityDatabase[], Error>({
        queryKey: ["archivedEvents", page],
        queryFn: async () => {
            const data = await getArchivedEvents(page);
            return data as unknown as ActivityDatabase[];
        },
        enabled: isEnabled
    });
}

const getMyEvents = async (userId: string, page: any) => {
    const params = new URLSearchParams({
        page: String(page),
        numEvents: String(numOfEventsToGet),
    });
    const response = await fetch(`${apiUrl}/events/user/${userId}?${String(params)}`);
    const data = await response.json();
    // Normalize the ID fields to ensure compatibility
    return normalizeActivityIds(data);
}
export function useMyEvents(userId: string, page: any, isEnabled: boolean) {
    return useQuery<ActivityDatabase[], Error>({
        queryKey: ["myEvents", userId, page],
        queryFn: async () => {
            const data = await getMyEvents(userId, page);
            return data as unknown as ActivityDatabase[];
        },
        enabled: isEnabled
    });
}

const getEventById = async (id: string | null) => {
    const response = await fetch(`${apiUrl}/events/find/${id}`);
    const data = await response.json();
    // Normalize the ID fields to ensure compatibility
    return normalizeActivityId(data);
}

export function useEventById(eventId: string | null) {
    return useQuery<ActivityDatabase, Error>({
        queryKey: [eventId],
        queryFn: async () => {
            const data = await getEventById(eventId);
            return data as unknown as ActivityDatabase;
        },
    })
}

export function useIsAttending(eventId: string | undefined, userId: string | undefined) {
    return useQuery<boolean, Error>({
        queryKey: ['isAttending', eventId, userId],
        queryFn: async () => {
            if (!eventId || !userId) throw new Error("Missing eventId or userId");
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/event-registration/check/${eventId}/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data = await response.json();
            return data.isRegistered; // Extract the boolean from the response object
        }
    })
}