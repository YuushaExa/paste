document.addEventListener('DOMContentLoaded', () => {
    const addFolderButton = document.getElementById('add-folder');
    const folderList = document.getElementById('folder-list');
    const boardContainer = document.getElementById('board-container');
    const currentFolderNameDiv = document.getElementById('CurrentFolderName');
    let currentFolder = 'Default';

    // Initialize IndexedDB
    let db;
    const request = indexedDB.open('todo', 1);

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains('folders')) {
            db.createObjectStore('folders', { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains('notes')) {
            const noteStore = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
            noteStore.createIndex('folder_column', ['folder', 'column'], { unique: false });
        }
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        loadFolders(() => {
            folderExists(currentFolder).then(exists => {
                if (!exists) {
                    createFolder('Default').then(() => loadNotes(currentFolder));
                } else {
                    loadNotes(currentFolder);
                }
            });
        });
    };

    request.onerror = function(event) {
        console.error('Database error:', event.target.errorCode);
    };

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

    function folderExists(folderName) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['folders'], 'readonly');
            const folderStore = transaction.objectStore('folders');
            const request = folderStore.get(folderName);

            request.onsuccess = function(event) {
                resolve(event.target.result !== undefined);
            };

            request.onerror = function(event) {
                reject(event.target.error);
            };
        });
    }

    function createFolder(folderName) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['folders'], 'readwrite');
            const folderStore = transaction.objectStore('folders');
            const request = folderStore.add({ name: folderName });

            request.onsuccess = function() {
                resolve();
            };

            request.onerror = function(event) {
                console.error('Folder creation error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    function loadFolders(callback) {
        folderList.innerHTML = '';
        const transaction = db.transaction(['folders'], 'readonly');
        const folderStore = transaction.objectStore('folders');
        folderStore.openCursor().onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                const li = document.createElement('li');
                li.textContent = cursor.value.name;
                li.dataset.folderName = cursor.value.name;
                li.style.cursor = 'pointer';
                li.addEventListener('click', () => {
                    currentFolder = cursor.value.name;
                    updateCurrentFolderName();
                    loadNotes(currentFolder);
                });
                folderList.appendChild(li);
                cursor.continue();
            } else if (callback) {
                callback();
            }
        };
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

        const transaction = db.transaction(['notes'], 'readonly');
        const noteStore = transaction.objectStore('notes');
        const index = noteStore.index('folder_column');

        columns.forEach(column => {
            const columnName = column.getAttribute('data-column');
            const request = index.openCursor(IDBKeyRange.only([folderName, columnName]));
            request.onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    const note = createNoteElement(cursor.value.content, cursor.value.id);
                    column.insertBefore(note, column.querySelector('.add-note'));
                    cursor.continue();
                }
            };
        });
    }

    function saveNotes() {
        const columns = document.querySelectorAll('.column');
        const transaction = db.transaction(['notes'], 'readwrite');
        const noteStore = transaction.objectStore('notes');

        // Save new notes
        columns.forEach(column => {
            const columnName = column.getAttribute('data-column');
            const notes = Array.from(column.querySelectorAll('.note')).map(note => ({
                folder: currentFolder,
                column: columnName,
                content: note.querySelector('span').textContent,
                id: note.dataset.noteId ? parseInt(note.dataset.noteId) : undefined
            }));
            notes.forEach(note => {
                if (note.id) {
                    noteStore.put(note);
                } else {
                    delete note.id;  // Let the ID be auto-incremented
                    noteStore.add(note);
                }
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
        noteText.setAttribute('contenteditable', 'true');
        noteText.addEventListener('input', saveNotes);

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
    const noteId = parseInt(note.dataset.noteId); // Get the ID of the note

    // Remove the note from IndexedDB
    const transaction = db.transaction(['notes'], 'readwrite');
    const noteStore = transaction.objectStore('notes');
    noteStore.delete(noteId); // Delete the note from IndexedDB using its ID

    // Remove the note from the DOM
    note.parentElement.removeChild(note);

    // Save the changes to IndexedDB
    transaction.oncomplete = () => {
        saveNotes();
    };
}

});
