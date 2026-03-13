import React, { useState, useEffect, useRef, useCallback } from "react";
import { Filter } from "lucide-react";
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

const EMPTY_FORM = { title: "", author: "", house: "", genre: [], description: "", userStatus: null };
const STATUSES   = ["read", "reading", "want to read"];

const STATUS_STYLES = {
  "read":         "bg-green-100  dark:bg-green-900  text-green-700  dark:text-green-300",
  "reading":      "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300",
  "want to read": "bg-blue-100   dark:bg-blue-900   text-blue-700   dark:text-blue-300",
};

const STATUS_LABELS = {
  "read":         "Read",
  "reading":      "Reading",
  "want to read": "Want to read",
};

// Outside component — stable identity
function SortIcon({ field, sortBy, sortOrder, disabled }) {
  if (disabled || sortBy !== field) return <span className="ml-1 text-gray-300 dark:text-gray-600">↕</span>;
  return <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>;
}

function buildPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = [];
  const delta = 2;
  const left  = currentPage - delta;
  const right = currentPage + delta;
  pages.push(1);
  if (left > 2) pages.push("...");
  for (let i = Math.max(2, left); i <= Math.min(totalPages - 1, right); i++) pages.push(i);
  if (right < totalPages - 1) pages.push("...");
  pages.push(totalPages);
  return pages;
}

export default function Books() {
  const [books, setBooks]               = useState([]);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isPaging, setIsPaging]         = useState(false);
  const [error, setError]               = useState("");
  const [modalError, setModalError]     = useState("");

  // Search & filters
  const [search, setSearch]             = useState("");
  const [filterHouse, setFilterHouse]   = useState("");
  const [filterGenre, setFilterGenre]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filtersOpen, setFiltersOpen]   = useState(false);

  // Sort (browse mode only)
  const [sortBy, setSortBy]       = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  // Browse pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalBooks, setTotalBooks]   = useState(0);

  // Search cursor pagination
  const [searchCursor, setSearchCursor]           = useState(null);
  const [searchPrevCursors, setSearchPrevCursors] = useState([]);

  // Expanded row
  const [expandedId, setExpandedId] = useState(null);

  // Modals
  const [showModal, setShowModal]             = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing]             = useState(false);
  const [currentId, setCurrentId]             = useState(null);
  const [deletingId, setDeletingId]           = useState(null);
  const [deletingBookTitle, setDeletingBookTitle] = useState("");

  const [limit, setLimit]       = useState(10);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const debounceTimer = useRef(null);
  const hasMounted    = useRef(false);
  const initialLoad   = useRef(true);
  const abortRef      = useRef(null);

  // isAtlasSearch  = text query present → Atlas Search + cursor pagination
  // hasFilters     = dropdown filters only → Mongoose query + offset pagination
  // isSearchActive = either → used for UI state (filter badge, reset button)
  const isAtlasSearch  = search.trim() !== "";
  const hasFilters     = !!filterHouse || !!filterGenre || !!filterStatus;
  const isSearchActive = isAtlasSearch || hasFilters;

  const activeFilters = { house: filterHouse, genre: filterGenre, status: filterStatus };

  const activeFilterCount = [filterHouse, filterGenre, filterStatus].filter(Boolean).length;

  // ─── Fetch Books (browse + filter mode) ──────────────────────────────────

  const fetchBooks = useCallback(async (
    page = 1, showLoader = true, customLimit = null,
    currentSortBy = null, currentSortOrder = "asc", filters = activeFilters
  ) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      const limitToUse = customLimit || limit;
      setError("");
      if (showLoader) setShowSkeleton(true);
      const result = await apiFetchBooks(
        limitToUse, page, currentSortBy, currentSortOrder,
        filters, abortRef.current.signal
      );
      const data = Array.isArray(result.data) ? result.data : [];
      setBooks(data);
      setCurrentPage(result.pagination.currentPage);
      setTotalPages(result.pagination.totalPages);
      setTotalBooks(result.pagination.total);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message || "Failed to fetch books");
      toast.error(err.message || "Failed to fetch books");
    } finally {
      setShowSkeleton(false);
      setIsPaging(false);
      initialLoad.current = false;
    }
  }, [limit]);

  // ─── Fetch Search Results (Atlas Search) ─────────────────────────────────

  const fetchSearch = useCallback(async (
    query, filters = activeFilters, cursor = null, direction = "next", customLimit = null
  ) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      const limitToUse = customLimit || limit;
      setError("");
      if (!cursor) setShowSkeleton(true);
      const result = await searchBooks(
        query.trim(), filters, limitToUse, cursor, abortRef.current.signal
      );
      const data = Array.isArray(result.data) ? result.data : [];
      setBooks(data);
      if (direction === "next" && cursor) {
        setSearchPrevCursors((prev) => [...prev, cursor]);
      }
      setSearchCursor(result.pagination?.nextCursor || null);
      setTotalBooks(0);
      setTotalPages(1);
      setCurrentPage(1);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message || "Search failed");
      toast.error(err.message || "Search failed");
    } finally {
      setShowSkeleton(false);
      setIsPaging(false);
      initialLoad.current = false;
    }
  }, [limit]);

  // ─── Initial Load ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;
    fetchBooks(1, true, null, null, "asc", { house: "", genre: "", status: "" });
  }, []);

  // ─── Debounced trigger ────────────────────────────────────────────────────

  useEffect(() => {
    if (initialLoad.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const filters = { house: filterHouse, genre: filterGenre, status: filterStatus };
      setSearchCursor(null);
      setSearchPrevCursors([]);
      setExpandedId(null);
      if (search.trim()) {
        fetchSearch(search, filters);
      } else {
        fetchBooks(1, false, null, sortBy, sortOrder, filters);
      }
    }, 250);
    return () => clearTimeout(debounceTimer.current);
  }, [search, filterHouse, filterGenre, filterStatus]);

  // ─── Sort ─────────────────────────────────────────────────────────────────

  const handleSort = (field) => {
    if (isAtlasSearch) return; // sort disabled in Atlas Search mode
    const newOrder = sortBy === field && sortOrder === "asc" ? "desc" : "asc";
    setSortBy(field);
    setSortOrder(newOrder);
    fetchBooks(1, false, null, field, newOrder, activeFilters);
  };

  // ─── Page Change ──────────────────────────────────────────────────────────

  const goToPage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setIsPaging(true);
    setExpandedId(null);
    fetchBooks(page, false, null, sortBy, sortOrder, activeFilters);
  };

  // ─── Reset ────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setSearch("");
    setFilterHouse("");
    setFilterGenre("");
    setFilterStatus("");
    setExpandedId(null);
  };

  const isResetDisabled = search === "" && !filterHouse && !filterGenre && !filterStatus;

  // ─── Row expand toggle ────────────────────────────────────────────────────

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ─── Form Handlers ────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.author.trim() || !formData.house || formData.genre.length === 0) {
      setModalError("All fields are required");
      return;
    }
    try {
      setModalError("");
      const payload = {
        ...formData,
        title:       formData.title.trim(),
        author:      formData.author.trim(),
        description: formData.description?.trim() || "",
        userStatus:  formData.userStatus || null,
      };
      if (isEditing) {
        await updateBook(currentId, payload);
        toast.success("Book updated");
      } else {
        await addBook(payload);
        toast.success("Book added");
      }
      const filters = { house: filterHouse, genre: filterGenre, status: filterStatus };
      if (search.trim()) {
        await fetchSearch(search, filters);
      } else {
        await fetchBooks(1, false, null, sortBy, sortOrder, filters);
      }
      closeModal();
    } catch (err) {
      const msg = err.message || "Operation failed";
      setModalError(msg);
      toast.error(msg);
    }
  };

  const openEditModal = (book) => {
    setFormData({
      title:       book.title,
      author:      book.author,
      house:       book.house,
      genre:       book.genre || [],
      description: book.description || "",
      userStatus:  book.userStatus || null,
    });
    setCurrentId(book._id);
    setIsEditing(true);
    setModalError("");
    setShowModal(true);
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

  const openDeleteModal = (book) => {
    setCurrentId(book._id);
    setDeletingBookTitle(book.title);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const id = currentId;
    setShowDeleteModal(false);
    setDeletingId(id);
    try {
      await deleteBook(id);
      toast.success("Book deleted");
      const filters = { house: filterHouse, genre: filterGenre, status: filterStatus };
      if (search.trim()) {
        await fetchSearch(search, filters);
      } else {
        await fetchBooks(1, false, null, sortBy, sortOrder, filters);
      }
    } catch (err) {
      toast.error(err.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const skeletonRows = Math.min(limit, 25);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex justify-between items-center mt-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Books</h1>
        <button onClick={openAddModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          + Add Book
        </button>
      </div>

      {/* Search bar + Filters toggle + Reset */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by title or author"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
          />
        </div>

        {/* Filters toggle button */}
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
            filtersOpen || activeFilterCount > 0
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
          }`}
        >
          <Filter size={16} />
          <span className="text-sm">Filters</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Reset */}
        <button
          type="button"
          onClick={handleReset}
          disabled={isResetDisabled}
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      {/* Filter row — collapsed by default */}
      {filtersOpen && (
        <div className="flex flex-wrap gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <select
            value={filterHouse}
            onChange={(e) => setFilterHouse(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
          >
            <option value="">All Houses</option>
            {housesData.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>

          <select
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
          >
            <option value="">All Genres</option>
            {genresData.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      )}

      {error && <div className="text-red-500 text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col style={{ width: "28%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm">
            <tr>
              <th
                className={`px-4 py-3 select-none transition-colors ${
                  isAtlasSearch ? "text-gray-400 dark:text-gray-500" : "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                }`}
                onClick={() => handleSort("title")}
              >
                Title <SortIcon field="title" sortBy={sortBy} sortOrder={sortOrder} disabled={isAtlasSearch} />
              </th>
              <th
                className={`px-4 py-3 select-none transition-colors ${
                  isAtlasSearch ? "text-gray-400 dark:text-gray-500" : "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                }`}
                onClick={() => handleSort("author")}
              >
                Author <SortIcon field="author" sortBy={sortBy} sortOrder={sortOrder} disabled={isAtlasSearch} />
              </th>
              <th
                className={`px-4 py-3 select-none transition-colors ${
                  isAtlasSearch ? "text-gray-400 dark:text-gray-500" : "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                }`}
                onClick={() => handleSort("house")}
              >
                House <SortIcon field="house" sortBy={sortBy} sortOrder={sortOrder} disabled={isAtlasSearch} />
              </th>
              <th className="px-4 py-3">Genre</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            {showSkeleton
              ? [...Array(skeletonRows)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
              : books.map((book) => {
                const isExpanded = expandedId === book._id;
                return (
                  <React.Fragment key={book._id}>
                    <tr
                      key={book._id}
                      onClick={() => toggleExpand(book._id)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 truncate font-medium">
                        {book.title}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 truncate">{book.author}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 truncate">{book.house}</td>

                      {/* Genre — first tag + overflow count */}
                      <td className="px-4 py-3">
                        {book.genre?.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full truncate max-w-20">
                              {book.genre[0]}
                            </span>
                            {book.genre.length > 1 && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                +{book.genre.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {book.userStatus ? (
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${STATUS_STYLES[book.userStatus]}`}>
                            {STATUS_LABELS[book.userStatus]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(book); }}
                            className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                          >
                            Edit
                          </button>
                          <button
                            disabled={deletingId === book._id}
                            onClick={(e) => { e.stopPropagation(); openDeleteModal(book); }}
                            className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                          >
                            {deletingId === book._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr key={`${book._id}-expanded`} className="bg-gray-50 dark:bg-gray-700/50">
                        <td colSpan={6} className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="space-y-3">

                            {/* Full genre list */}
                            {book.genre?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {book.genre.map((g, idx) => (
                                  <span key={idx} className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                                    {g}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Description */}
                            <p className={`text-sm leading-relaxed ${
                              book.description
                                ? "text-gray-700 dark:text-gray-300"
                                : "text-gray-400 dark:text-gray-500 italic"
                            }`}>
                              {book.description || "No description added yet."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
          </tbody>
        </table>

        {!showSkeleton && books.length === 0 && (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">No books found</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-2 gap-4">

        {/* Left: total count */}
        <div className="w-32 text-sm text-gray-500 dark:text-gray-400">
          {!isAtlasSearch && totalBooks > 0 && (
            <span>{totalBooks} {totalBooks === 1 ? "book" : "books"}</span>
          )}
        </div>

        {/* Centre: page numbers (browse + filter mode) or prev/next (Atlas Search) */}
        <div className="flex items-center gap-1">
          {!isAtlasSearch && totalPages > 1 && (
            <>
              <button disabled={currentPage === 1 || isPaging} onClick={() => goToPage(currentPage - 1)}
                className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 disabled:opacity-50 transition text-sm">
                ←
              </button>
              {buildPageNumbers(currentPage, totalPages).map((page, idx) =>
                page === "..." ? (
                  <span key={`e-${idx}`} className="px-2 py-2 text-gray-400 text-sm">…</span>
                ) : (
                  <button key={page} disabled={isPaging} onClick={() => goToPage(page)}
                    className={`px-3 py-2 rounded-lg transition text-sm ${page === currentPage
                      ? "bg-blue-600 text-white font-semibold"
                      : "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500"
                    } disabled:opacity-50`}>
                    {page}
                  </button>
                )
              )}
              <button disabled={currentPage === totalPages || isPaging} onClick={() => goToPage(currentPage + 1)}
                className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 disabled:opacity-50 transition text-sm">
                →
              </button>
            </>
          )}

          {isAtlasSearch && (
            <>
              <button
                disabled={searchPrevCursors.length === 0 || isPaging}
                onClick={() => {
                  const stack = [...searchPrevCursors];
                  stack.pop();
                  const cursor = stack.length ? stack[stack.length - 1] : null;
                  setSearchPrevCursors(stack);
                  setIsPaging(true);
                  fetchSearch(search, activeFilters, cursor, "prev");
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 disabled:opacity-50 text-sm"
              >
                {isPaging ? "Loading..." : "Previous"}
              </button>
              <button
                disabled={!searchCursor || isPaging}
                onClick={() => {
                  setIsPaging(true);
                  fetchSearch(search, activeFilters, searchCursor, "next");
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 text-sm"
              >
                {isPaging ? "Loading..." : "Next"}
              </button>
            </>
          )}
        </div>

        {/* Right: per page */}
        <div className="flex items-center gap-2 w-32 justify-end">
          <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">Per page</span>
          <select
            value={limit}
            onChange={(e) => {
              const newLimit = Number(e.target.value);
              setLimit(newLimit);
              const filters = { house: filterHouse, genre: filterGenre, status: filterStatus };
              setSearchCursor(null);
              setSearchPrevCursors([]);
              setExpandedId(null);
              if (search.trim()) {
                fetchSearch(search, filters, null, "next", newLimit);
              } else {
                fetchBooks(1, false, newLimit, sortBy, sortOrder, filters);
              }
            }}
            className="px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
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
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
              {isEditing ? "Edit Book" : "Add Book"}
            </h2>

            {modalError && <div className="text-red-500 text-sm mb-3">{modalError}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Title" value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm" />

              <input type="text" placeholder="Author" value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white text-sm" />

              {/* House */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Select House</label>
                <div className="flex flex-wrap gap-2">
                  {housesData.map((house) => (
                    <button type="button" key={house} onClick={() => setFormData({ ...formData, house })}
                      className={`px-3 py-1 rounded-full text-sm ${formData.house === house
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
                      {house}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Select Genre</label>
                <div className="flex flex-wrap gap-2">
                  {genresData.map((genre) => {
                    const isSelected = formData.genre.includes(genre);
                    return (
                      <button type="button" key={genre}
                        onClick={() => setFormData({
                          ...formData,
                          genre: isSelected ? formData.genre.filter((g) => g !== genre) : [...formData.genre, genre]
                        })}
                        className={`px-3 py-1 rounded-full text-sm ${isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description — edit only */}
              {isEditing && (
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    placeholder="Add a note or description..."
                    value={formData.description}
                    onChange={(e) => { if (e.target.value.length <= 1000) setFormData({ ...formData, description: e.target.value }); }}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:text-white resize-none text-sm"
                  />
                  <div className="text-right text-xs text-gray-400 mt-1">{formData.description?.length || 0} / 1000</div>
                </div>
              )}

              {/* Status — edit only */}
              {isEditing && (
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">My Status</label>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <button type="button" key={s}
                        onClick={() => setFormData({ ...formData, userStatus: formData.userStatus === s ? null : s })}
                        className={`px-3 py-1 rounded-full text-sm ${formData.userStatus === s
                          ? STATUS_STYLES[s] + " ring-2 ring-offset-1 ring-current"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  {formData.userStatus && (
                    <button type="button" onClick={() => setFormData({ ...formData, userStatus: null })}
                      className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
                      Clear status
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 dark:text-white text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">
                  {isEditing ? "Update Book" : "Add Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">Delete Book</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-100">{deletingBookTitle}</span>?
              {" "}This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 dark:text-white text-sm">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}