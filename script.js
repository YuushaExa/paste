document.addEventListener('DOMContentLoaded', () => {
    const addNoteButtons = document.querySelectorAll('.add-note');
    const columns = document.querySelectorAll('.column');

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
    note.addEventListener('dragend', dragEnd);

    const noteText = document.createElement('span');
    noteText.textContent = content;
    noteText.setAttribute('contenteditable', 'true');
    noteText.addEventListener('input', saveNotes); // Save on input change

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-note');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', deleteNote);

    note.appendChild(noteText);
    note.appendChild(deleteButton);
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
    const draggingElement = document.querySelector('.dragging');
    const targetElement = event.target;

    if (draggingElement && targetElement && targetElement.classList.contains('note')) {
        const bounding = targetElement.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        if (event.clientY - offset > 0) {
            targetElement.style['border-bottom'] = '2px solid #000';
            targetElement.style['border-top'] = '';
        } else {
            targetElement.style['border-top'] = '2px solid #000';
            targetElement.style['border-bottom'] = '';
        }
    }
}

function drag(event) {
    event.dataTransfer.setData('text/plain', event.target.innerHTML);
    event.target.classList.add('dragging');
}

function dragEnd(event) {
    const notes = document.querySelectorAll('.note');
    notes.forEach(note => {
        note.style['border-top'] = '';
        note.style['border-bottom'] = '';
    });
}

function drop(event) {
    event.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    const targetElement = event.target;

    if (draggingElement) {
        draggingElement.classList.remove('dragging');
        
        const column = targetElement.closest('.column');
        let referenceNode = column.querySelector('.add-note');

        if (targetElement && targetElement.classList.contains('note')) {
            const bounding = targetElement.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            if (event.clientY - offset > 0) {
                referenceNode = targetElement.nextSibling;
            } else {
                referenceNode = targetElement;
            }
        }

        column.insertBefore(draggingElement, referenceNode);
        saveNotes();
    }
}

function deleteNote() {
    const note = this.parentElement;
    note.parentElement.removeChild(note);
    saveNotes();
}
