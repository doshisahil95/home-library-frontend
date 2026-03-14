export default function DeleteModal({ bookTitle, onConfirm, onClose }) {
    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">Delete Book</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{bookTitle}</span>?
                    {" "}This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 dark:text-white text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}