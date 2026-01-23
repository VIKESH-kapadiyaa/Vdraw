"use client";
import React, { useState, useEffect } from "react";
import { Search, X, Book, Filter, FileText, ChevronRight, BadgeCheck, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CURRICULUM_BOOKS, Book as BookType } from "../lib/curriculum-data";
import { toast } from "sonner";
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Fix for Next.js / Worker loading
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface BookLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    excalidrawAPI: any;
}

export default function BookLibraryModal({ isOpen, onClose, excalidrawAPI }: BookLibraryModalProps) {
    const [search, setSearch] = useState("");
    const [selectedBoard, setSelectedBoard] = useState<"All" | "NCERT" | "ICSE">("All");
    const [selectedClass, setSelectedClass] = useState<string>("All");

    // Viewer State
    const [activeBook, setActiveBook] = useState<BookType | null>(null);
    const [loadingPdf, setLoadingPdf] = useState(false);
    const [pdfError, setPdfError] = useState(false);
    // Simplified for demo: Just show "Import first page" or "Import specific page"
    const [numPages, setNumPages] = useState(0);
    const [pageToImport, setPageToImport] = useState(1);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                if (activeBook) setActiveBook(null); // Back to library
                else onClose(); // Close modal
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose, activeBook]);

    // Filters
    const filteredBooks = CURRICULUM_BOOKS.filter(b =>
        (selectedBoard === "All" || b.board === selectedBoard) &&
        (selectedClass === "All" || b.class === selectedClass) &&
        (b.title.toLowerCase().includes(search.toLowerCase()) || b.subject.toLowerCase().includes(search.toLowerCase()))
    );

    const classes = ["All", "9", "10", "11", "12"];

    const handleOpenBook = async (book: BookType) => {
        setActiveBook(book);
        setLoadingPdf(true);
        setPdfError(false);
        setNumPages(0);

        try {
            // Test load header to verify access (and CORS)
            const loadingTask = pdfjsLib.getDocument(book.pdfUrl);
            const pdf = await loadingTask.promise;
            setNumPages(pdf.numPages);
            setLoadingPdf(false);
        } catch (e) {
            console.error("PDF Load Error", e);
            setPdfError(true);
            setLoadingPdf(false);
            // toast.error("Could not load PDF (CORS or Network Error)");
        }
    };

    const handleImportPage = async () => {
        if (!activeBook || !excalidrawAPI) return;

        const toastId = toast.loading(`Importing Page ${pageToImport}...`);

        try {
            const loadingTask = pdfjsLib.getDocument(activeBook.pdfUrl);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(pageToImport);

            const viewport = page.getViewport({ scale: 2.0 }); // High res
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context!, viewport: viewport }).promise;

            const base64data = canvas.toDataURL("image/jpeg", 0.9);
            const fileId = Math.random().toString(36).substring(7);

            // Add File
            if (excalidrawAPI.addFiles) {
                excalidrawAPI.addFiles([{
                    id: fileId,
                    dataURL: base64data,
                    mimeType: "image/jpeg",
                    created: Date.now()
                }]);
            }

            // Insert to Scene
            const appState = excalidrawAPI.getAppState();
            const centerX = appState.scrollX + window.innerWidth / 2;
            const centerY = appState.scrollY + window.innerHeight / 2;

            const imageElement = {
                type: "image",
                id: Math.random().toString(36).substring(7),
                version: 1,
                versionNonce: Math.floor(Math.random() * 1000000000),
                isDeleted: false,
                fileId: fileId,
                status: "saved",
                x: centerX - (viewport.width / 4), // scale down for view
                y: centerY - (viewport.height / 4),
                width: viewport.width / 2,
                height: viewport.height / 2,
                groupIds: [],
                strokeStyle: "solid",
                backgroundColor: "transparent",
                locked: true
            };

            excalidrawAPI.updateScene({
                elements: [...excalidrawAPI.getSceneElements(), imageElement],
                commitToHistory: true
            });

            toast.dismiss(toastId);
            toast.success("Page Imported Successfully");
            onClose(); // Optional: Keep open? Usually close to draw.
            setActiveBook(null);

        } catch (e: any) {
            console.error(e);
            toast.error("Failed to import page", { id: toastId });
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
                    />

                    <motion.div
                        layoutId="book-library"
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl h-[80vh] bg-neutral-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl z-[70] flex flex-col overflow-hidden"
                    >
                        {/* HEader */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl text-emerald-400">
                                    <Book className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        {activeBook ? activeBook.title : "Library"}
                                        {activeBook && <span className="text-xs font-normal text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full border border-white/5">{activeBook.class}th {activeBook.subject}</span>}
                                    </h2>
                                    <p className="text-sm text-neutral-400">{activeBook ? "Select a page to drop onto canvas" : "NCERT & ICSE Digital Repository"}</p>
                                </div>
                            </div>

                            {!activeBook && (
                                <div className="relative hidden md:block">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search books..."
                                        className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 w-64 transition-all"
                                    />
                                </div>
                            )}

                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="flex-1 overflow-hidden relative flex flex-col">
                            {!activeBook ? (
                                /* BOOK GRID */
                                <>
                                    <div className="flex items-center gap-4 p-4 border-b border-white/5 overflow-x-auto shrink-0">
                                        <div className="flex bg-white/5 rounded-lg p-1">
                                            {["All", "NCERT", "ICSE"].map(b => (
                                                <button key={b} onClick={() => setSelectedBoard(b as any)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${selectedBoard === b ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}>{b}</button>
                                            ))}
                                        </div>
                                        <div className="w-px h-6 bg-white/10" />
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Class</span>
                                            {classes.map(c => (
                                                <button key={c} onClick={() => setSelectedClass(c)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${selectedClass === c ? 'bg-emerald-600 text-white' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`}>{c === "All" ? "∞" : c}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                        {filteredBooks.map(book => (
                                            <motion.button
                                                key={book.id}
                                                layout
                                                onClick={() => handleOpenBook(book)}
                                                className="group text-left"
                                            >
                                                <div className="aspect-[3/4] bg-neutral-800 rounded-xl overflow-hidden border border-white/10 shadow-lg group-hover:scale-105 group-hover:shadow-emerald-900/20 group-hover:border-emerald-500/50 transition-all relative">
                                                    {/* Placeholder Cover */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                                                        <h3 className="font-bold text-white leading-tight mb-1">{book.subject}</h3>
                                                        <p className="text-xs text-emerald-300 font-mono">Class {book.class}</p>
                                                    </div>
                                                    {book.isLatest && <div className="absolute top-2 right-2 bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> 25'</div>}
                                                </div>
                                                <div className="mt-3">
                                                    <h4 className="text-sm font-medium text-white truncate">{book.title}</h4>
                                                    <p className="text-xs text-neutral-500">{book.board}</p>
                                                </div>
                                            </motion.button>
                                        ))}
                                        {filteredBooks.length === 0 && <div className="col-span-full py-20 text-center text-neutral-500">No books found matching criteria.</div>}
                                    </div>
                                </>
                            ) : (
                                /* PDF ACTION VIEW */
                                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black/20">
                                    {loadingPdf ? (
                                        <div className="text-center animate-pulse">
                                            <FileText className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                                            <p className="text-neutral-400">Fetching PDF Document...</p>
                                        </div>
                                    ) : pdfError ? (
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><X className="w-8 h-8" /></div>
                                            <h3 className="text-white font-medium mb-2">Unavailable</h3>
                                            <p className="text-neutral-500 max-w-xs mx-auto mb-6">This book content is currently restricted or failed to load. (CORS/Network)</p>
                                            <button onClick={() => setActiveBook(null)} className="text-emerald-400 hover:underline">Return to Library</button>
                                        </div>
                                    ) : (
                                        <div className="max-w-md w-full bg-neutral-800/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl text-center">
                                            <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-400">
                                                <FileText className="w-10 h-10" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-2">{numPages} Pages Detected</h3>
                                            <p className="text-neutral-400 mb-8">Select a page number to extract and drop onto the whiteboard.</p>

                                            <div className="flex items-center justify-center gap-4 mb-8">
                                                <button onClick={() => setPageToImport(Math.max(1, pageToImport - 1))} className="p-2 bg-white/5 rounded-lg hover:bg-white/10"><ChevronRight className="w-5 h-5 rotate-180" /></button>
                                                <div className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-xl font-mono text-white min-w-[80px]">
                                                    {pageToImport}
                                                </div>
                                                <button onClick={() => setPageToImport(Math.min(numPages, pageToImport + 1))} className="p-2 bg-white/5 rounded-lg hover:bg-white/10"><ChevronRight className="w-5 h-5" /></button>
                                            </div>

                                            <button
                                                onClick={handleImportPage}
                                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                                            >
                                                <Download className="w-5 h-5" /> Import Page
                                            </button>

                                            <button onClick={() => setActiveBook(null)} className="mt-4 text-sm text-neutral-500 hover:text-white transition-colors">Choose different book</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
