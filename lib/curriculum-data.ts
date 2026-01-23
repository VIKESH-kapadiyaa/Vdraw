export interface Book {
    id: string;
    board: 'NCERT' | 'ICSE';
    class: string;
    subject: string;
    title: string;
    edition: '2025-26';
    pdfUrl: string; // In production, these would be real hosted PDFs
    coverThumb: string;
    tags: string[];
    isLatest: boolean;
}

// Using placeholder PDFs for demo purposes.
// In a real app, these would point to your supabase storage or CDN.
export const CURRICULUM_BOOKS: Book[] = [
    {
        id: 'ncert-10-sci',
        board: 'NCERT',
        class: '10',
        subject: 'Science',
        title: 'Science Textbook Class X',
        edition: '2025-26',
        pdfUrl: 'https://ncert.nic.in/textbook/pdf/jesc101.pdf', // Direct link often blocked by CORS, usually need proxy. For demo, we might use a local asset or a CORS-friendly sample.
        coverThumb: 'https://ncert.nic.in/textbook/pdf/jesc1cc.jpg',
        tags: ['physics', 'chemistry', 'biology'],
        isLatest: true
    },
    {
        id: 'ncert-12-phys-1',
        board: 'NCERT',
        class: '12',
        subject: 'Physics',
        title: 'Physics Part I',
        edition: '2025-26',
        pdfUrl: 'https://ncert.nic.in/textbook/pdf/leph101.pdf',
        coverThumb: 'https://ncert.nic.in/textbook/pdf/leph1cc.jpg',
        tags: ['mechanics', 'waves'],
        isLatest: true
    },
    {
        id: 'ncert-12-math-1',
        board: 'NCERT',
        class: '12',
        subject: 'Mathematics',
        title: 'Mathematics Part I',
        edition: '2025-26',
        pdfUrl: 'https://ncert.nic.in/textbook/pdf/lemh101.pdf',
        coverThumb: 'https://ncert.nic.in/textbook/pdf/lemh1cc.jpg',
        tags: ['calculus', 'relations'],
        isLatest: true
    },
    {
        id: 'icse-10-chem',
        board: 'ICSE',
        class: '10',
        subject: 'Chemistry',
        title: 'Concise Chemistry Class 10',
        edition: '2025-26',
        pdfUrl: '/assets/sample.pdf', // Local sample for testing if external fails
        coverThumb: '/assets/books/icse_chem.jpg', // Placeholder
        tags: ['organic', 'periodic table'],
        isLatest: true
    },
    {
        id: 'ncert-9-math',
        board: 'NCERT',
        class: '9',
        subject: 'Mathematics',
        title: 'Mathematics Class IX',
        edition: '2025-26',
        pdfUrl: 'https://ncert.nic.in/textbook/pdf/iemh101.pdf',
        coverThumb: 'https://ncert.nic.in/textbook/pdf/iemh1cc.jpg',
        tags: ['geometry', 'algebra'],
        isLatest: true
    }
];
