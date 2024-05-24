document.addEventListener('DOMContentLoaded', () => {
    const addNoteButtons = document.querySelectorAll('.add-note');
    const columns = document.querySelectorAll('.column');

    // Disable dragging for add-note buttons
    addNoteButtons.forEach(button => button.setAttribute('draggable', 'false'));

    // Load existing notes from local storage
    loadNotes();

    // Set up event listeners
    addNoteButtons.forEach(button => button.addEventListener('click', addNote));
    columns.forEach(column => {
        column.addEventListener('dragover', allowDrop);
        column.addEventListener('drop', drop);
    });

    // Close all editable notes when clicking outside
    document.body.addEventListener('click', closeEditableNotes);
});

function loadNotes() {
    document.querySelectorAll('.column').forEach(column => {
        const columnName = column.getAttribute('data-column');
        const notes = JSON.parse(localStorage.getItem(columnName) || '[]');
        notes.forEach(noteContent => {
            column.insertBefore(createNoteElement(noteContent), column.querySelector('.add-note'));
        });
    });
}

function saveNotes() {
    document.querySelectorAll('.column').forEach(column => {
        const columnName = column.getAttribute('data-column');
        const notes = Array.from(column.querySelectorAll('.note')).map(note => note.querySelector('.note-text').textContent.trim());
        localStorage.setItem(columnName, JSON.stringify(notes));
    });
}

function createNoteElement(content) {
    const note = document.createElement('div');
    note.classList.add('note');
    note.setAttribute('draggable', 'true');
    note.addEventListener('dragstart', drag);

    const moveIconWrapper = document.createElement('div');
    moveIconWrapper.classList.add('move-icon-wrapper');

    const icon = document.createElement('img');
    icon.src = 'arrows-move.svg';
    icon.alt = 'Move';
    icon.classList.add('icon');

    const noteText = document.createElement('span');
    noteText.classList.add('note-text');
    noteText.textContent = content;
    noteText.addEventListener('click', (event) => {
        event.stopPropagation();
        makeEditable(noteText);
    });

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-note');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', deleteNote);

    moveIconWrapper.appendChild(icon);
    note.append(moveIconWrapper, noteText, deleteButton);

    setDraggable([moveIconWrapper, icon, noteText, deleteButton], false);

    return note;
}

function setDraggable(elements, draggable) {
    elements.forEach(element => element.setAttribute('draggable', draggable));
}

function makeEditable(element) {
    element.contentEditable = 'true';
    element.focus();
    element.addEventListener('blur', () => {
        element.contentEditable = 'false';
        saveNotes();
    }, { once: true });
}

function addNote() {
    const todoColumn = document.querySelector('.column[data-column="todo"]');
    if (todoColumn) {
        const newNote = createNoteElement('New Note');
        todoColumn.insertBefore(newNote, todoColumn.querySelector('.add-note'));
        saveNotes();
    } else {
        alert('The "To Do" column does not exist.');
    }
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
    this.closest('.note').remove();
    saveNotes();
}

function closeEditableNotes(event) {
    if (!event.target.classList.contains('note-text')) {
        document.querySelectorAll('.note-text').forEach(noteText => {
            if (noteText.contentEditable === 'true') {
                noteText.contentEditable = 'false';
            }
        });
        saveNotes();
    }
}
