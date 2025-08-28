// AdminChat.jsx
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import TabBarr from "../../component/tabbar/TabBar.jsx";
import "./AdminChat.scss";

/** ====== Config ====== */
const SOCKET_URL = "http://14.225.198.220:5555";
const API_URL    = "http://14.225.198.220:5555/api";
const ADMIN_ID   = "685e2fea79bd687050637953";

// Chuẩn hoá mọi kiểu id về string
const normId = (v) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (v._id) return String(v._id);
    if (v.$oid) return String(v.$oid);
  }
  return String(v);
};

export default function AdminChat() {
  const socketRef = useRef(null);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [users, setUsers]             = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const messagesEndRef = useRef(null);

  /** Kết nối socket 1 lần */
  useEffect(() => {
    const s = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = s;

    // Join khi đã connect
    s.on("connect", () => {
      s.emit("join", ADMIN_ID);
      console.log("🔌 Admin connected, joined room:", ADMIN_ID);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, []);

  /** Auto scroll xuống cuối khi có tin mới */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /** Poll danh sách hội thoại */
  useEffect(() => {
    fetchConversations();
    const itv = setInterval(fetchConversations, 15000);
    return () => clearInterval(itv);
  }, []);

  /** Lắng nghe realtime – chỉ add nếu đúng panel đang mở + CHỐNG TRÙNG */
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const handleReceive = (msg) => {
      const openedId = normId(selectedUser?.userId);
      const sId = normId(msg?.senderId);
      const rId = normId(msg?.receiverId);

      // Chỉ append khi tin thuộc cuộc đang mở với admin
      if (openedId && (sId === openedId || rId === openedId)) {
        setMessages((prev) => {
          // chống trùng khi đã add từ ACK
          if (msg._id && prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        requestAnimationFrame(() =>
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        );
      }

      // Luôn refresh panel trái
      fetchConversations();
    };

    s.on("receiveMessage", handleReceive);
    return () => s.off("receiveMessage", handleReceive);
  }, [selectedUser]);

  const fetchConversations = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/messages/conversations`);
      setUsers(data);
    } catch (e) {
      console.error("❌ Lỗi fetch conversations:", e);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const { data } = await axios.get(`${API_URL}/messages/${userId}`);
      setMessages(data);
      requestAnimationFrame(() =>
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      );
    } catch (e) {
      console.error("❌ Lỗi fetch messages:", e);
    }
  };

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setMessages([]); // xoá tạm để tránh “mượn” tin của cuộc trước
    fetchMessages(u.userId);
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedUser) return;

    const payload = {
      senderId: ADMIN_ID,
      receiverId: selectedUser.userId,
      message: input.trim(),
    };

    const addLocal = (msg) => {
      setMessages((prev) => {
        if (msg._id && prev.some((m) => m._id === msg._id)) return prev; // chống trùng
        return [...prev, msg];
      });
      requestAnimationFrame(() =>
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      );
    };

    try {
      const s = socketRef.current;

      if (s && s.connected) {
        let acked = false;

        // emit có timeout: nếu quá 2s không ACK thì fallback
        s.timeout(2000).emit("sendMessage", payload, (err, ack) => {
          if (!err && ack?.ok && ack.message) {
            acked = true;
            addLocal(ack.message); // append ngay từ ACK
          }
        });

        setTimeout(async () => {
          if (!acked) {
            // fallback: nạp lại từ DB
            await fetchMessages(selectedUser.userId);
          }
        }, 2500);
      } else {
        // fallback HTTP khi socket chưa kết nối
        const { data } = await axios.post(`${API_URL}/messages`, payload);
        addLocal({
          _id: data._id,
          senderId: String(data.senderId),
          receiverId: String(data.receiverId),
          message: data.message,
          imageUrl: data.imageUrl || null,
          timestamp: data.timestamp,
        });
      }
    } catch (e) {
      console.error("❌ Lỗi gửi tin:", e);
    } finally {
      setInput("");
      fetchConversations();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="admin-chat-page">
      <TabBarr />

      <div className="admin-chat">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <div className="header-content">
              <div className="admin-avatar">
                <svg className="chat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h1 className="admin-title">Admin Chat</h1>
                <p className="admin-subtitle">Quản lý hội thoại</p>
              </div>
            </div>
          </div>

          <div className="user-list-container">
            <div className="user-list">
              <h3 className="conversation-title">HỘI THOẠI ({users.length})</h3>
              <div className="users">
                {users.map((u) => (
                  <button
                    key={normId(u.userId)}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className={`user-item ${normId(selectedUser?.userId) === normId(u.userId) ? "selected" : ""}`}
                  >
                    <div className="user-content">
                      <div className="user-avatar">
                        <span className="avatar-text">{String(u.email).charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="user-info">
                        <h4 className="user-name">{String(u.email).split("@")[0]}</h4>
                        <p className="last-message">
                          {u.lastMessage === "" ? "Đã gửi hình ảnh" : u.lastMessage}
                        </p>
                        <p className="timestamp">
                          {new Date(u.updatedAt).toLocaleString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                {!users.length && <div className="no-convo">Chưa có hội thoại</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          {selectedUser ? (
            <>
              <div className="chat-header">
                <div className="chat-header-content">
                  <div className="selected-user-avatar">
                    <span className="selected-avatar-text">
                      {String(selectedUser.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="selected-user-name">
                      {String(selectedUser.email).split("@")[0]}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="messages-container">
                {messages.map((m, i) => {
                  const sender = normId(m.senderId && m.senderId._id ? m.senderId._id : m.senderId);
                  const isAdmin = sender === ADMIN_ID;
                  return (
                    <div key={m._id || i} className={`message-wrapper ${isAdmin ? "admin" : "user"}`}>
                      <div className={`message ${isAdmin ? "message-admin" : "message-user"}`}>
                        {m.imageUrl ? (
                          <img src={m.imageUrl} alt="img" className="message-image" />
                        ) : (
                          <p className="message-text">{m.message}</p>
                        )}
                        {m.timestamp && (
                          <p className="message-time">
                            {new Date(m.timestamp).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="input-area">
                <div className="input-container">
                  <div className="input-wrapper">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Nhập tin nhắn..."
                      rows={1}
                      className="message-input"
                    />
                  </div>
                  <button onClick={sendMessage} disabled={!input.trim()} className="send-button">
                    <svg className="send-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Gửi
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-content">
                <div className="empty-icon">
                  <svg className="empty-chat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="empty-title">Chọn hội thoại</h3>
                <p className="empty-description">
                  Hãy chọn một người dùng từ danh sách bên trái để bắt đầu trò chuyện
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
