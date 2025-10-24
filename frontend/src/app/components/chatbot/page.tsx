"use client";
import React, { ChangeEvent, useState, useRef, useEffect } from "react";
import { X, Minus, Maximize2, Minimize2, Send, Activity } from "lucide-react";
import { SiProbot } from "react-icons/si";

interface Message {
    sender: "user" | "ai";
    text: string;
    timestamp?: string;
}

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>("");
    const [isMinimized, setIsMinimized] = useState<boolean>(false);
    const [isMaximized, setIsMaximized] = useState<boolean>(false);
    const [iconPosition, setIconPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
    const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 });
    const [isDraggingIcon, setIsDraggingIcon] = useState(false);
    const [isDraggingChat, setIsDraggingChat] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);
    const iconRef = useRef<HTMLButtonElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getTimestamp = () => {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { sender: "user", text: input, timestamp: getTimestamp() };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        try {
            const res = await fetch("http://localhost:8080/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: input,
                    session_id: sessionId,
                }),
            });

            if (!res.ok) throw new Error("Failed to fetch AI response");
            const data = await res.json();

            const aiText = data.response || "No response received.";
            const aiMessage: Message = { sender: "ai", text: aiText, timestamp: getTimestamp() };
            setMessages((prev) => [...prev, aiMessage]);

            if (data.session_id) setSessionId(data.session_id);

        } catch (err) {
            console.error("Error fetching AI response:", err);
            const errorMsg: Message = {
                sender: "ai",
                text: "Connection error. Please check network status and retry.",
                timestamp: getTimestamp()
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value);
    const handleKeyPress = (e: React.KeyboardEvent) => e.key === "Enter" && handleSend();

    // Icon drag handlers
    const handleIconMouseDown = (e: React.MouseEvent) => {
        setIsDraggingIcon(true);
        setDragOffset({
            x: e.clientX - iconPosition.x,
            y: e.clientY - iconPosition.y,
        });
    };

    // Chat header drag handlers
    const handleChatMouseDown = (e: React.MouseEvent) => {
        if (isMaximized) return;
        setIsDraggingChat(true);
        setDragOffset({
            x: e.clientX - chatPosition.x,
            y: e.clientY - chatPosition.y,
        });
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDraggingIcon) {
            const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 80));
            const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 80));
            setIconPosition({ x: newX, y: newY });
        }

        if (isDraggingChat && !isMaximized) {
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            setChatPosition({ x: newX, y: newY });
        }
    };

    const handleMouseUp = () => {
        setIsDraggingIcon(false);
        setIsDraggingChat(false);
    };

    useEffect(() => {
        if (isDraggingIcon || isDraggingChat) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            return () => {
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
            };
        }
    }, [isDraggingIcon, isDraggingChat, dragOffset]);

    const toggleMaximize = () => {
        setIsMaximized(!isMaximized);
    };

    const handleOpenChat = () => {
        setIsOpen(true);
        // Position chat near the icon
        const chatWidth = 384; // w-96
        const chatHeight = 512; // h-[32rem]

        let x = iconPosition.x - chatWidth - 20;
        let y = iconPosition.y;

        // Adjust if chat would go off-screen
        if (x < 0) x = iconPosition.x + 80 + 20;
        if (y + chatHeight > window.innerHeight) y = window.innerHeight - chatHeight - 20;
        if (y < 0) y = 20;

        setChatPosition({ x, y });
    };

    const chatWindowClasses = isMaximized
        ? "w-screen h-screen"
        : isMinimized
            ? "w-96 h-14" // Updated to match new header size
            : "w-96 h-[32rem]";

    const chatStyle = isMaximized
        ? { top: 0, left: 0, right: 0, bottom: 0 }
        : { left: `${chatPosition.x}px`, top: `${chatPosition.y}px` };

    return (
        <>
            {/* Draggable Icon */}
            {!isOpen && (
                <button
                    ref={iconRef}
                    onMouseDown={handleIconMouseDown}
                    onClick={handleOpenChat}
                    className="fixed bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white rounded-2xl p-4 shadow-2xl hover:shadow-green-500/50 transition-all duration-300 hover:scale-110 border-2 border-green-500/50 group cursor-move z-50"
                    style={{
                        left: `${iconPosition.x}px`,
                        top: `${iconPosition.y}px`,
                        transition: isDraggingIcon ? 'none' : 'all 0.3s ease'
                    }}
                >
                    <SiProbot className="w-8 h-8 text-green-400 group-hover:text-green-500 transition-colors" />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    ref={chatRef}
                    className={`fixed ${chatWindowClasses} bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl rounded-xl flex flex-col border-2 ${
                        isMaximized ? 'border-green-400 border-4' : isMinimized ? 'border-yellow-400 border-4' : 'border-green-500/30'
                    } backdrop-blur-sm z-50`}
                    style={{
                        ...chatStyle,
                        transition: isDraggingChat || isMaximized ? 'none' : 'all 0.3s ease',
                    }}
                >
                    {/* Header */}
                    <div
                        className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-3 flex justify-between items-center border-b-2 border-green-500/50 cursor-move select-none"
                        onMouseDown={handleChatMouseDown}
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-green-500/20 p-2 rounded-lg border border-green-500/50">
                                <SiProbot className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">A.R.I.A</h3>
                                <p className="text-xs text-green-400">Active Response Intelligence Agent</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="hover:bg-slate-700 p-2 rounded-lg transition-colors ml-1"
                                title="Minimize"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <button
                                onClick={toggleMaximize}
                                className="hover:bg-slate-700 p-2 rounded-lg transition-colors"
                                title={isMaximized ? "Restore" : "Maximize"}
                            >
                                {isMaximized ? (
                                    <Minimize2 className="w-4 h-4" />
                                ) : (
                                    <Maximize2 className="w-4 h-4" />
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setIsMinimized(false);
                                    setIsMaximized(false);
                                }}
                                className="hover:bg-red-600 p-2 rounded-lg transition-colors"
                                title="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    {!isMinimized && (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/50">
                                {messages.length === 0 && (
                                    <div className="text-center text-slate-400 mt-12">
                                        <SiProbot className="w-12 h-12 mx-auto mb-3 text-green-500" />
                                        <p className="text-sm font-medium">A.R.I.A Online</p>
                                        <p className="text-xs text-slate-400 mt-1">Ready to assist with security operations</p>
                                    </div>
                                )}
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[75%] ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                                            <div
                                                className={`inline-block p-3 rounded-lg shadow-lg text-sm ${
                                                    msg.sender === "user"
                                                        ? "bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-br-none"
                                                        : "bg-gradient-to-r from-slate-700 to-slate-800 text-slate-100 rounded-bl-none border border-green-500/30"
                                                }`}
                                            >
                                                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                            </div>
                                            {msg.timestamp && (
                                                <p className="text-xs text-slate-500 mt-1.5">{msg.timestamp}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-slate-100 p-3 rounded-lg rounded-bl-none border border-green-500/30">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t-2 border-green-500/30 bg-slate-900/80 rounded-b-xl">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={handleInputChange}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Enter query or command..."
                                        className="flex-1 bg-slate-800 border-2 border-slate-700 focus:border-green-500 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim()}
                                        className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2 font-semibold shadow-lg hover:shadow-green-500/50"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default Chatbot;