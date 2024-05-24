document.addEventListener('DOMContentLoaded', () => {
    const addNoteButtons = document.querySelectorAll('.add-note');
    const columns = document.querySelectorAll('.column');

    // Set the add-note buttons to be undraggable
    addNoteButtons.forEach(button => {
        button.setAttribute('draggable', 'false');
    });

    // Load notes from local storage
    loadNotes();

    addNoteButtons.forEach(button => {
        button.addEventListener('click', addNote);
    });

    columns.forEach(column => {
        column.addEventListener('dragover', allowDrop);
        column.addEventListener('drop', drop);
    });
});

function loadNotes() {
    const columns = document.querySelectorAll('.column');
    columns.forEach(column => {
        const columnName = column.getAttribute('data-column');
        const notes = JSON.parse(localStorage.getItem(columnName) || '[]');
        notes.forEach(noteContent => {
            const note = createNoteElement(noteContent);
            column.insertBefore(note, column.querySelector('.add-note'));
        });
    });
}

function saveNotes() {
    const columns = document.querySelectorAll('.column');
    columns.forEach(column => {
        const columnName = column.getAttribute('data-column');
        const notes = Array.from(column.querySelectorAll('.note')).map(note => note.textContent.replace('Delete', '').trim());
        localStorage.setItem(columnName, JSON.stringify(notes));
    });
}

function createNoteElement(content) {
    const note = document.createElement('div');
    note.classList.add('note');
    note.setAttribute('draggable', 'true');
    note.addEventListener('dragstart', drag);

    const moveIconWrapper = document.createElement('div'); // Wrapper for the move icon
    moveIconWrapper.classList.add('move-icon-wrapper');
    
    const icon = document.createElement('img');
    icon.setAttribute('src', 'arrows-move.svg');
    icon.setAttribute('alt', 'Move');
    icon.classList.add('icon');

    moveIconWrapper.appendChild(icon); // Append the icon to the wrapper

    const noteText = document.createElement('span');
    noteText.textContent = content;
    noteText.setAttribute('contenteditable', 'true');
    noteText.addEventListener('input', saveNotes); // Save on input change

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-note');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', deleteNote);

    note.appendChild(moveIconWrapper); // Append the move icon wrapper to the note
    note.appendChild(noteText);
    note.appendChild(deleteButton);

    moveIconWrapper.setAttribute('draggable', 'false'); // Set draggable attribute to false
    icon.setAttribute('draggable', 'false');
    noteText.setAttribute('draggable', 'false');
    deleteButton.setAttribute('draggable', 'false');
    
    return note;
}

function addNote() {
    const column = this.parentElement;
    const newNote = createNoteElement('New Note');
    column.insertBefore(newNote, this);
    saveNotes();
}

function allowDrop(event) {
    event.preventDefault();
}

function drag(event) {
    event.dataTransfer.setData('text/plain', event.target.innerHTML);
    event.target.classList.add('dragging');
}

function drop(event) {
    event.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    const column = event.target.closest('.column');
    if (draggingElement && column) {
        draggingElement.classList.remove('dragging');
        column.insertBefore(draggingElement, event.target.closest('.note'));
        saveNotes();
    }
}

function deleteNote() {
    const note = this.parentElement;
    note.parentElement.removeChild(note);
    saveNotes();
}
