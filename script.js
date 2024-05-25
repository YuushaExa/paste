// Open a connection to the IndexedDB database
const request = indexedDB.open('MyDatabase', 1);
let db;

// Handle database upgrade or creation
request.onupgradeneeded = function(event) {
  const db = event.target.result;
  
  // Create an object store for folders and subfolders
  const folderStore = db.createObjectStore('folders', { keyPath: 'id', autoIncrement: true });
  folderStore.createIndex('name', 'name', { unique: true });
  
  const subfolderStore = db.createObjectStore('subfolders', { keyPath: 'id', autoIncrement: true });
  subfolderStore.createIndex('name', 'name', { unique: true });
};

// Handle successful database connection
request.onsuccess = function(event) {
  db = event.target.result;
  loadFolders(); // Load existing folders into the select dropdown
};

// Handle error in database connection
request.onerror = function(event) {
  console.error('Database error:', event.target.error);
};

// Create a new folder
document.getElementById('createFolderBtn').addEventListener('click', function() {
  const folderName = prompt('Enter folder name:');
  if (folderName) {
    const transaction = db.transaction(['folders'], 'readwrite');
    const folderStore = transaction.objectStore('folders');
    
    const folder = { name: folderName };
    const request = folderStore.add(folder);
    
    request.onsuccess = function() {
      loadFolders(); // Refresh the select dropdown with updated folders
    };
    
    request.onerror = function(event) {
      console.error('Error creating folder:', event.target.error);
    };
  }
});

// Create a new subfolder in the selected folder
document.getElementById('createSubfolderBtn').addEventListener('click', function() {
  const folderId = document.getElementById('folderSelect').value;
  const subfolderName = prompt('Enter subfolder name:');
  if (folderId && subfolderName) {
    const transaction = db.transaction(['subfolders'], 'readwrite');
    const subfolderStore = transaction.objectStore('subfolders');
    
    const subfolder = { name: subfolderName, folderId: parseInt(folderId) };
    const request = subfolderStore.add(subfolder);
    
    request.onerror = function(event) {
      console.error('Error creating subfolder:', event.target.error);
    };
  }
});

// Fill the selected subfolder with user-written text
document.getElementById('fillSubfolderBtn').addEventListener('click', function() {
  const subfolderId = document.getElementById('folderSelect').value;
  const text = document.getElementById('textInput').value;
  
  if (subfolderId && text) {
    const transaction = db.transaction(['subfolders'], 'readwrite');
    const subfolderStore = transaction.objectStore('subfolders');
    
    const request = subfolderStore.get(parseInt(subfolderId));
    
    request.onsuccess = function(event) {
      const subfolder = event.target.result;
      subfolder.text = text;
      
      const updateRequest = subfolderStore.put(subfolder);
      
      updateRequest.onerror = function(event) {
        console.error('Error updating subfolder:', event.target.error);
      };
    };
    
    request.onerror = function(event) {
      console.error('Error retrieving subfolder:', event.target.error);
    };
  }
});

// Load existing folders into the select dropdown
function loadFolders() {
  const folderSelect = document.getElementById('folderSelect');
  folderSelect.innerHTML = '';
  
  const transaction = db.transaction(['folders'], 'readonly');
  const folderStore = transaction.objectStore('folders');
  
  const request = folderStore.getAll();
  
  request.onsuccess = function(event) {
    const folders = event.target.result;
    for (const folder of folders) {
      const option = document.createElement('option');
      option.value = folder.id;
      option.textContent = folder.name;
      folderSelect.appendChild(option);
    }
  };
  
  request.onerror = function(event) {
    console.error('Error loading folders:', event.target.error);
  };
}

//

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
