import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { io } from "socket.io-client";
import { MessageSquare, X, Send, Circle, ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";

export default function ChatWidget() {
    const { authUser } = useSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState(false);
    const [partners, setPartners] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [isTyping, setIsTyping] = useState(false);
    const [loadingPartners, setLoadingPartners] = useState(false);
    
    // New states for phase 1
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all");
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [activeMessageId, setActiveMessageId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [showReactionsFor, setShowReactionsFor] = useState(null);

    const socket = useRef(null);
    const typingTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const selectedPartnerRef = useRef(selectedPartner);

    useEffect(() => {
        selectedPartnerRef.current = selectedPartner;
    }, [selectedPartner]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!authUser) return;

        // Kết nối qua domain hiện tại (sẽ được Vite proxy xử lý)
        socket.current = io("/", { path: "/socket.io" });

        socket.current.emit("add-user", authUser._id);

        socket.current.on("get-online-users", (users) => {
            setOnlineUsers(new Set(users));
        });

        socket.current.on("user-online", ({ userId }) => {
            setOnlineUsers((prev) => {
                const newSet = new Set(prev);
                newSet.add(userId);
                return newSet;
            });
        });

        socket.current.on("user-offline", ({ userId }) => {
            setOnlineUsers((prev) => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        });

        socket.current.on("msg-receive", (data) => {
            setMessages((prev) => {
                return [...prev, { 
                    _id: data.messageId || Date.now().toString(), 
                    sender: data.sender, 
                    content: data.content, 
                    fromSelf: false, 
                    isUnsent: false, 
                    fileUrl: data.fileUrl, 
                    fileType: data.fileType,
                    replyTo: data.replyTo,
                    reactions: []
                }];
            });

            // Update unread count and latestMessageAt, then sort
            setPartners((prev) => {
                let updated = prev.map(p => {
                    const isGroupMatch = data.isGroup && p._id === data.projectId;
                    const isPrivateMatch = !data.isGroup && p._id === (typeof data.sender === 'object' ? data.sender._id : data.sender);
                    
                    if (isGroupMatch || isPrivateMatch) {
                        const isCurrentOpen = selectedPartnerRef.current && selectedPartnerRef.current._id === p._id;
                        return { 
                            ...p, 
                            unreadCount: !isCurrentOpen ? (p.unreadCount || 0) + 1 : 0,
                            latestMessageAt: new Date().toISOString()
                        };
                    }
                    return p;
                });
                return updated.sort((a, b) => new Date(b.latestMessageAt || 0) - new Date(a.latestMessageAt || 0));
            });
        });

        socket.current.on("msg-unsent", (data) => {
            setMessages((prev) => prev.map(msg => msg._id === data.messageId ? { ...msg, isUnsent: true } : msg));
        });

        socket.current.on("msg-reaction", (data) => {
            setMessages((prev) => prev.map(msg => msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg));
        });

        socket.current.on("msg-error", (data) => {
            toast.error(data.message);
        });

        socket.current.on("typing-receive", (data) => {
            setIsTyping(true);
        });

        socket.current.on("stop-typing-receive", (data) => {
            setIsTyping(false);
        });

        return () => {
            if (socket.current) {
                socket.current.disconnect();
            }
        };
    }, [authUser]);

    useEffect(() => {
        if (isOpen && !selectedPartner) {
            fetchPartners();
        }
    }, [isOpen, selectedPartner]);

    useEffect(() => {
        if (selectedPartner) {
            fetchMessages();
        }
    }, [selectedPartner]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const fetchPartners = async () => {
        setLoadingPartners(true);
        try {
            const res = await axios.get("/api/v1/message/partners", { withCredentials: true });
            setPartners(res.data.partners);
        } catch (error) {
            console.error("Error fetching partners:", error);
        } finally {
            setLoadingPartners(false);
        }
    };

    const fetchMessages = async () => {
        try {
            const url = selectedPartner.isGroup 
                ? `/api/v1/message/${authUser._id}/${selectedPartner._id}?isGroup=true`
                : `/api/v1/message/${authUser._id}/${selectedPartner._id}`;
            const res = await axios.get(url, { withCredentials: true });
            const mappedMessages = res.data.messages.map((m) => ({
                _id: m._id,
                sender: m.sender,
                content: m.content,
                isUnsent: m.isUnsent,
                fileUrl: m.fileUrl,
                fileType: m.fileType,
                replyTo: m.replyTo,
                reactions: m.reactions || [],
                fromSelf: m.sender._id ? m.sender._id === authUser._id : m.sender === authUser._id,
                senderName: m.sender.name || 'Unknown'
            }));
            setMessages(mappedMessages);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const filteredPartners = partners.filter(p => {
        // Type filter
        if (filter === 'group' && !p.isGroup) return false;
        if (filter === 'private' && p.isGroup) return false;
        
        // Read status filter
        if (showUnreadOnly && p.unreadCount === 0) return false;
        
        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return p.name?.toLowerCase().includes(term) || p.email?.toLowerCase().includes(term);
        }
        return true;
    });

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!currentMessage.trim() && !selectedFile) return;

        const msgData = {
            sender: authUser._id,
            receiver: selectedPartner.isGroup ? undefined : selectedPartner._id,
            projectId: selectedPartner.isGroup ? selectedPartner._id : undefined,
            isGroup: selectedPartner.isGroup,
            content: currentMessage,
            replyTo: replyingTo ? replyingTo._id : undefined
        };

        const formData = new FormData();
        Object.keys(msgData).forEach(key => {
            if (msgData[key] !== undefined) formData.append(key, msgData[key]);
        });
        if (selectedFile) formData.append("file", selectedFile);

        try {
            const res = await axios.post("/api/v1/message", formData, { 
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" }
            });
            const savedMsg = res.data.message;
            
            setMessages((prev) => [...prev, { 
                ...msgData, 
                _id: savedMsg._id, 
                fromSelf: true, 
                isUnsent: false,
                fileUrl: savedMsg.fileUrl,
                fileType: savedMsg.fileType,
                replyTo: savedMsg.replyTo,
                reactions: []
            }]);
            setCurrentMessage("");
            setSelectedFile(null);
            setReplyingTo(null);

            clearTimeout(typingTimeoutRef.current);
            socket.current.emit("stop-typing", msgData);
            
            // Re-emit with ID so others can unsend it
            socket.current.emit("send-msg", { 
                ...msgData, 
                messageId: savedMsg._id, 
                fileUrl: savedMsg.fileUrl, 
                fileType: savedMsg.fileType,
                replyTo: savedMsg.replyTo
            });

            // Update partner sorting
            setPartners((prev) => {
                let updated = prev.map(p => {
                    if (p._id === selectedPartner._id) {
                        return { ...p, latestMessageAt: new Date().toISOString() };
                    }
                    return p;
                });
                return updated.sort((a, b) => new Date(b.latestMessageAt || 0) - new Date(a.latestMessageAt || 0));
            });
        } catch (error) {
            console.error("Error saving message:", error);
            toast.error("Không thể gửi tin nhắn.");
        }
    };

    const handleUnsend = async (messageId) => {
        try {
            await axios.delete(`/api/v1/message/unsend/${messageId}`, { withCredentials: true });
            setMessages((prev) => prev.map(msg => msg._id === messageId ? { ...msg, isUnsent: true } : msg));
            socket.current.emit("unsend-msg", {
                messageId,
                sender: authUser._id,
                receiver: selectedPartner.isGroup ? undefined : selectedPartner._id,
                projectId: selectedPartner.isGroup ? selectedPartner._id : undefined,
                isGroup: selectedPartner.isGroup
            });
            setActiveMessageId(null);
            toast.success("Đã thu hồi tin nhắn.");
        } catch (error) {
            toast.error("Không thể thu hồi tin nhắn.");
        }
    };

    const handleDelete = async (messageId) => {
        try {
            await axios.delete(`/api/v1/message/delete/${messageId}`, { withCredentials: true });
            setMessages((prev) => prev.filter(msg => msg._id !== messageId));
            setActiveMessageId(null);
            toast.success("Đã xóa tin nhắn khỏi phía bạn.");
        } catch (error) {
            toast.error("Không thể xóa tin nhắn.");
        }
    };

    const handleReaction = async (messageId, emoji) => {
        try {
            const res = await axios.post(`/api/v1/message/react/${messageId}`, { emoji }, { withCredentials: true });
            const updatedReactions = res.data.reactions;
            
            setMessages((prev) => prev.map(msg => msg._id === messageId ? { ...msg, reactions: updatedReactions } : msg));
            socket.current.emit("react-msg", {
                messageId,
                reactions: updatedReactions,
                sender: authUser._id,
                receiver: selectedPartner.isGroup ? undefined : selectedPartner._id,
                projectId: selectedPartner.isGroup ? selectedPartner._id : undefined,
                isGroup: selectedPartner.isGroup
            });
            setShowReactionsFor(null);
        } catch (error) {
            console.error("Error reacting:", error);
        }
    };

    const handleTyping = (e) => {
        setCurrentMessage(e.target.value);
        if (!selectedPartner) return;

        const typingData = {
            sender: authUser._id,
            receiver: selectedPartner.isGroup ? undefined : selectedPartner._id,
            projectId: selectedPartner.isGroup ? selectedPartner._id : undefined,
            isGroup: selectedPartner.isGroup
        };

        socket.current.emit("typing", typingData);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socket.current.emit("stop-typing", typingData);
        }, 2000);
    };

    if (!authUser || authUser.role === 'Admin') return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform transform hover:scale-105 flex items-center justify-center"
                >
                    <MessageSquare size={24} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 h-[500px] flex flex-col border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-5">
                    {/* Header */}
                    <div className="bg-blue-600 text-white p-4 flex items-center justify-between shadow-md z-10 relative">
                        <div className="flex items-center gap-2 max-w-[70%]">
                            {selectedPartner && (
                                <button onClick={() => {
                                    setSelectedPartner(null);
                                    setShowMembers(false);
                                }} className="hover:bg-blue-700 p-1 rounded-full transition flex-shrink-0">
                                    <ChevronLeft size={20} />
                                </button>
                            )}
                            <div className="flex flex-col truncate">
                                <span className="font-semibold text-sm sm:text-base truncate">
                                    {selectedPartner ? `${selectedPartner.name} ${selectedPartner.role && !selectedPartner.isGroup ? `(${selectedPartner.role === 'Teacher' ? 'Giảng viên' : 'Sinh viên'})` : ''}` : "Tin nhắn"}
                                </span>
                                {selectedPartner && (
                                    <span className="text-xs text-blue-200 flex items-center gap-1 truncate">
                                        {!selectedPartner.isGroup && (
                                            <Circle size={8} className={onlineUsers.has(selectedPartner._id) ? "fill-green-400 text-green-400 flex-shrink-0" : "fill-gray-300 text-gray-300 flex-shrink-0"} />
                                        )}
                                        {selectedPartner.isGroup ? selectedPartner.email : (onlineUsers.has(selectedPartner._id) ? "Active now" : "Offline")}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {selectedPartner?.isGroup && (
                                <button onClick={() => setShowMembers(!showMembers)} className={`p-1 rounded-full transition ${showMembers ? 'bg-blue-800' : 'hover:bg-blue-700'}`} title="View Members">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded-full transition">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden bg-gray-50 flex flex-col">
                        {!selectedPartner ? (
                            // Partner List with Search and Filter
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-3 bg-white border-b border-gray-100 flex flex-col gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Search name or email..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-gray-100 text-sm border-none outline-none px-3 py-2 rounded-lg"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setFilter("all")} className={`flex-1 text-[11px] py-1.5 rounded-md transition ${filter === 'all' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Tất cả</button>
                                        <button onClick={() => setFilter("private")} className={`flex-1 text-[11px] py-1.5 rounded-md transition ${filter === 'private' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Cá nhân</button>
                                        <button onClick={() => setFilter("group")} className={`flex-1 text-[11px] py-1.5 rounded-md transition ${filter === 'group' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Nhóm</button>
                                    </div>
                                    <button 
                                        onClick={() => setShowUnreadOnly(!showUnreadOnly)} 
                                        className={`w-full flex items-center justify-center gap-2 text-[11px] py-1.5 rounded-md transition ${showUnreadOnly ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${showUnreadOnly ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                                        Chỉ hiện tin nhắn chưa đọc
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {loadingPartners ? (
                                        <div className="text-center p-4 text-gray-500 text-sm animate-pulse">Đang tải liên hệ...</div>
                                    ) : filteredPartners.length === 0 ? (
                                        <div className="text-center p-4 text-gray-500 text-sm">Không tìm thấy liên hệ.</div>
                                    ) : (
                                        filteredPartners.map((partner) => (
                                            <button
                                                key={partner._id}
                                                onClick={() => {
                                                    setSelectedPartner(partner);
                                                    setShowMembers(false);
                                                    setPartners(prev => prev.map(p => p._id === partner._id ? { ...p, unreadCount: 0 } : p));
                                                }}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition group text-left relative"
                                            >
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg group-hover:bg-blue-200 transition">
                                                        {partner.isGroup ? 'G' : partner.name.charAt(0)}
                                                    </div>
                                                    {!partner.isGroup && (
                                                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
                                                            <Circle size={10} className={onlineUsers.has(partner._id) ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 truncate">
                                                    <div className={`text-sm truncate flex items-center gap-1 ${partner.unreadCount > 0 ? 'font-bold text-black' : 'font-medium text-gray-800'}`}>
                                                        <span>{partner.name}</span>
                                                        {!partner.isGroup && partner.role && (
                                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                                                {partner.role === 'Teacher' ? 'GV' : 'SV'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`text-xs truncate ${partner.unreadCount > 0 ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>{partner.email}</div>
                                                </div>
                                                {partner.unreadCount > 0 && (
                                                    <div className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                                                        {partner.unreadCount}
                                                    </div>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : showMembers ? (
                            // Group Members List
                            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                                <div className="p-3 bg-gray-50 border-b border-gray-100 font-medium text-sm text-gray-700">
                                    Group Members ({selectedPartner.members?.length || 0})
                                </div>
                                <div className="flex-1 overflow-y-auto p-2">
                                    {selectedPartner.members?.map(member => (
                                        <div key={member._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition">
                                            <div className="relative">
                                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                                                    {member.name.charAt(0)}
                                                </div>
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                                                    <Circle size={8} className={onlineUsers.has(member._id) ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"} />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-800 text-sm">
                                                    {member.name} {member._id === authUser._id && "(Bạn)"}
                                                </div>
                                                <div className="text-xs text-gray-500">{member.role === 'Teacher' ? 'Giảng viên' : 'Sinh viên'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            // Chat Area
                            <div className="flex-1 flex flex-col h-full relative overflow-hidden">
                                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className={`flex flex-col ${msg.fromSelf ? "items-end" : "items-start"} relative group`}>
                                            {!msg.fromSelf && selectedPartner?.isGroup && (
                                                <span className="text-[10px] text-gray-400 ml-1 mb-1">
                                                    {msg.senderName || msg.sender?.name || "Member"}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2 relative">
                                                {msg.fromSelf && !msg.isUnsent && (
                                                    <button onClick={() => setActiveMessageId(activeMessageId === msg._id ? null : msg._id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                                    </button>
                                                )}
                                                
                                                <div
                                                    className={`max-w-[75%] px-4 py-2 text-sm shadow-sm break-words ${
                                                        msg.isUnsent ? "bg-transparent border border-gray-200 text-gray-400 italic rounded-2xl" :
                                                        msg.fromSelf
                                                            ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
                                                            : "bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm"
                                                    }`}
                                                >
                                                    {msg.isUnsent ? "Tin nhắn đã bị thu hồi" : (
                                                        <div className="flex flex-col gap-2">
                                                            {msg.replyTo && (
                                                                <div className={`p-2 rounded-lg text-xs mb-1 border-l-2 ${msg.fromSelf ? 'bg-blue-700/30 border-blue-200' : 'bg-gray-100 border-gray-300'}`}>
                                                                    <div className="font-semibold opacity-70 truncate">{msg.replyTo.sender?.name || 'Ai đó'}</div>
                                                                    <div className="opacity-90 truncate">{msg.replyTo.content || (msg.replyTo.fileUrl ? 'Tệp đính kèm' : '...')}</div>
                                                                </div>
                                                            )}
                                                            {msg.fileUrl && msg.fileType === 'image' && (
                                                                <img src={msg.fileUrl} alt="attachment" className="max-w-full rounded-md mt-1 mb-1 max-h-48 object-contain bg-black/5" />
                                                            )}
                                                            {msg.fileUrl && msg.fileType === 'document' && (
                                                                <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-black/10 p-2 rounded-lg text-xs hover:bg-black/20 transition">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                                                    Xem tài liệu đính kèm
                                                                </a>
                                                            )}
                                                            {msg.content}
                                                        </div>
                                                    )}

                                                    {/* Reactions Display */}
                                                    {msg.reactions && msg.reactions.length > 0 && !msg.isUnsent && (
                                                        <div className={`absolute -bottom-3 ${msg.fromSelf ? 'right-2' : 'left-2'} bg-white shadow-md border border-gray-100 rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-1 z-10 whitespace-nowrap`}>
                                                            {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => (
                                                                <span key={emoji}>{emoji}</span>
                                                            ))}
                                                            {msg.reactions.length > 1 && <span className="text-gray-500">{msg.reactions.length}</span>}
                                                        </div>
                                                    )}
                                                </div>

                                                {!msg.fromSelf && !msg.isUnsent && (
                                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                                                        <button onClick={() => setShowReactionsFor(showReactionsFor === msg._id ? null : msg._id)} className="p-1 text-gray-400 hover:text-gray-600 transition" title="Thả cảm xúc">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                                                        </button>
                                                        <button onClick={() => setActiveMessageId(activeMessageId === msg._id ? null : msg._id)} className="p-1 text-gray-400 hover:text-gray-600 transition">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Reaction Menu */}
                                                {showReactionsFor === msg._id && !msg.isUnsent && (
                                                    <div className={`absolute top-8 ${msg.fromSelf ? "right-12" : "left-12"} z-20 bg-white rounded-full shadow-xl border border-gray-100 p-1 flex items-center gap-1`}>
                                                        {['❤️', '😆', '👍', '😢', '😡'].map(emoji => (
                                                            <button key={emoji} onClick={() => handleReaction(msg._id, emoji)} className="hover:bg-gray-100 p-1.5 rounded-full transition text-base">
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Context Menu */}
                                                {activeMessageId === msg._id && !msg.isUnsent && (
                                                    <div className={`absolute top-8 ${msg.fromSelf ? "right-6" : "left-12"} z-20 w-32 bg-white rounded-lg shadow-xl border border-gray-100 py-1`}>
                                                        <button onClick={() => { setReplyingTo(msg); setActiveMessageId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Trả lời</button>
                                                        {msg.fromSelf && (
                                                            <button onClick={() => handleUnsend(msg._id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Thu hồi</button>
                                                        )}
                                                        <button onClick={() => handleDelete(msg._id)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Xóa ở phía tôi</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Typing Indicator */}
                                    {isTyping && (
                                        <div className="flex justify-start">
                                            <div className="bg-white border border-gray-100 text-gray-500 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1 shadow-sm w-16">
                                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                {(selectedFile || replyingTo) && (
                                    <div className="px-3 pt-2 pb-1 bg-white flex flex-col gap-2">
                                        {replyingTo && (
                                            <div className="bg-gray-50 border-l-4 border-blue-500 text-gray-700 text-xs px-3 py-2 rounded-r-lg flex items-center justify-between shadow-sm">
                                                <div className="flex flex-col truncate max-w-[90%]">
                                                    <span className="font-semibold text-blue-700 mb-0.5 truncate">Đang trả lời {replyingTo.senderName || replyingTo.sender?.name || 'ai đó'}</span>
                                                    <span className="truncate opacity-80">{replyingTo.content || (replyingTo.fileUrl ? 'Tệp đính kèm' : '...')}</span>
                                                </div>
                                                <button onClick={() => setReplyingTo(null)} className="hover:text-red-500 p-1"><X size={14} /></button>
                                            </div>
                                        )}
                                        {selectedFile && (
                                            <div className="bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-full w-fit">
                                                <span className="truncate">{selectedFile.name}</span>
                                                <button onClick={() => setSelectedFile(null)} className="hover:text-red-500"><X size={14} /></button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100">
                                    <div className="flex items-center bg-gray-50 rounded-full border border-gray-200 px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all shadow-inner">
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRef.current.click()}
                                            className="p-2 text-gray-400 hover:text-blue-600 rounded-full transition flex-shrink-0"
                                            title="Attach file"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                                        </button>
                                        <input
                                            type="text"
                                            value={currentMessage}
                                            onChange={handleTyping}
                                            placeholder="Message..."
                                            className="flex-1 bg-transparent border-none outline-none py-2 px-2 text-sm text-gray-800 placeholder-gray-400 min-w-0"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!currentMessage.trim() && !selectedFile}
                                            className={`p-2 rounded-full transition flex-shrink-0 ${currentMessage.trim() || selectedFile ? "text-blue-600 hover:bg-blue-50" : "text-gray-400 cursor-not-allowed"}`}
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
