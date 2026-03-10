import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import housesData from "../data/houses.json";
import genresData from "../data/genres.json";
import {
  fetchBooks as apiFetchBooks,
  addBook,
  updateBook,
  deleteBook,
  searchBooks,
} from "../api";

const EMPTY_FORM = { title: "", author: "", house: "", genre: [] };

function SortIcon({ field, sortBy, sortOrder }) {
  if (sortBy !== field) return <span className="ml-1 text-gray-400">↕</span>;
  return <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>;
}

// Builds the list of page numbers to show, with ellipsis gaps for large page counts
// e.g. [1, '...', 4, 5, 6, '...', 20]
function buildPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];
  const delta = 2;
  const left = currentPage - delta;
  const right = currentPage + delta;

  pages.push(1);

  if (left > 2) pages.push("...");

  for (let i = Math.max(2, left); i <= Math.min(totalPages - 1, right); i++) {
    pages.push(i);
  }

  if (right < totalPages - 1) pages.push("...");

  pages.push(totalPages);

  return pages;
}

export default function Books() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("title");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isPaging, setIsPaging] = useState(false);

  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  // Replaced cursor state with simple page number + total info
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);

  // Search still uses cursor pagination since Atlas Search returns relevance-ranked results
  const [searchCursor, setSearchCursor] = useState(null);
  const [searchPrevCursors, setSearchPrevCursors] = useState([]);

  const debounceTimer = useRef(null);
  const hasMounted = useRef(false);
  const initialLoad = useRef(true);
  const abortRef = useRef(null);

  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [limit, setLimit] = useState(10);

  const [formData, setFormData] = useState(EMPTY_FORM);

  const isSearchActive = search.trim() !== "";

  // ------------------- Fetch Books -------------------
  const fetchBooks = useCallback(
    async (
      page = 1,
      showLoader = true,
      customLimit = null,
      currentSortBy = null,
      currentSortOrder = "asc"
    ) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        const limitToUse = customLimit || limit;
        setError("");
        if (showLoader) setShowSkeleton(true);

        const result = await apiFetchBooks(limitToUse, page, currentSortBy, currentSortOrder);

        const data = Array.isArray(result.data) ? result.data : [];
        setBooks(data);
        setCurrentPage(result.pagination.currentPage);
        setTotalPages(result.pagination.totalPages);
        setTotalBooks(result.pagination.total);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error(err);
        setError(err.message || "Failed to fetch books");
        toast.error(err.message || "Failed to fetch books");
      } finally {
        setShowSkeleton(false);
        setIsPaging(false);
        initialLoad.current = false;
      }
    },
    [limit]
  );

  // ------------------- Fetch Search Results -------------------
  const fetchSearch = useCallback(
    async (
      query,
      field,
      cursor = null,
      direction = "next",
      customLimit = null
    ) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        const limitToUse = customLimit || limit;
        setError("");

        const result = await searchBooks(query.trim(), field, limitToUse, cursor);

        const data = Array.isArray(result.data) ? result.data : [];
        setBooks(data);

        if (direction === "next" && cursor) {
          setSearchPrevCursors((prev) => [...prev, cursor]);
        }
        setSearchCursor(result.pagination?.nextCursor || null);

        // Show total count if available, otherwise clear it
        setTotalBooks(0);
        setTotalPages(1);
        setCurrentPage(1);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error(err);
        setError(err.message || "Search failed");
        toast.error(err.message || "Search failed");
      } finally {
        setShowSkeleton(false);
        setIsPaging(false);
        initialLoad.current = false;
      }
    },
    [limit]
  );

  // ------------------- Initial Load -------------------
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;
    fetchBooks(1, true, null, null, "asc");
  }, []);

  // ------------------- Search Debounce -------------------
  useEffect(() => {
    if (initialLoad.current) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      setSearchCursor(null);
      setSearchPrevCursors([]);

      if (search.trim()) {
        fetchSearch(search, searchField);
      } else {
        fetchBooks(1, false, null, sortBy, sortOrder);
      }
    }, 250);

    return () => clearTimeout(debounceTimer.current);
  }, [search, searchField]);

  // ------------------- Sort Handler -------------------
  const handleSort = (field) => {
    const newOrder = sortBy === field && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(field);
    setSortOrder(newOrder);
    fetchBooks(1, false, null, field, newOrder);
  };

  // ------------------- Page Change -------------------
  const goToPage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setIsPaging(true);
    fetchBooks(page, false, null, sortBy, sortOrder);
  };

  // ------------------- Form Handlers -------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.author.trim() || !formData.house || formData.genre.length === 0) {
      setModalError("All fields are required");
      return;
    }

    try {
      setModalError("");

      if (isEditing) {
        await updateBook(currentId, formData);
        toast.success("Book updated");
      } else {
        await addBook(formData);
        toast.success("Book added");
      }

      setSearch("");
      await fetchBooks(1, false, null, sortBy, sortOrder);
      closeModal();
    } catch (err) {
      const msg = err.message || "Operation failed";
      setModalError(msg);
      toast.error(msg);
    }
  };

  const openEditModal = (book) => {
    setFormData({ ...book, genre: book.genre || [] });
    setCurrentId(book._id);
    setIsEditing(true);
    setModalError("");
    setShowModal(true);
  };

  const openDeleteModal = (id) => {
    setCurrentId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const id = currentId;
    setShowDeleteModal(false);
    setDeletingId(id);

    try {
      await deleteBook(id);
      toast.success("Book deleted");

      setSearch("");
      await fetchBooks(1, false, null, sortBy, sortOrder);
    } catch (err) {
      toast.error(err.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const openAddModal = () => {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setCurrentId(null);
    setModalError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setCurrentId(null);
    setModalError("");
  };

  const deletingBookTitle = books.find((b) => b._id === currentId)?.title;

  const sortableHeader = "cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors";

  // ------------------- Render -------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mt-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Books</h1>
        <button
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Add Book
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder={`Search by ${searchField}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
          />
        </div>

        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
        >
          <option value="title">Title</option>
          <option value="author">Author</option>
          <option value="house">House</option>
          <option value="genre">Genre</option>
        </select>

        <button
          type="button"
          onClick={() => setSearch("")}
          disabled={search.length === 0}
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <table className="min-w-full table-fixed text-left">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            <tr>
              <th className={`px-6 py-3 w-2/6 ${sortableHeader}`} onClick={() => handleSort("title")}>
                Title <SortIcon field="title" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th className={`px-6 py-3 w-1/5 ${sortableHeader}`} onClick={() => handleSort("author")}>
                Author <SortIcon field="author" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th className={`px-6 py-3 w-1/5 ${sortableHeader}`} onClick={() => handleSort("house")}>
                House <SortIcon field="house" sortBy={sortBy} sortOrder={sortOrder} />
              </th>
              <th className="px-6 py-3 w-1/5">Genre</th>
              <th className="px-6 py-3 w-1/5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {showSkeleton
              ? [...Array(limit)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 w-32 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))
              : books.map((book) => (
                <tr key={book._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <td className="px-6 py-4 text-gray-800 dark:text-gray-100 truncate">{book.title}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 truncate">{book.author}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 truncate">{book.house}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {book.genre?.map((g, idx) => (
                        <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">{g}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(book)} className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300">Edit</button>
                      <button
                        disabled={deletingId === book._id}
                        onClick={() => openDeleteModal(book._id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        {deletingId === book._id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {!showSkeleton && books.length === 0 && (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">No books found</div>
        )}
      </div>

      {/* Pagination + Books per page — single row */}
      <div className="flex items-center justify-between mt-4 gap-4">

        {/* Left: total count */}
        <div className="w-32 text-sm text-gray-500 dark:text-gray-400">
          {!isSearchActive && totalBooks > 0 && (
            <span>{totalBooks} {totalBooks === 1 ? "book" : "books"}</span>
          )}
        </div>

        {/* Centre: page numbers or search prev/next */}
        <div className="flex items-center gap-1">
          {!isSearchActive && totalPages > 1 && (
            <>
              <button
                disabled={currentPage === 1 || isPaging}
                onClick={() => goToPage(currentPage - 1)}
                className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 disabled:opacity-50 transition"
              >
                ←
              </button>

              {buildPageNumbers(currentPage, totalPages).map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-400">…</span>
                ) : (
                  <button
                    key={page}
                    disabled={isPaging}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-2 rounded-lg transition ${
                      page === currentPage
                        ? "bg-blue-600 text-white font-semibold"
                        : "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500"
                    } disabled:opacity-50`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                disabled={currentPage === totalPages || isPaging}
                onClick={() => goToPage(currentPage + 1)}
                className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 disabled:opacity-50 transition"
              >
                →
              </button>
            </>
          )}

          {isSearchActive && (
            <>
              <button
                disabled={searchPrevCursors.length === 0 || isPaging}
                onClick={() => {
                  const stack = [...searchPrevCursors];
                  stack.pop();
                  const cursor = stack.length ? stack[stack.length - 1] : null;
                  setSearchPrevCursors(stack);
                  setIsPaging(true);
                  fetchSearch(search, searchField, cursor, "prev");
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 disabled:opacity-50"
              >
                {isPaging ? "Loading..." : "Previous"}
              </button>

              <button
                disabled={!searchCursor || isPaging}
                onClick={() => {
                  setIsPaging(true);
                  fetchSearch(search, searchField, searchCursor, "next");
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
              >
                {isPaging ? "Loading..." : "Next"}
              </button>
            </>
          )}
        </div>

        {/* Right: books per page */}
        <div className="flex items-center gap-2 w-32 justify-end">
          <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">Per page</span>
          <select
            value={limit}
            onChange={(e) => {
              const newLimit = Number(e.target.value);
              setLimit(newLimit);
              setSearch("");
              fetchBooks(1, false, newLimit, sortBy, sortOrder);
            }}
            className="px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
              {isEditing ? "Edit Book" : "Add Book"}
            </h2>

            {modalError && (
              <div className="text-red-500 text-sm mb-3">{modalError}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white"
              />

              <input
                type="text"
                placeholder="Author"
                value={formData.author}
                onChange={(e) =>
                  setFormData({ ...formData, author: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white"
              />

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select House
                </label>

                <div className="flex flex-wrap gap-2">
                  {housesData.map((house, index) => {
                    const isSelected = formData.house === house;
                    return (
                      <button
                        type="button"
                        key={index}
                        onClick={() => setFormData({ ...formData, house })}
                        className={`px-3 py-1 rounded-full text-sm ${isSelected
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          }`}
                      >
                        {house}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Genre
                </label>

                <div className="flex flex-wrap gap-2">
                  {genresData.map((genre, index) => {
                    const isSelected = formData.genre.includes(genre);
                    return (
                      <button
                        type="button"
                        key={index}
                        onClick={() => {
                          if (isSelected) {
                            setFormData({
                              ...formData,
                              genre: formData.genre.filter((g) => g !== genre),
                            });
                          } else {
                            setFormData({
                              ...formData,
                              genre: [...formData.genre, genre],
                            });
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm ${isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg bg-gray-300"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                >
                  {isEditing ? "Update Book" : "Add Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">
              Delete Book
            </h3>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-100">
                {deletingBookTitle}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-300"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}