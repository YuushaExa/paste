function allowDrop(event) {
    event.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    const targetNote = event.target.closest('.note');
    if (draggingElement && targetNote && targetNote !== draggingElement) {
        const column = event.target.closest('.column');
        
        const draggingRect = draggingElement.getBoundingClientRect();
        const targetRect = targetNote.getBoundingClientRect();

        // Calculate the intersection area
        const intersectionTop = Math.max(draggingRect.top, targetRect.top);
        const intersectionBottom = Math.min(draggingRect.bottom, targetRect.bottom);
        const intersectionLeft = Math.max(draggingRect.left, targetRect.left);
        const intersectionRight = Math.min(draggingRect.right, targetRect.right);
        const intersectionWidth = intersectionRight - intersectionLeft;
        const intersectionHeight = intersectionBottom - intersectionTop;
        const intersectionArea = Math.max(0, intersectionWidth) * Math.max(0, intersectionHeight);

        // Calculate the area of the dragging note
        const draggingArea = (draggingRect.bottom - draggingRect.top) * (draggingRect.right - draggingRect.left);
        
        // Calculate the percentage of intersection area compared to the dragging note's area
        const intersectionPercentage = (intersectionArea / draggingArea) * 100;

        // If the intersection percentage is more than 20%, perform the replacement
        if (intersectionPercentage > 20) {
            const notes = Array.from(column.querySelectorAll('.note'));
            const targetIndex = notes.indexOf(targetNote);

            // Insert the dragging element at the correct position
            if (draggingRect.top < targetRect.top) {
                column.insertBefore(draggingElement, notes[targetIndex + 1]);
            } else {
                column.insertBefore(draggingElement, targetNote);
            }

            column.querySelectorAll('.note').forEach(note => note.classList.remove('bounce')); // Remove bounce effect from all notes
            saveNotes();
            return;
        }

        targetNote.classList.add('bounce');
        setTimeout(() => {
            targetNote.classList.remove('bounce');
        }, 500); // Remove bounce effect after 0.5 seconds
    }
}
