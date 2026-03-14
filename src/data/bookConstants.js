// Shared constants for book status — used across Books, BookModal, and Discover pages.
// Single source of truth so adding a new status only requires a change here.

export const STATUSES = ["read", "reading", "want to read"];

export const STATUS_LABELS = {
    "read": "Read",
    "reading": "Reading",
    "want to read": "Want to read",
};

// Tailwind classes for status badges (pill/chip style)
export const STATUS_STYLES = {
    "read": "bg-green-100  dark:bg-green-900  text-green-700  dark:text-green-300",
    "reading": "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300",
    "want to read": "bg-blue-100   dark:bg-blue-900   text-blue-700   dark:text-blue-300",
};