'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Send, Person, SmartToy } from '@mui/icons-material';

const Message = ({ content, isUser }) => (
  <Box 
    sx={{ 
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      mb: 2
    }}
  >
    <Card 
      sx={{ 
        maxWidth: '70%',
        bgcolor: isUser ? 'primary.light' : 'grey.100'
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {isUser ? <Person /> : <SmartToy />}
          <Typography variant="subtitle2" sx={{ ml: 1 }}>
            {isUser ? 'You' : 'Assistant'}
          </Typography>
        </Box>
        <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography>
      </CardContent>
    </Card>
  </Box>
);

export default function ResearchChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [error, setError] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatHistory = (messages) => {
    return messages.map(msg => ({
      role: msg.isUser ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    
    // Add user message immediately
    setMessages(prev => [...prev, { content: userMessage, isUser: true }]);
    
    setLoading(true);
    try {
      const response = await fetch('/api/research-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: userMessage,
          history: formatHistory(messages),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, { content: data.response, isUser: false }]);
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Research Chat Assistant
      </Typography>

      <Paper 
        elevation={3} 
        sx={{ 
          flex: 1, 
          mb: 2, 
          p: 2, 
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {messages.length === 0 ? (
          <Box 
            sx={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'text.secondary'
            }}
          >
            <Typography variant="body1">
              Start a conversation about research papers...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1 }}>
            {messages.map((msg, idx) => (
              <Message key={idx} {...msg} />
            ))}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Paper>

      {error && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light' }}>
          <Typography color="error">
            Error: {error}
          </Typography>
        </Paper>
      )}

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your research question..."
            disabled={loading}
            sx={{ flex: 1 }}
          />
          <IconButton 
            type="submit" 
            color="primary" 
            disabled={loading || !input.trim()}
            sx={{ alignSelf: 'flex-end' }}
          >
            {loading ? <CircularProgress size={24} /> : <Send />}
          </IconButton>
        </Box>
      </form>
    </Box>
  );
}