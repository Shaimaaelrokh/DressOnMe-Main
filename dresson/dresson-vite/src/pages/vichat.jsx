import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { FaPlus, FaHistory, FaPaperPlane, FaImage, FaHome, FaTrash, FaBars } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom'; 
import backgroundVideo from "../assets/chatt.mp4"; 
import { useAuth } from '../context/AuthContext';
import '../styles/Vichat.css';

/* ─── Product Card Component ─── */
const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  
  return (
    <div
      style={{
        width: '160px',
        minWidth: '160px',
        backgroundColor: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: '1px solid #f0f0f0',
        flexShrink: 0,
      }}
      onClick={() => {
        if (product.id) {
          navigate('/profile', { state: { sellerId: product.seller_id, scrollToPostId: product.id } });
        }
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(123,97,255,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
      }}
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          style={{
            width: '100%',
            height: '160px',
            objectFit: 'contain',
            backgroundColor: '#fafafa',
            display: 'block',
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '160px',
          backgroundColor: '#f5f0ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#bbb',
          fontSize: '13px',
        }}>
          لا توجد صورة
        </div>
      )}
      <div style={{ padding: '10px 12px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#333',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: '6px',
        }}>
          {product.name}
        </div>
        <div style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#7B61FF',
        }}>
          {product.price} {product.currency === 'SAR' ? 'ريال سعودي' : product.currency === 'USD' ? 'دولار' : product.currency === 'TRY' ? 'ليرة تركية' : product.currency === 'AED' ? 'درهم إماراتي' : product.currency === 'EGP' ? 'جنيه' : product.currency || 'جنيه'}
        </div>
      </div>
    </div>
  );
};

/* ─── Products Carousel ─── */
const ProductsCarousel = ({ products }) => {
  if (!products || products.length === 0) return null;
  
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      overflowX: 'auto',
      padding: '12px 4px',
      scrollBehavior: 'smooth',
      direction: 'ltr',  // Cards scroll naturally LTR
    }}>
      {products.map((product, index) => (
        <ProductCard key={`product-${product.id}-${index}`} product={product} />
      ))}
    </div>
  );
};


const Vichat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef(null);
  const wsRef = useRef(null);
  const navigate = useNavigate(); 
  const { user } = useAuth();

  const [conversationId, setConversationId] = useState(null);
  const [conversationsList, setConversationsList] = useState([]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (user) {
      setConversationId(user.id);
    } else {
      setConversationId(2);
    }
  }, [user]);

  useEffect(() => {
    if (!conversationId) return;
    const token = localStorage.getItem('access_token');
    const wsBaseUrl = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000/ws";
    const url = token ? `${wsBaseUrl}/chat/${conversationId}/?token=${token}` : `${wsBaseUrl}/chat/${conversationId}/`;
    wsRef.current = new WebSocket(url);
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'history') {
        const loadedMessages = data.messages.map(msg => ({
          role: msg.role,
          text: msg.content,
          image: msg.image ? `data:image/jpeg;base64,${msg.image}` : null,
          products: msg.products || []
        }));
        setMessages(loadedMessages);
      } else if (data.type === 'conversations_list') {
        setConversationsList(data.conversations);
      } else if (data.type === 'conversation_created') {
        setConversationId(data.id);
      } else {
        // Normal message with optional products
        setMessages(prev => [...prev, { 
          role: data.role, 
          text: data.message,
          products: data.products || []
        }]);
        setLoading(false);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket Error:", error);
      setLoading(false);
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [conversationId]);

  const loadHistory = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'request_history' }));
    }
  };

  const handleNewChat = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'create_conversation' }));
    }
  };

  const handleDeleteConversation = (e, id) => {
    e.stopPropagation();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'delete_conversation', id }));
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
      }
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  //خلوا بالكم دي بس عشان اضغط الصور عشان اقدر اخد اكبر عدد من التوكينز 
  const processImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          //صغرت ل 500 بيكسل 
          const MAX_WIDTH = 500;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          //الصيغه دي بتخلب الكواليتي قل سنه بس مقبوله جدا بس كويسه للمساحه ولعدد التوكينز 
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          resolve(compressedBase64);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    if (!input && !selectedImage) return;
    setLoading(true);
    const userText = input;
    const currentImage = selectedImage;
    const imageUrl = currentImage ? URL.createObjectURL(currentImage) : null;

    setMessages(prev => [...prev, { role: "user", text: userText, image: imageUrl, products: [] }]);
    setInput("");
    setSelectedImage(null);

    try {
      let imageBase64 = "";
      if (currentImage) {
        imageBase64 = await processImage(currentImage);
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          message: userText || "Analyze this picture",
          image: imageBase64 || undefined
        }));
      } else {
        throw new Error("WebSocket is not connected");
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: "assistant", text: "حدث خطأ في الاتصال أو تم تجاوز الحد المسموح.", products: [] }]);
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <video autoPlay loop muted playsInline className="video-background">
        <source src={backgroundVideo} type="video/mp4" />
      </video>
      <div className="video-overlay"></div>

      <div className="main-card">
        <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
        {/* ChatGPT Style Sidebar */}
        <div className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <button className="new-chat-btn" onClick={handleNewChat}>
            <FaPlus /> New Chat
          </button>
          
          <div style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginTop: '10px', marginRight: '5px' }}>
            تاريخ المحادثات
          </div>
          
          <div className="history-list">
            {conversationsList.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', marginTop: '20px' }}>
                لا توجد محادثات سابقة
              </div>
            ) : (
              conversationsList.map(c => (
                <div 
                  key={c.id} 
                  className="history-item"
                  style={{
                    backgroundColor: c.id === conversationId ? 'rgba(123, 97, 255, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                    border: c.id === conversationId ? '1px solid rgba(123, 97, 255, 0.3)' : '1px solid transparent',
                    color: c.id === conversationId ? '#7B61FF' : '#444',
                    fontWeight: c.id === conversationId ? 'bold' : 'normal'
                  }}
                  onClick={() => {
                    setConversationId(c.id);
                    setIsSidebarOpen(false);
                  }}
                  title={c.title}
                >
                  <span style={{ fontSize: '14px' }}>💬</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {c.title}
                  </span>
                  <div 
                    onClick={(e) => handleDeleteConversation(e, c.id)}
                    style={{
                      padding: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: c.id === conversationId ? '#7B61FF' : '#aaa',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff4d4f'}
                    onMouseLeave={(e) => e.currentTarget.style.color = c.id === conversationId ? '#7B61FF' : '#aaa'}
                  >
                    <FaTrash size={12} />
                  </div>
                </div>
              ))
            )}
          </div>
          
          <button className="home-btn" onClick={() => navigate('/Home')}>
            <FaHome style={{ marginLeft: '8px' }} /> Back to Home
          </button>
        </div>

        <div className="chat-section">
          <div className="chat-header">
            <h2>Wella is here for you ✨</h2>
            <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
              <FaBars />
            </button>
          </div>
          
          <div className="messages-area">
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '50px', color: '#AAA' }}>
                <p>Ask Wella anything and she will answer you instantly.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i}>
                <div className={m.role === 'user' ? "user-bubble" : "bot-bubble"}>
                  {m.image && <img src={m.image} alt="uploaded" style={{ maxWidth: '200px', borderRadius: '15px', marginBottom: '10px', display: 'block' }} />}
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
                {/* Product Cards - shown below bot message */}
                {m.role === 'assistant' && m.products && m.products.length > 0 && (
                  <div style={{
                    alignSelf: 'flex-start',
                    maxWidth: '90%',
                    marginTop: '8px',
                  }}>
                    <ProductsCarousel products={m.products} />
                  </div>
                )}
              </div>
            ))}
            {loading && <div style={{ color: '#7B61FF', fontSize: '13px', marginRight: '10px' }}>Wella تفكر في إجابة...</div>}
            <div ref={chatEndRef} />
          </div>

          <div className="input-wrapper">
            <label style={{ cursor: 'pointer', color: '#7B61FF' }}>
              <FaImage size={20} />
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleImageChange} 
                style={{ display: 'none' }} 
              />
            </label>
            <input 
              className="text-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Wella anything..."
            />
            <button className="send-btn" onClick={sendMessage} disabled={loading}>
              <FaPaperPlane size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vichat;