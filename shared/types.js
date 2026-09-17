"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BINGO_LINE_DEFINITIONS = void 0;
exports.BINGO_LINE_DEFINITIONS = [
    // 5 Rows
    { id: 'row-0', type: 'row', index: 0, cellIndices: [0, 1, 2, 3, 4] },
    { id: 'row-1', type: 'row', index: 1, cellIndices: [5, 6, 7, 8, 9] },
    { id: 'row-2', type: 'row', index: 2, cellIndices: [10, 11, 12, 13, 14] },
    { id: 'row-3', type: 'row', index: 3, cellIndices: [15, 16, 17, 18, 19] },
    { id: 'row-4', type: 'row', index: 4, cellIndices: [20, 21, 22, 23, 24] },
    // 5 Columns
    { id: 'col-0', type: 'column', index: 0, cellIndices: [0, 5, 10, 15, 20] },
    { id: 'col-1', type: 'column', index: 1, cellIndices: [1, 6, 11, 16, 21] },
    { id: 'col-2', type: 'column', index: 2, cellIndices: [2, 7, 12, 17, 22] },
    { id: 'col-3', type: 'column', index: 3, cellIndices: [3, 8, 13, 18, 23] },
    { id: 'col-4', type: 'column', index: 4, cellIndices: [4, 9, 14, 19, 24] },
    // 2 Diagonals
    { id: 'diag-0', type: 'diagonal', index: 0, cellIndices: [0, 6, 12, 18, 24] }, // Top-left to bottom-right
    { id: 'diag-1', type: 'diagonal', index: 1, cellIndices: [4, 8, 12, 16, 20] }, // Top-right to bottom-left
];
