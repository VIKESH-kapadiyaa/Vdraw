export interface NCERTDiagram {
    id: string;
    name: string;
    category: 'Physics' | 'Chemistry' | 'Biology' | 'Math';
    path: string;
    tags: string[];
    hasPhysics?: boolean;
}

export const NCERT_DIAGRAMS: NCERTDiagram[] = [
    {
        id: 'phys-1',
        name: 'Block on Inclined Plane',
        category: 'Physics',
        path: '/assets/ncert/physics-block.svg',
        tags: ['friction', 'mechanics', 'slope'],
        hasPhysics: true
    },
    {
        id: 'bio-1',
        name: 'Plant Cell Structure',
        category: 'Biology',
        path: '/assets/ncert/biology-cell.svg',
        tags: ['botany', 'cell', 'diagram'],
        hasPhysics: false
    },
    {
        id: 'chem-1',
        name: 'Bunsen Burner & Beaker',
        category: 'Chemistry',
        path: '/assets/ncert/chemistry-beaker.svg',
        tags: ['lab', 'heat', 'reaction'],
        hasPhysics: true
    },
    {
        id: 'bio-2',
        name: 'Human Digestive System',
        category: 'Biology',
        path: '/assets/ncert/digestive-system.png',
        tags: ['anatomy', 'digestive', 'human'],
        hasPhysics: false
    },
    {
        id: 'bio-3',
        name: 'Leaf Anatomy (Cross Section)',
        category: 'Biology',
        path: '/assets/ncert/leaf-anatomy.png',
        tags: ['botany', 'photosynthesis', 'structure'],
        hasPhysics: false
    },
    {
        id: 'bio-4',
        name: 'DNA Double Helix',
        category: 'Biology',
        path: '/assets/ncert/dna-helix.png',
        tags: ['genetics', 'dna', 'molecular'],
        hasPhysics: false
    },
    {
        id: 'phys-2',
        name: 'Concave Mirror Ray Diagram',
        category: 'Physics',
        path: '/assets/ncert/concave-mirror.png',
        tags: ['optics', 'light', 'reflection'],
        hasPhysics: false
    },
    {
        id: 'phys-3',
        name: 'Electrical Circuit Symbols',
        category: 'Physics',
        path: '/assets/ncert/circuit-symbols.png',
        tags: ['electricity', 'schematic', 'components'],
        hasPhysics: false
    },
    {
        id: 'phys-4',
        name: 'Pulley System (Mechanics)',
        category: 'Physics',
        path: '/assets/ncert/pulley-system.png',
        tags: ['force', 'mechanics', 'tension'],
        hasPhysics: true
    },
    {
        id: 'chem-2',
        name: 'Distillation Apparatus',
        category: 'Chemistry',
        path: '/assets/ncert/distillation-apparatus.png',
        tags: ['lab', 'separation', 'process'],
        hasPhysics: false
    },
    {
        id: 'chem-3',
        name: 'Electron Shell Diagram',
        category: 'Chemistry',
        path: '/assets/ncert/electron-shells.png',
        tags: ['atomic', 'structure', 'bohr'],
        hasPhysics: false
    },
    {
        id: 'chem-4',
        name: 'Periodic Table of Elements',
        category: 'Chemistry',
        path: '/assets/ncert/periodic-table.png',
        tags: ['elements', 'reference', 'chart'],
        hasPhysics: false
    },
    {
        id: 'math-1',
        name: 'Trigonometric Functions',
        category: 'Math',
        path: '/assets/ncert/trigonometry-triangle.png',
        tags: ['geometry', 'sine', 'cosine', 'triangle'],
        hasPhysics: false
    },
    {
        id: 'math-2',
        name: 'Alternate Interior Angles',
        category: 'Math',
        path: '/assets/ncert/alternate-angles.png',
        tags: ['geometry', 'lines', 'angles'],
        hasPhysics: false
    }
];
