import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const ChatPage = () => {
  const [messages, setMessages] = useState([]); 
  const [input, setInput] = useState(''); 
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const wsRef = useRef(null);
  const { user } = useAuth();
  
  // Connect to Django WebSocket
  useEffect(() => {
    const conversationId = user?.id || 1; // Default to 1 if not logged in
    const wsBaseUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";
    wsRef.current = new WebSocket(`${wsBaseUrl}/chat/${conversationId}/`);
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, { role: data.role, text: data.message }]);
      setLoading(false);
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket Error:", error);
      setLoading(false);
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [user]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async () => {
    if (!input.trim()) return; 

    // 1. إضافة رسالة المستخدم للشاشة
    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    
    const textToSend = input;
    setInput('');
    setLoading(true);

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ message: textToSend }));
      } else {
        throw new Error("WebSocket is not connected");
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', text: "للاسف فيه مشكلة تقنية، جربي تاني." }]);
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'Arial', direction: 'rtl' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>مساعد Clothes Factory الذكي 🤖</h2>
      
      <div style={{ 
        border: '1px solid #ddd', 
        height: '450px', 
        overflowY: 'auto', 
        marginBottom: '15px', 
        padding: '15px', 
        borderRadius: '12px', 
        backgroundColor: '#f4f7f6', 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', 
            margin: '8px 0', 
            maxWidth: '85%' 
          }}>
            <div style={{ 
              background: msg.role === 'user' ? '#007bff' : '#ffffff', 
              color: msg.role === 'user' ? 'white' : '#333', 
              padding: '12px 16px', 
              borderRadius: '18px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              lineHeight: '1.5'
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <p style={{ textAlign: 'center', color: '#888' }}>بيفكر في أحلى طقم... ✨</p>}
        <div ref={chatEndRef} />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
          placeholder="اسألي خبير الموضة عن أي استايل..." 
          style={{ 
            flex: 1, 
            padding: '14px', 
            borderRadius: '25px', 
            border: '1px solid #ccc', 
            outline: 'none',
            fontSize: '16px'
          }} 
        />
        <button 
          onClick={handleSendMessage} 
          disabled={loading} 
          style={{ 
            width: '55px', 
            height: '55px', 
            borderRadius: '50%', 
            border: 'none', 
            backgroundColor: '#28a745', 
            color: 'white', 
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {loading ? '...' : '➤'}
        </button>
      </div>
    </div>
  );
};

export default ChatPage;