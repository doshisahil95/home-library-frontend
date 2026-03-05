import { useState, useEffect, useRef } from "react";
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

export default function Books() {
  const [books, setBooks] = useState([]);

  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("title");

  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  const loadStartTime = useRef(null);
  const debounceTimer = useRef(null);

  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [deletingId, setDeletingId] = useState(null);

  const emptyForm = {
    title: "",
    author: "",
    house: "",
    genre: [],
  };

  const [formData, setFormData] = useState(emptyForm);

  // FETCH BOOKS (forceAll = true loads all books, ignoring search)
  const fetchBooks = async (forceAll = false) => {
    try {
      loadStartTime.current = Date.now();

      // ❌ REMOVE THIS (it causes flashing)
      // if (initialLoad) setLoading(true);

      setError("");

      let result;

      if (!forceAll && search.trim()) {
        result = await searchBooks(search, searchField);
      } else {
        result = await apiFetchBooks();
      }

      setBooks(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch books");
      toast.error("Failed to fetch books");
    } finally {
      const elapsed = Date.now() - loadStartTime.current;
      const remaining = 300 - elapsed;

      const finish = () => {
        setLoading(false);
        setInitialLoad(false);
      };

      if (remaining > 0) {
        setTimeout(finish, remaining);
      } else {
        finish();
      }
    }
  };

  useEffect(() => {
    fetchBooks(true);
  }, []);

  // SEARCH DEBOUNCE
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      if (search.trim()) {
        fetchBooks();
      } else {
        fetchBooks(true);
      }
    }, 400);

    return () => clearTimeout(debounceTimer.current);
  }, [search, searchField]);

  // ADD / EDIT BOOK
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.author.trim() ||
      !formData.house ||
      formData.genre.length === 0
    ) {
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

      await fetchBooks(true);
      closeModal();
    } catch (err) {
      setModalError(err.message || "Operation failed");
      toast.error(err.message || "Operation failed");
    }
  };

  // OPEN EDIT MODAL
  const openEditModal = (book) => {
    setFormData({
      title: book.title,
      author: book.author,
      house: book.house,
      genre: book.genre || [],
    });

    setCurrentId(book._id);
    setIsEditing(true);
    setModalError("");
    setShowModal(true);
  };

  // DELETE FLOW
  const openDeleteModal = (id) => {
    setCurrentId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const id = currentId;

    setShowDeleteModal(false);

    const previousBooks = books;
    setBooks((prev) => prev.filter((b) => b._id !== id));

    try {
      setDeletingId(id);
      await deleteBook(id);
      toast.success("Book deleted");
    } catch (err) {
      setBooks(previousBooks);
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  // MODAL CONTROLS
  const openAddModal = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setCurrentId(null);
    setModalError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData(emptyForm);
    setIsEditing(false);
    setCurrentId(null);
    setModalError("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          Books
        </h1>

        <button
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Add Book
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder={`Search by ${searchField}`}
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);

              if (value === "") {
                fetchBooks(true);
              }
            }}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 
              dark:border-gray-600 bg-white dark:bg-gray-700 
              text-gray-800 dark:text-gray-100"
          />
        </div>

        <select
          value={searchField}
          onChange={(e) => {
            setSearchField(e.target.value);
            fetchBooks();
          }}
          className="px-3 py-2 rounded-lg border border-gray-300 
            dark:border-gray-600 bg-white dark:bg-gray-700 
            text-gray-800 dark:text-gray-100"
        >
          <option value="title">Title</option>
          <option value="author">Author</option>
          <option value="house">House</option>
          <option value="genre">Genre</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setSearch("");
            fetchBooks(true);
          }}
          disabled={search.length === 0}
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 
            text-gray-800 dark:text-gray-100 
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <table className="min-w-full table-fixed text-left">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            <tr>
              <th className="px-6 py-3 w-2/6">Title</th>
              <th className="px-6 py-3 w-1/5">Author</th>
              <th className="px-6 py-3 w-1/5">House</th>
              <th className="px-6 py-3 w-1/5">Genre</th>
              <th className="px-6 py-3 w-1/5 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading &&
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="h-4 w-40 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-32 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-20 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-24 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 w-16 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse ml-auto"></div>
                  </td>
                </tr>
              ))}

            {!loading &&
              books.map((book) => (
                <tr
                  key={book._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <td className="px-6 py-4 text-gray-800 dark:text-gray-100 truncate">
                    {book.title}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 truncate">
                    {book.author}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 truncate">
                    {book.house}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {book.genre?.map((g, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(book)}
                        className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 
                          text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300"
                      >
                        Edit
                      </button>

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

        {!loading && books.length === 0 && (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">
            No books found
          </div>
        )}
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
              Are you sure you want to delete this book? This action cannot be
              undone.
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