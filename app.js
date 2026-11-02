// Offline Notes App - Step 5: Edit & Delete Notes with LocalStorage Persistence
const STORAGE_KEY = 'offline_notes_data';

// Helper: Read notes array from localStorage
function getSavedNotes() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : [];
  } catch (error) {
    console.error('Error reading notes from localStorage:', error);
    return [];
  }
}

// Helper: Save notes array to localStorage
function saveNotes(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch (error) {
    console.error('Error saving notes to localStorage:', error);
    return false;
  }
}

// Helper: Format ISO date string into readable date (e.g., Nov 2, 2026)
function formatDate(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return '';
  }
}

// Helper: Prevent HTML injection in user-entered titles/content
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const newNoteBtn = document.getElementById('new-note-btn');
  const searchInput = document.getElementById('search-input');
  const notesList = document.getElementById('notes-list');
  const emptyState = document.getElementById('empty-state');
  const noResultsState = document.getElementById('no-results-state');
  const noResultsText = document.getElementById('no-results-text');

  // Modal Elements
  const noteModal = document.getElementById('note-modal');
  const modalTitle = document.getElementById('modal-title');
  const cancelBtnTop = document.getElementById('cancel-btn-top');
  const cancelBtn = document.getElementById('cancel-btn');
  const deleteBtn = document.getElementById('delete-btn');
  const saveBtn = document.getElementById('save-btn');
  const noteForm = document.getElementById('note-form');
  const titleInput = document.getElementById('note-title-input');
  const contentInput = document.getElementById('note-content-input');
  const formError = document.getElementById('form-error');

  // Track ID of the note currently being edited (null = creating a new note)
  let currentEditingId = null;

  // Render notes onto the home screen with search filtering
  function renderNotes(query = '') {
    const allNotes = getSavedNotes();
    const cleanQuery = query.trim().toLowerCase();

    // Filter notes based on query in title or content
    const filteredNotes = cleanQuery
      ? allNotes.filter(note => {
          const titleMatch = (note.title || '').toLowerCase().includes(cleanQuery);
          const contentMatch = (note.content || '').toLowerCase().includes(cleanQuery);
          return titleMatch || contentMatch;
        })
      : allNotes;

    // Case 1: No notes exist at all in storage
    if (allNotes.length === 0) {
      emptyState.classList.remove('hidden');
      noResultsState.classList.add('hidden');
      notesList.innerHTML = '';
      return;
    }

    // Case 2: Notes exist, but none match the search query
    if (filteredNotes.length === 0) {
      emptyState.classList.add('hidden');
      noResultsState.classList.remove('hidden');
      noResultsText.textContent = `No notes found matching "${query.trim()}".`;
      notesList.innerHTML = '';
      return;
    }

    // Case 3: Render matching notes as cards
    emptyState.classList.add('hidden');
    noResultsState.classList.add('hidden');

    notesList.innerHTML = filteredNotes.map(note => {
      const title = escapeHtml(note.title || 'Untitled Note');
      const hasContent = Boolean(note.content && note.content.trim());
      const previewText = hasContent ? escapeHtml(note.content.trim()) : 'No additional text';
      const previewClass = hasContent ? 'note-card-preview' : 'note-card-preview is-empty';
      const dateDisplay = formatDate(note.createdAt);

      return `
        <article class="note-card" data-id="${note.id}" role="button" tabindex="0" aria-label="Edit note ${title}">
          <div class="note-card-header">
            <h3 class="note-card-title">${title}</h3>
            <span class="note-card-date">${dateDisplay}</span>
          </div>
          <p class="${previewClass}">${previewText}</p>
        </article>
      `;
    }).join('');
  }

  // Open modal in "Create New Note" mode
  function openNewNoteEditor() {
    currentEditingId = null;
    modalTitle.textContent = 'New Note';
    saveBtn.textContent = 'Save Note';
    deleteBtn.classList.add('hidden');

    noteForm.reset();
    formError.classList.add('hidden');
    noteModal.classList.remove('hidden');
    noteModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => titleInput.focus(), 50);
  }

  // Open modal in "Edit Existing Note" mode
  function openEditNoteEditor(noteId) {
    const notes = getSavedNotes();
    const noteToEdit = notes.find(n => n.id === noteId);

    if (!noteToEdit) return;

    currentEditingId = noteToEdit.id;
    modalTitle.textContent = 'Edit Note';
    saveBtn.textContent = 'Save Changes';
    deleteBtn.classList.remove('hidden');

    titleInput.value = noteToEdit.title || '';
    contentInput.value = noteToEdit.content || '';
    formError.classList.add('hidden');

    noteModal.classList.remove('hidden');
    noteModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => contentInput.focus(), 50);
  }

  // Close the Note Editor modal
  function closeEditor() {
    currentEditingId = null;
    noteModal.classList.add('hidden');
    noteModal.setAttribute('aria-hidden', 'true');
    noteForm.reset();
    formError.classList.add('hidden');
  }

  // Delete note with user confirmation
  function handleDeleteNote() {
    if (!currentEditingId) return;

    const confirmed = window.confirm('Are you sure you want to delete this note?');
    if (!confirmed) return;

    const notes = getSavedNotes();
    const updatedNotes = notes.filter(n => n.id !== currentEditingId);
    saveNotes(updatedNotes);

    closeEditor();
    renderNotes(searchInput.value);
  }

  // Save Note Handler (handles both Create and Edit)
  function handleSaveNote(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    // Validation: Ensure the note is not completely blank
    if (!title && !content) {
      formError.textContent = 'Please enter a title or note content.';
      formError.classList.remove('hidden');
      return;
    }

    const notes = getSavedNotes();

    if (currentEditingId) {
      // Edit existing note: update in place without duplicate
      const noteIndex = notes.findIndex(n => n.id === currentEditingId);
      if (noteIndex !== -1) {
        notes[noteIndex].title = title || 'Untitled Note';
        notes[noteIndex].content = content;
        notes[noteIndex].updatedAt = new Date().toISOString();
      }
    } else {
      // Create new note: prepend to beginning of array
      const newNote = {
        id: Date.now().toString(),
        title: title || 'Untitled Note',
        content: content,
        createdAt: new Date().toISOString()
      };
      notes.unshift(newNote);
    }

    saveNotes(notes);
    closeEditor();
    renderNotes(searchInput.value);
  }

  // Event Listeners
  newNoteBtn.addEventListener('click', openNewNoteEditor);
  cancelBtn.addEventListener('click', closeEditor);
  cancelBtnTop.addEventListener('click', closeEditor);
  deleteBtn.addEventListener('click', handleDeleteNote);
  noteForm.addEventListener('submit', handleSaveNote);

  // Tapping any note card opens it in the editor
  notesList.addEventListener('click', (event) => {
    const card = event.target.closest('.note-card');
    if (card && card.dataset.id) {
      openEditNoteEditor(card.dataset.id);
    }
  });

  // Keyboard navigation support for note cards (Enter or Space)
  notesList.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const card = event.target.closest('.note-card');
      if (card && card.dataset.id) {
        event.preventDefault();
        openEditNoteEditor(card.dataset.id);
      }
    }
  });

  // Close modal when tapping on background overlay
  noteModal.addEventListener('click', (event) => {
    if (event.target === noteModal) {
      closeEditor();
    }
  });

  // Real-time search filter
  searchInput.addEventListener('input', (event) => {
    renderNotes(event.target.value);
  });

  // Hide validation errors while typing
  titleInput.addEventListener('input', () => formError.classList.add('hidden'));
  contentInput.addEventListener('input', () => formError.classList.add('hidden'));

  // Initial render when app loads
  renderNotes();
});
