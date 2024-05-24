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
function drag(event) {
    event.dataTransfer.setData('text/plain', event.target.innerHTML);
    event.target.classList.add('dragging');
}
function allowDrop(event) {
    event.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    const targetNote = event.target.closest('.note');
    if (draggingElement && targetNote && targetNote !== draggingElement) {
        const column = event.target.closest('.column');
        const notes = Array.from(column.querySelectorAll('.note'));
        const draggingIndex = notes.indexOf(draggingElement);
        const targetIndex = notes.indexOf(targetNote);
        if (draggingIndex !== -1 && targetIndex !== -1 && draggingIndex !== targetIndex) {
            targetNote.classList.add('bounce');
            setTimeout(() => {
                targetNote.classList.remove('bounce');
            }, 500); // Remove bounce effect after 0.5 seconds
        }
    }
}

function drop(event) {
    event.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    const column = event.target.closest('.column');
    if (draggingElement && column) {
        const targetNote = event.target.closest('.note');
        draggingElement.classList.remove('dragging');
        const dropPosition = getDropPosition(event.clientY, column);
        if (dropPosition === 'before') {
            column.insertBefore(draggingElement, targetNote);
        } else if (dropPosition === 'after') {
            column.insertBefore(draggingElement, targetNote.nextElementSibling);
        } else {
            column.appendChild(draggingElement); // Append the dragging element at the end of the column
        }
        column.querySelectorAll('.note').forEach(note => note.classList.remove('bounce')); // Remove bounce effect from all notes
        saveNotes();
    }
}

function getDropPosition(clientY, column) {
    const notes = Array.from(column.querySelectorAll('.note'));
    const lastNote = notes[notes.length - 1];
    const lastNoteRect = lastNote.getBoundingClientRect();
    if (clientY > lastNoteRect.bottom) {
        return 'after'; // Drop after the last note
    } else {
        return 'before'; // Drop before the last note
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
