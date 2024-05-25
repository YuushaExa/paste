document.addEventListener('DOMContentLoaded', () => {
    const addNoteButtons = document.querySelectorAll('.add-note');
    const columns = document.querySelectorAll('.column');
    const addFolderButton = document.getElementById('add-folder');
    const folderList = document.getElementById('folder-list');
    let currentFolder = 'default';

    // Initialize IndexedDB
    let db;
    const request = indexedDB.open('todo', 1);

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains('folders')) {
            const folderStore = db.createObjectStore('folders', { keyPath: 'name' });
            folderStore.createIndex('name', 'name', { unique: true });
        }
        if (!db.objectStoreNames.contains('notes')) {
            const noteStore = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
            noteStore.createIndex('folder_column', ['folder', 'column'], { unique: false });
        }
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        loadFolders();
        loadNotes(currentFolder);
    };

    request.onerror = function(event) {
        console.error('Database error:', event.target.errorCode);
    };

    addNoteButtons.forEach(button => {
        button.addEventListener('click', addNote);
    });

    columns.forEach(column => {
        column.addEventListener('dragover', allowDrop);
        column.addEventListener('drop', drop);
    });

    addFolderButton.addEventListener('click', createFolder);

    function createFolder() {
        const folderName = prompt('Enter folder name:');
        if (folderName) {
            const transaction = db.transaction(['folders'], 'readwrite');
            const folderStore = transaction.objectStore('folders');
            folderStore.add({ name: folderName }).onsuccess = () => {
                loadFolders();
            };
        }
    }

    function loadFolders() {
        folderList.innerHTML = '';
        const transaction = db.transaction(['folders'], 'readonly');
        const folderStore = transaction.objectStore('folders');
        folderStore.openCursor().onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                const li = document.createElement('li');
                li.textContent = cursor.value.name;
                li.dataset.folderName = cursor.value.name;
                li.addEventListener('click', () => {
                    currentFolder = cursor.value.name;
                    loadNotes(currentFolder);
                });
                folderList.appendChild(li);
                cursor.continue();
            }
        };
    }

    function loadNotes(folderName) {
        const columns = document.querySelectorAll('.column');
        columns.forEach(column => {
            column.querySelectorAll('.note').forEach(note => note.remove());
            const columnName = column.getAttribute('data-column');
            const transaction = db.transaction(['notes'], 'readonly');
            const noteStore = transaction.objectStore('notes');
            const index = noteStore.index('folder_column');
            index.openCursor(IDBKeyRange.only([folderName, columnName])).onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    const note = createNoteElement(cursor.value.content);
                    column.insertBefore(note, column.querySelector('.add-note'));
                    cursor.continue();
                }
            };
        });
    }

    function saveNotes() {
        const columns = document.querySelectorAll('.column');
        columns.forEach(column => {
            const columnName = column.getAttribute('data-column');
            const notes = Array.from(column.querySelectorAll('.note')).map(note => note.textContent.replace('Delete', '').trim());
            const transaction = db.transaction(['notes'], 'readwrite');
            const noteStore = transaction.objectStore('notes');
            noteStore.index('folder_column').openCursor(IDBKeyRange.only([currentFolder, columnName])).onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
            notes.forEach(noteContent => {
                noteStore.add({ folder: currentFolder, column: columnName, content: noteContent });
            });
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
});
