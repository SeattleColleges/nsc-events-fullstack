/**
 * Utility to normalize field names between MongoDB and PostgreSQL backends
 * MongoDB uses _id while PostgreSQL uses id
 */

/**
 * Normalizes an activity/event object to ensure it has both id and _id fields
 * @param activity The activity object from the API
 * @returns The normalized activity with consistent id fields
 */
export function normalizeActivityId<T extends Record<string, any>>(activity: T | null): T | null {
  if (!activity) return null;
  
  // Use type assertion to work with dynamic properties
  const normalized = { ...activity } as Record<string, any>;
  
  // If activity has id but no _id, add _id field for MongoDB compatibility
  if (normalized.id !== undefined && normalized._id === undefined) {
    normalized._id = normalized.id;
  }
  
  // If activity has _id but no id, add id field for PostgreSQL compatibility
  if (normalized._id !== undefined && normalized.id === undefined) {
    normalized.id = normalized._id;
  }
  
  return normalized as T;
}

/**
 * Normalizes an array of activity/event objects
 * @param activities Array of activity objects
 * @returns Array of normalized activities
 */
export function normalizeActivityIds<T extends Record<string, any>>(activities: T[] | null): T[] {
  if (!activities) return [] as T[];
  
  return activities.map(activity => normalizeActivityId(activity) as T);
}

/**
 * Gets the activity ID regardless of whether it's stored as id or _id
 * @param activity The activity object
 * @returns The activity ID as a string, or undefined if not found
 */
export function getActivityId(activity: Record<string, any> | null | undefined): string | undefined {
  if (!activity) return undefined;
  return activity.id || activity._id;
}
