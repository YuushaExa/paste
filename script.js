document.addEventListener('DOMContentLoaded', () => {
    const addFolderButton = document.getElementById('add-folder');
    const folderList = document.getElementById('folder-list');
    const boardCanvas = document.getElementById('board-canvas');
    const currentFolderNameDiv = document.getElementById('CurrentFolderName');
    let currentFolder = 'Default';

    // Initialize Dexie database
    const db = new Dexie('todo');
    db.version(1).stores({
        folders: 'name',
        notes: '++id, folder, column'
    });

    // Set up canvas context
    const ctx = boardCanvas.getContext('2d');
    const gridSize = 20;

    function drawGrid() {
        const width = boardCanvas.width;
        const height = boardCanvas.height;

        ctx.clearRect(0, 0, width, height);

        ctx.beginPath();
        for (let x = 0; x <= width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.strokeStyle = '#ccc';
        ctx.stroke();
    }

    function resizeCanvas() {
        boardCanvas.width = boardCanvas.clientWidth;
        boardCanvas.height = boardCanvas.clientHeight;
        drawGrid();
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

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
        clearNotes();
        db.notes.where({ folder: folderName }).each(note => {
            const noteElement = createNoteElement(note.content, note.id, note.x, note.y);
            document.body.appendChild(noteElement);
        });
    }

    function clearNotes() {
        const existingNotes = document.querySelectorAll('.note');
        existingNotes.forEach(note => note.remove());
    }

    function saveNotes() {
        const notes = document.querySelectorAll('.note');
        const noteData = Array.from(notes).map(note => ({
            id: parseInt(note.dataset.noteId, 10),
            folder: currentFolder,
            content: note.querySelector('span').textContent.trim(),
            x: parseInt(note.style.left, 10),
            y: parseInt(note.style.top, 10)
        }));

        db.transaction('rw', db.notes, () => {
            db.notes.where({ folder: currentFolder }).delete();
            db.notes.bulkPut(noteData);
        });
    }

    function createNoteElement(content, id, x = 0, y = 0) {
        const note = document.createElement('div');
        note.classList.add('note');
        note.setAttribute('draggable', 'true');
        note.dataset.noteId = id;
        note.style.left = `${x}px`;
        note.style.top = `${y}px`;

        note.addEventListener('dragstart', drag);
        note.addEventListener('dragend', dragEnd);

        const noteText = document.createElement('span');
        noteText.textContent = content;
        noteText.setAttribute('contenteditable', 'false');
        noteText.addEventListener('click', (event) => {
            noteText.setAttribute('contenteditable', 'true');
            noteText.focus();
            event.stopPropagation();
        });
        noteText.addEventListener('blur', () => {
            noteText.setAttribute('contenteditable', 'false');
            saveNotes();
        });

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-note');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', deleteNote);

        note.appendChild(noteText);
        note.appendChild(deleteButton);
        return note;
    }

    function addNote() {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        const newNote = createNoteElement('New Note', id);
        newNote.style.left = '10px';
        newNote.style.top = '10px';
        document.body.appendChild(newNote);
        saveNotes();
    }

    function allowDrop(event) {
        event.preventDefault();
    }

    function drag(event) {
        event.dataTransfer.setData('text/plain', event.target.dataset.noteId);
        event.target.classList.add('dragging');
    }

    function dragEnd(event) {
        const note = event.target;
        note.classList.remove('dragging');
        const gridX = Math.round(parseInt(note.style.left, 10) / gridSize) * gridSize;
        const gridY = Math.round(parseInt(note.style.top, 10) / gridSize) * gridSize;
        note.style.left = `${gridX}px`;
        note.style.top = `${gridY}px`;
        saveNotes();
    }

    function drop(event) {
        event.preventDefault();
        const noteId = event.dataTransfer.getData('text/plain');
        const note = document.querySelector(`.note[data-note-id="${noteId}"]`);
        const rect = boardCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        note.style.left = `${x}px`;
        note.style.top = `${y}px`;
        dragEnd({ target: note });
    }

    function deleteNote() {
        const note = this.parentElement;
        note.remove();
        saveNotes();
    }

    boardCanvas.addEventListener('dragover', allowDrop);
    boardCanvas.addEventListener('drop', drop);

    // Initial setup
    window.addEventListener('load', () => {
        resizeCanvas();
        drawGrid();
    });
});
