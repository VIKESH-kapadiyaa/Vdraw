"use client";
import React, { useState } from "react";
import { Search, Book, FileText, ChevronRight, BadgeCheck, Download, X } from "lucide-react";
import { motion } from "framer-motion";
import { CURRICULUM_BOOKS, Book as BookType } from "@/lib/curriculum-data";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Fix for Next.js / Worker loading
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface BookBrowserProps {
    excalidrawAPI: any;
}

export default function BookBrowser({ excalidrawAPI }: BookBrowserProps) {
    const [search, setSearch] = useState("");
    const [selectedBoard, setSelectedBoard] = useState<"All" | "NCERT" | "ICSE">("All");
    const [selectedClass, setSelectedClass] = useState<string>("All");

    // Viewer State
    const [activeBook, setActiveBook] = useState<BookType | null>(null);
    const [loadingPdf, setLoadingPdf] = useState(false);
    const [pdfError, setPdfError] = useState(false);
    const [numPages, setNumPages] = useState(0);
    const [pageToImport, setPageToImport] = useState(1);

    // Close Helper
    const { closeWindow } = useStore();

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
            const loadingTask = pdfjsLib.getDocument(book.pdfUrl);
            const pdf = await loadingTask.promise;
            setNumPages(pdf.numPages);
            setLoadingPdf(false);
        } catch (e) {
            console.error("PDF Load Error", e);
            setPdfError(true);
            setLoadingPdf(false);
        }
    };

    const handleImportPage = async () => {
        if (!activeBook || !excalidrawAPI) {
            toast.error("Whiteboard not ready");
            return;
        }

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
            closeWindow('books'); // Optional: Close on import
            setActiveBook(null);

        } catch (e: any) {
            console.error(e);
            toast.error("Failed to import page", { id: toastId });
        }
    };

    return (
        <div className="flex flex-col h-full text-white">
            {/* Toolbar */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                    {activeBook ? (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setActiveBook(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><ChevronRight className="w-5 h-5 rotate-180" /></button>
                            <div>
                                <h2 className="text-sm font-bold truncate max-w-[150px]">{activeBook.title}</h2>
                                <p className="text-xs text-neutral-400">Page {pageToImport} of {numPages}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="pl-7 pr-3 py-1.5 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 w-full transition-all"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {!activeBook ? (
                    /* BOOK GRID */
                    <>
                        {/* Filters */}
                        <div className="flex items-center gap-2 p-2 border-b border-white/5 overflow-x-auto shrink-0 custom-scrollbar">
                            <div className="flex bg-black/20 rounded-lg p-1">
                                {["All", "NCERT", "ICSE"].map(b => (
                                    <button key={b} onClick={() => setSelectedBoard(b as any)} className={`px-3 py-1 rounded text-xs font-medium transition-all ${selectedBoard === b ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}>{b}</button>
                                ))}
                            </div>
                            <div className="w-px h-4 bg-white/10" />
                            {classes.map(c => (
                                <button key={c} onClick={() => setSelectedClass(c)} className={`min-w-[24px] h-6 rounded px-1 flex items-center justify-center text-xs font-medium transition-all ${selectedClass === c ? 'bg-emerald-600 text-white' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`}>{c === "All" ? "∞" : c}</button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 custom-scrollbar">
                            {filteredBooks.map(book => (
                                <button
                                    key={book.id}
                                    onClick={() => handleOpenBook(book)}
                                    className="group text-left"
                                >
                                    <div className="aspect-[3/4] bg-neutral-800 rounded-lg overflow-hidden border border-white/10 shadow-lg group-hover:scale-105 group-hover:shadow-emerald-900/20 group-hover:border-emerald-500/50 transition-all relative">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-2">
                                            <h3 className="font-bold text-white text-xs leading-tight mb-0.5">{book.subject}</h3>
                                            <p className="text-[10px] text-emerald-300 font-mono">Class {book.class}</p>
                                        </div>
                                    </div>
                                    <h4 className="text-xs font-medium text-neutral-300 mt-2 truncate">{book.title}</h4>
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    /* PDF ACTION VIEW */
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black/20">
                        {loadingPdf ? (
                            <div className="text-center animate-pulse">
                                <FileText className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                                <p className="text-xs text-neutral-500">Loading PDF...</p>
                            </div>
                        ) : pdfError ? (
                            <div className="text-center text-red-400 text-sm">Failed to load Book PDF.</div>
                        ) : (
                            <div className="w-full max-w-xs text-center space-y-4">
                                <FileText className="w-12 h-12 text-emerald-500 mx-auto opacity-50" />
                                <h3 className="text-lg font-bold">Import Page</h3>

                                <div className="flex items-center justify-center gap-4">
                                    <button onClick={() => setPageToImport(Math.max(1, pageToImport - 1))} className="p-2 bg-white/5 rounded-lg hover:bg-white/10"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                                    <span className="text-2xl font-mono">{pageToImport}</span>
                                    <button onClick={() => setPageToImport(Math.min(numPages, pageToImport + 1))} className="p-2 bg-white/5 rounded-lg hover:bg-white/10"><ChevronRight className="w-4 h-4" /></button>
                                </div>

                                <button
                                    onClick={handleImportPage}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" /> Import to Board
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
