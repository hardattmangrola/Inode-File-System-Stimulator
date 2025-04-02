// File system constants
const BLOCK_SIZE = 1024; // 1KB blocks
const DISK_BLOCKS = 256; // Total blocks in disk
const INODE_DIRECT_BLOCKS = 12; // Number of direct blocks in inode
const BLOCKS_PER_INDIRECT = Math.floor(BLOCK_SIZE / 4); // Pointers per indirect block (assuming 4-byte pointers)

// File system state
let fileSystem = {
    initialized: false,
    blockSize: BLOCK_SIZE,
    totalBlocks: DISK_BLOCKS,
    freeBlocks: DISK_BLOCKS,
    blockMap: Array(DISK_BLOCKS).fill(null), // null = free, object = file using it
    files: {},
    nextInode: 1
};

// Selected file
let selectedFile = null;

// DOM elements
const diskEl = document.getElementById('disk');
const fileExplorerEl = document.getElementById('file-explorer');
const statusEl = document.getElementById('status');
const inodeStatusEl = document.getElementById('inode-status');
const inodeAttributesEl = document.getElementById('inode-attributes');
const directBlocksEl = document.getElementById('direct-blocks');
const singleIndirectEl = document.getElementById('single-indirect');
const doubleIndirectEl = document.getElementById('double-indirect');
const tripleIndirectEl = document.getElementById('triple-indirect');
const filenameInput = document.getElementById('filename');
const filesizeInput = document.getElementById('filesize');
const tooltip = document.getElementById('tooltip');

// Initialize the file system
document.getElementById('init-fs').addEventListener('click', () => {
    fileSystem = {
        initialized: true,
        blockSize: BLOCK_SIZE,
        totalBlocks: DISK_BLOCKS,
        freeBlocks: DISK_BLOCKS,
        blockMap: Array(DISK_BLOCKS).fill(null),
        files: {},
        nextInode: 1
    };
    
    selectedFile = null;
    updateDiskVisualization();
    updateFileExplorer();
    updateInodeDetails();
    statusEl.textContent = `File system initialized. ${DISK_BLOCKS} blocks (${DISK_BLOCKS * BLOCK_SIZE / 1024}KB) available.`;
});

// Find free blocks - first try contiguous, then non-contiguous
function findFreeBlocks(blocksNeeded) {
    // First try to find contiguous blocks
    const contiguousBlocks = findContiguousBlocks(blocksNeeded);
    if (contiguousBlocks.length === blocksNeeded) {
        return contiguousBlocks;
    }
    
    // If not enough contiguous blocks, find any free blocks
    return findNonContiguousBlocks(blocksNeeded);
}

// Find contiguous free blocks
function findContiguousBlocks(blocksNeeded) {
    const contiguousBlocks = [];
    let currentRun = [];
    
    for (let i = 0; i < fileSystem.blockMap.length; i++) {
        if (fileSystem.blockMap[i] === null) {
            currentRun.push(i);
            if (currentRun.length === blocksNeeded) {
                return currentRun;
            }
        } else {
            // Reset run when we hit an occupied block
            currentRun = [];
        }
    }
    
    // Return the longest contiguous run we found
    return currentRun;
}

// Find any free blocks (non-contiguous)
function findNonContiguousBlocks(blocksNeeded) {
    const blocks = [];
    for (let i = 0; i < fileSystem.blockMap.length && blocks.length < blocksNeeded; i++) {
        if (fileSystem.blockMap[i] === null) {
            blocks.push(i);
        }
    }
    return blocks;
}

// Calculate how many blocks are needed for a file including indirect blocks
function calculateTotalBlocksNeeded(dataBlocks) {
    let totalBlocks = dataBlocks;
    
    // Calculate indirect blocks needed
    if (dataBlocks > INODE_DIRECT_BLOCKS) {
        const indirectBlocksNeeded = Math.ceil((dataBlocks - INODE_DIRECT_BLOCKS) / BLOCKS_PER_INDIRECT);
        totalBlocks += indirectBlocksNeeded;
        
        // For double and triple indirect blocks if implemented
        // (not included in this implementation)
    }
    
    return totalBlocks;
}

// Create a new file
document.getElementById('create-file').addEventListener('click', () => {
    if (!fileSystem.initialized) {
        statusEl.textContent = "Error: File system not initialized.";
        return;
    }
    
    const filename = filenameInput.value.trim();
    const filesize = parseInt(filesizeInput.value);
    
    if (!filename) {
        statusEl.textContent = "Error: Please enter a filename.";
        return;
    }
    
    if (isNaN(filesize) || filesize <= 0) {
        statusEl.textContent = "Error: Invalid file size.";
        return;
    }
    
    if (fileSystem.files[filename]) {
        statusEl.textContent = `Error: File '${filename}' already exists.`;
        return;
    }
    
    // Calculate required blocks for data
    const dataBlocksNeeded = Math.ceil(filesize / BLOCK_SIZE);
    
    // Add blocks for indirect pointers if needed
    const totalBlocksNeeded = calculateTotalBlocksNeeded(dataBlocksNeeded);
    
    if (totalBlocksNeeded > fileSystem.freeBlocks) {
        statusEl.textContent = `Error: Not enough space. Need ${totalBlocksNeeded} blocks (${dataBlocksNeeded} data + ${totalBlocksNeeded - dataBlocksNeeded} indirect), only ${fileSystem.freeBlocks} available.`;
        return;
    }
    
    // Find free blocks
    const allocatedBlocks = findFreeBlocks(totalBlocksNeeded);
    
    if (allocatedBlocks.length < totalBlocksNeeded) {
        statusEl.textContent = `Error: Could not allocate ${totalBlocksNeeded} blocks, only found ${allocatedBlocks.length}.`;
        return;
    }
    
    // Create file entry
    const now = new Date();
    const inode = fileSystem.nextInode++;
    
    // Separate data blocks from indirect blocks
    const dataBlocks = allocatedBlocks.slice(0, dataBlocksNeeded);
    
    // Set up direct and indirect blocks properly
    const directBlocks = dataBlocks.slice(0, Math.min(dataBlocksNeeded, INODE_DIRECT_BLOCKS));
    
    // Single indirect blocks if needed
    let singleIndirectBlock = null;
    let singleIndirectBlocks = [];
    
    if (dataBlocksNeeded > INODE_DIRECT_BLOCKS) {
        // Reserve one block for single indirect pointer block
        singleIndirectBlock = allocatedBlocks[dataBlocksNeeded];
        
        // The actual data blocks pointed to by the single indirect block
        singleIndirectBlocks = dataBlocks.slice(INODE_DIRECT_BLOCKS);
    }
    
    const file = {
        name: filename,
        inode: inode,
        size: filesize,
        blocks: allocatedBlocks, // All blocks including indirect blocks
        dataBlocks: dataBlocks, // Just the data blocks
        createdAt: now,
        modifiedAt: now,
        accessedAt: now,
        mode: 'rw-r--r--',
        owner: 'user',
        group: 'group',
        directBlocks: directBlocks,
        singleIndirect: singleIndirectBlock,
        singleIndirectBlocks: singleIndirectBlocks,
        doubleIndirect: null,
        tripleIndirect: null
    };
    
    // Mark blocks as used
    allocatedBlocks.forEach(block => {
        fileSystem.blockMap[block] = file;
    });
    
    fileSystem.files[filename] = file;
    fileSystem.freeBlocks -= allocatedBlocks.length;
    
    // Clear inputs
    filenameInput.value = '';
    filesizeInput.value = '1024';
    
    // Update UI
    updateDiskVisualization();
    updateFileExplorer();
    statusEl.textContent = `File '${filename}' created (${filesize} bytes, ${dataBlocksNeeded} data blocks + ${allocatedBlocks.length - dataBlocksNeeded} indirect blocks).`;
});

// Delete selected file
document.getElementById('delete-file').addEventListener('click', () => {
    if (!fileSystem.initialized) {
        statusEl.textContent = "Error: File system not initialized.";
        return;
    }
    
    if (!selectedFile) {
        statusEl.textContent = "Error: No file selected.";
        return;
    }
    
    const filename = selectedFile.name;
    const file = fileSystem.files[filename];
    
    // Free blocks
    file.blocks.forEach(block => {
        fileSystem.blockMap[block] = null;
    });
    
    fileSystem.freeBlocks += file.blocks.length;
    delete fileSystem.files[filename];
    
    selectedFile = null;
    
    // Update UI
    updateDiskVisualization();
    updateFileExplorer();
    updateInodeDetails();
    statusEl.textContent = `File '${filename}' deleted.`;
});

// Defragment disk - reorganize blocks to be contiguous by file
document.getElementById('defragment').addEventListener('click', () => {
    if (!fileSystem.initialized) {
        statusEl.textContent = "Error: File system not initialized.";
        return;
    }
    
    // Sort files by name to ensure consistent defragmentation
    const fileNames = Object.keys(fileSystem.files).sort();
    
    // Clear the block map first
    fileSystem.blockMap = Array(DISK_BLOCKS).fill(null);
    
    let nextFreeBlock = 0;
    let filesMoved = 0;
    let totalBlocksMoved = 0;
    
    // Reassign blocks for each file
    for (const fileName of fileNames) {
        const file = fileSystem.files[fileName];
        const oldBlocks = [...file.blocks]; // Copy original blocks
        
        // Calculate blocks needed
        const dataBlocksNeeded = file.dataBlocks.length;
        const totalBlocksNeeded = file.blocks.length;
        
        // Assign new contiguous blocks
        const newBlocks = [];
        for (let i = 0; i < totalBlocksNeeded; i++) {
            newBlocks.push(nextFreeBlock++);
        }
        
        // Update file blocks
        file.blocks = newBlocks;
        
        // Update direct and indirect blocks
        file.directBlocks = newBlocks.slice(0, Math.min(dataBlocksNeeded, INODE_DIRECT_BLOCKS));
        
        if (dataBlocksNeeded > INODE_DIRECT_BLOCKS) {
            file.singleIndirect = newBlocks[dataBlocksNeeded];
            file.singleIndirectBlocks = newBlocks.slice(INODE_DIRECT_BLOCKS, dataBlocksNeeded);
        } else {
            file.singleIndirect = null;
            file.singleIndirectBlocks = [];
        }
        
        // Mark blocks as used
        newBlocks.forEach(block => {
            fileSystem.blockMap[block] = file;
        });
        
        // Count blocks moved
        let blocksMoved = 0;
        for (let i = 0; i < newBlocks.length; i++) {
            if (newBlocks[i] !== oldBlocks[i]) {
                blocksMoved++;
            }
        }
        
        if (blocksMoved > 0) {
            filesMoved++;
            totalBlocksMoved += blocksMoved;
        }
    }
    
    updateDiskVisualization();
    updateFileExplorer();
    if (selectedFile) {
        updateInodeDetails();
    }
    
    if (totalBlocksMoved > 0) {
        statusEl.textContent = `Defragmentation complete. Moved ${totalBlocksMoved} blocks across ${filesMoved} files.`;
    } else {
        statusEl.textContent = "No fragmentation found. Disk is already optimized.";
    }
});

// Update disk visualization
function updateDiskVisualization() {
    diskEl.innerHTML = '';
    
    // Calculate block size for visualization
    const blocksPerRow = 32;
    const blockWidth = diskEl.clientWidth / blocksPerRow;
    const blockHeight = 20;
    
    for (let i = 0; i < fileSystem.blockMap.length; i++) {
        const block = document.createElement('div');
        block.className = 'disk-block free';
        block.style.width = `${blockWidth - 2}px`;
        block.style.height = `${blockHeight - 2}px`;
        block.style.left = `${(i % blocksPerRow) * blockWidth}px`;
        block.style.top = `${Math.floor(i / blocksPerRow) * blockHeight}px`;
        block.textContent = i;
        block.dataset.block = i;
        
        // Color based on usage
        if (fileSystem.blockMap[i] !== null) {
            const file = fileSystem.blockMap[i];
            
            // Determine block type by checking its role
            if (file.singleIndirect === i) {
                block.className = 'disk-block indirect';
                block.title = `Block ${i}: Single indirect pointer block for file '${file.name}'`;
            } else if (file.doubleIndirect === i) {
                block.className = 'disk-block double-indirect';
                block.title = `Block ${i}: Double indirect pointer block for file '${file.name}'`;
            } else if (file.tripleIndirect === i) {
                block.className = 'disk-block triple-indirect';
                block.title = `Block ${i}: Triple indirect pointer block for file '${file.name}'`;
            } else {
                block.className = 'disk-block used';
                block.title = `Block ${i}: Data block for file '${file.name}'`;
            }
            
            // Add tooltip
            block.addEventListener('mouseover', (e) => {
                tooltip.style.left = `${e.pageX + 10}px`;
                tooltip.style.top = `${e.pageY + 10}px`;
                tooltip.textContent = `Block ${i}\nFile: ${file.name}\nSize: ${file.size} bytes`;
                tooltip.style.opacity = '1';
            });
            
            block.addEventListener('mouseout', () => {
                tooltip.style.opacity = '0';
            });
        }
        
        diskEl.appendChild(block);
    }
}

// Update file explorer
function updateFileExplorer() {
    fileExplorerEl.innerHTML = '';
    
    if (!fileSystem.initialized) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.textContent = 'File system not initialized';
        fileExplorerEl.appendChild(item);
        return;
    }
    
    if (Object.keys(fileSystem.files).length === 0) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.textContent = 'No files';
        fileExplorerEl.appendChild(item);
        return;
    }
    
    for (const filename in fileSystem.files) {
        const file = fileSystem.files[filename];
        const item = document.createElement('div');
        item.className = 'file-item';
        if (selectedFile && selectedFile.name === filename) {
            item.classList.add('selected');
        }
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-name';
        nameSpan.textContent = filename;
        
        const sizeSpan = document.createElement('span');
        sizeSpan.className = 'file-size';
        sizeSpan.textContent = `${file.size} bytes`;
        
        item.appendChild(nameSpan);
        item.appendChild(sizeSpan);
        
        item.addEventListener('click', () => {
            selectedFile = file;
            updateFileExplorer();
            updateInodeDetails();
        });
        
        fileExplorerEl.appendChild(item);
    }
}

// Update inode details
function updateInodeDetails() {
    // Clear current details
    inodeAttributesEl.innerHTML = '';
    directBlocksEl.innerHTML = '';
    singleIndirectEl.innerHTML = '';
    doubleIndirectEl.innerHTML = '';
    tripleIndirectEl.innerHTML = '';
    
    if (!selectedFile) {
        inodeStatusEl.textContent = "No file selected. Click on a file in the file explorer to view its inode.";
        return;
    }
    
    const file = selectedFile;
    inodeStatusEl.textContent = `Showing inode ${file.inode} for file '${file.name}'`;
    
    // Add attributes
    const attributes = [
        { name: "Inode Number", value: file.inode },
        { name: "File Name", value: file.name },
        { name: "Size", value: `${file.size} bytes` },
        { name: "Data Blocks", value: file.dataBlocks ? file.dataBlocks.length : "N/A" },
        { name: "Total Blocks", value: file.blocks.length },
        { name: "Created", value: file.createdAt.toLocaleString() },
        { name: "Modified", value: file.modifiedAt.toLocaleString() },
        { name: "Accessed", value: file.accessedAt.toLocaleString() },
        { name: "Permissions", value: file.mode },
        { name: "Owner", value: file.owner },
        { name: "Group", value: file.group }
    ];
    
    attributes.forEach(attr => {
        const attrEl = document.createElement('div');
        attrEl.className = 'attribute';
        
        const nameEl = document.createElement('span');
        nameEl.className = 'attribute-name';
        nameEl.textContent = attr.name;
        
        const valueEl = document.createElement('span');
        valueEl.className = 'attribute-value';
        valueEl.textContent = attr.value;
        
        attrEl.appendChild(nameEl);
        attrEl.appendChild(valueEl);
        inodeAttributesEl.appendChild(attrEl);
    });
    
    // Add direct blocks
    for (let i = 0; i < INODE_DIRECT_BLOCKS; i++) {
        const pointer = document.createElement('div');
        pointer.className = 'pointer direct';
        if (i < file.directBlocks.length) {
            pointer.textContent = file.directBlocks[i];
            pointer.title = `Direct block ${i}: Block ${file.directBlocks[i]}`;
        } else {
            pointer.className += ' empty';
            pointer.textContent = '∅';
            pointer.title = `Direct block ${i}: Unused`;
        }
        directBlocksEl.appendChild(pointer);
    }
    
    // Add single indirect block
    const singlePointer = document.createElement('div');
    singlePointer.className = file.singleIndirect !== null ? 'pointer indirect' : 'pointer indirect empty';
    singlePointer.textContent = file.singleIndirect !== null ? file.singleIndirect : '∅';
    singlePointer.title = file.singleIndirect !== null ? 
        `Single indirect block: ${file.singleIndirect} (points to ${file.singleIndirectBlocks.length} blocks)` : 
        'Single indirect block: Unused';
    singleIndirectEl.appendChild(singlePointer);
    
    // Add indirect blocks
    if (file.singleIndirect !== null && file.singleIndirectBlocks) {
        const indirectBlocks = document.createElement('div');
        indirectBlocks.className = 'indirect-blocks';
        indirectBlocks.textContent = 'Points to: ' + file.singleIndirectBlocks.join(', ');
        singleIndirectEl.appendChild(indirectBlocks);
    }
    
    // Add double indirect block (not implemented)
    const doublePointer = document.createElement('div');
    doublePointer.className = 'pointer double-indirect empty';
    doublePointer.textContent = '∅';
    doublePointer.title = 'Double indirect block: Not implemented in this demo';
    doubleIndirectEl.appendChild(doublePointer);
    
    // Add triple indirect block (not implemented)
    const triplePointer = document.createElement('div');
    triplePointer.className = 'pointer triple-indirect empty';
    triplePointer.textContent = '∅';
    triplePointer.title = 'Triple indirect block: Not implemented in this demo';
    tripleIndirectEl.appendChild(triplePointer);
}

// Initialize the UI
updateDiskVisualization();
updateFileExplorer();

// Handle window resize
window.addEventListener('resize', updateDiskVisualization);