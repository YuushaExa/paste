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
            const draggingRect = draggingElement.getBoundingClientRect();
            const targetRect = targetNote.getBoundingClientRect();

            // Calculate the area of intersection
            const intersection = {
                top: Math.max(draggingRect.top, targetRect.top),
                bottom: Math.min(draggingRect.bottom, targetRect.bottom),
                left: Math.max(draggingRect.left, targetRect.left),
                right: Math.min(draggingRect.right, targetRect.right)
            };

            const draggingArea = (draggingRect.bottom - draggingRect.top) * (draggingRect.right - draggingRect.left);
            const intersectionArea = Math.max(0, intersection.bottom - intersection.top) * Math.max(0, intersection.right - intersection.left);

            // If the intersection area is more than 20% of the dragging note's area, perform the replacement
            if (intersectionArea / draggingArea > 0.2) {
                // Calculate the offset for animation
                const deltaX = targetRect.left - draggingRect.left;
                const deltaY = targetRect.top - draggingRect.top;

                // Clone the dragging element to create a temporary animation element
                const animatingElement = draggingElement.cloneNode(true);
                animatingElement.style.position = 'absolute';
                animatingElement.style.zIndex = 1000;
                animatingElement.style.left = `${draggingRect.left}px`;
                animatingElement.style.top = `${draggingRect.top}px`;
                document.body.appendChild(animatingElement);

                // Animate the movement
                animatingElement.animate([
                    { transform: 'translate(0, 0)' },
                    { transform: `translate(${deltaX}px, ${deltaY}px)` }
                ], {
                    duration: 300,
                    easing: 'ease-out'
                }).onfinish = () => {
                    column.insertBefore(draggingElement, targetNote);
                    column.querySelectorAll('.note').forEach(note => note.classList.remove('dragging')); // Ensure no notes are dragging
                    document.body.removeChild(animatingElement); // Remove the temporary animation element
                    saveNotes();
                };
                
                return;
            }
        }
    }
}

// You should also ensure that .dragging class is added to the note being dragged in your dragstart handler
document.addEventListener('dragstart', (event) => {
    const note = event.target.closest('.note');
    if (note) {
        note.classList.add('dragging');
    }
});

document.addEventListener('dragend', (event) => {
    const note = event.target.closest('.note');
    if (note) {
        note.classList.remove('dragging');
    }
});


function drop(event) {
    event.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    const column = event.target.closest('.column');
    if (draggingElement && column) {
        draggingElement.classList.remove('dragging');
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
