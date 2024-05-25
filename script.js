document.addEventListener('DOMContentLoaded', () => {
    const addFolderButton = document.getElementById('add-folder');
    const folderList = document.getElementById('folder-list');
    const boardContainer = document.getElementById('board-container');
    const currentFolderNameDiv = document.getElementById('CurrentFolderName');
    let currentFolder = 'Default';

    // Initialize Dexie database
    const db = new Dexie('todo');
    db.version(1).stores({
        folders: 'name',
        notes: '++id, folder, column'
    });

    // Load folders and notes
    loadFolders(() => {
        db.folders.get(currentFolder).then(folder => {
            if (!folder) {
                createFolder('Default').then(() => loadNotes(currentFolder));
            } else {
                loadNotes(currentFolder);
            }
        });
    });

    addFolderButton.addEventListener('click', () => {
        const folderName = prompt('Enter folder name:');
        if (folderName) {
            createFolder(folderName).then(() => loadFolders(() => {
                currentFolder = folderName;
                updateCurrentFolderName();
                loadNotes(currentFolder);
            }));
        }
    });

    function updateCurrentFolderName() {
        currentFolderNameDiv.textContent = `Current Folder: ${currentFolder}`;
    }

    function createFolder(folderName) {
        return db.folders.add({ name: folderName });
    }

    function loadFolders(callback) {
        folderList.innerHTML = '';
        db.folders.each(folder => {
            const li = document.createElement('li');
            li.textContent = folder.name;
            li.dataset.folderName = folder.name;
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => {
                currentFolder = folder.name;
                updateCurrentFolderName();
                loadNotes(currentFolder);
            });
            folderList.appendChild(li);
        }).then(callback);
    }

    function loadNotes(folderName) {
        boardContainer.innerHTML = `
            <div class="board">
                <div class="column" data-column="todo">
                    <div class="column-header">To Do</div>
                    <button class="add-note">Add Note</button>
                </div>
                <div class="column" data-column="in-progress">
                    <div class="column-header">In Progress</div>
                    <button class="add-note">Add Note</button>
                </div>
                <div class="column" data-column="done">
                    <div class="column-header">Done</div>
                    <button class="add-note">Add Note</button>
                </div>
            </div>
        `;

        const addNoteButtons = document.querySelectorAll('.add-note');
        const columns = document.querySelectorAll('.column');

        addNoteButtons.forEach(button => {
            button.addEventListener('click', addNote);
        });

        columns.forEach(column => {
            column.addEventListener('dragover', allowDrop);
            column.addEventListener('drop', drop);
        });

        db.notes.where({ folder: folderName }).each(note => {
            const column = document.querySelector(`.column[data-column="${note.column}"]`);
            const noteElement = createNoteElement(note.content, note.id);
            column.insertBefore(noteElement, column.querySelector('.add-note'));
        });
    }

    function saveNotes() {
        const columns = document.querySelectorAll('.column');

        columns.forEach(column => {
            const columnName = column.getAttribute('data-column');
            const notes = Array.from(column.querySelectorAll('.note')).map(note => ({
                id: parseInt(note.dataset.noteId, 10),
                folder: currentFolder,
                column: columnName,
                content: note.querySelector('span').textContent.trim()
            }));
            
            db.transaction('rw', db.notes, () => {
                db.notes.where({ folder: currentFolder, column: columnName }).delete();
                db.notes.bulkPut(notes);
            });
        });
    }

function createNoteElement(content, id) {
    const note = document.createElement('div');
    note.classList.add('note');
    note.setAttribute('draggable', 'true');
    note.dataset.noteId = id;
    note.addEventListener('dragstart', drag);
    note.addEventListener('dragend', dragEnd);
    
    const noteText = document.createElement('span');
    noteText.textContent = content;
    note.appendChild(noteText);

    // Add click event listener to the note itself
    note.addEventListener('click', (event) => {
        const clickedElement = event.target;
        if (clickedElement === noteText) {
            // Make the content editable only if the click occurred on the text
            noteText.setAttribute('contenteditable', 'true');
            noteText.focus(); // Optionally focus on the text for better user experience
        }
    });

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-note');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', deleteNote);

    note.appendChild(deleteButton);
    return note;
}


    function addNote() {
        const column = this.parentElement;
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        const newNote = createNoteElement('New Note', id);
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
});
