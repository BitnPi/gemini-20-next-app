'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import io from 'socket.io-client';
import { Alert, AlertTitle, Box, IconButton, Collapse } from '@mui/material';
import { Warning, Error, CheckCircle, Close } from '@mui/icons-material';
import { analyzeForSecurity } from './utils/securityAnalysis';

export default function VideoAnalysis() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [socket, setSocket] = useState(null);
  const [securityAlert, setSecurityAlert] = useState(null);
  const [alertSound] = useState(new Audio('/alert.mp3')); // Add an alert sound file to your public folder
  const [alertOpen, setAlertOpen] = useState(true);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('analysisStatus', (data) => {
      setStatus(data);
      if (data.status === 'error') {
        setError(data.message);
        setLoading(false);
      }
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (analysis) {
      const securityAnalysis = analyzeForSecurity(analysis);
      setSecurityAlert(securityAnalysis);
      setAlertOpen(true);
      
      if (securityAnalysis.hasSuspiciousActivity) {
        alertSound.play().catch(error => console.log('Error playing sound:', error));
      }
    }
  }, [analysis, alertSound]);

  const onDrop = useCallback((acceptedFiles) => {
    const videoFile = acceptedFiles[0];
    if (videoFile && videoFile.type.startsWith('video/')) {
      setFile(videoFile);
      setError(null);
    } else {
      setError('Please select a valid video file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': []
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a video file');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setStatus(null);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze video');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAlertSeverity = (severity) => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'info';
    }
  };

  const getStatusIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <Error />;
      case 'medium':
        return <Warning />;
      case 'low':
        return <CheckCircle />;
      default:
        return <Info />;
    }
  };

  return (
    <Box sx={{ maxWidth: '4xl', mx: 'auto', p: 6 }}>
      <h1 className="text-3xl font-bold mb-6">Video Analysis</h1>
      
      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4 cursor-pointer hover:border-blue-500">
        <input {...getInputProps()} />
        <div className="text-center">
          {isDragActive ? (
            <p>Drop the video file here...</p>
          ) : (
            <p>Drag and drop a video file here, or click to select</p>
          )}
          <p className="text-sm text-gray-500 mt-2">Maximum file size: 100MB</p>
        </div>
      </div>

      {file && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">Selected file: {file.name}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !file}
        className={`w-full px-4 py-2 rounded ${
          loading || !file
            ? 'bg-gray-300'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {loading ? 'Processing...' : 'Analyze Video'}
      </button>

      {securityAlert?.hasSuspiciousActivity && (
        <Box sx={{ mt: 2 }}>
          <Collapse in={alertOpen}>
            <Alert 
              severity={getAlertSeverity(securityAlert.severity)}
              icon={getStatusIcon(securityAlert.severity)}
              action={
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={() => setAlertOpen(false)}
                >
                  <Close fontSize="inherit" />
                </IconButton>
              }
              sx={{ mb: 2 }}
            >
              <AlertTitle>
                Security Alert - {securityAlert.severity.toUpperCase()} Risk
              </AlertTitle>
              <div>
                {securityAlert.flags.map((flag, index) => (
                  <div key={index} style={{ marginTop: '0.5rem' }}>
                    {flag}
                  </div>
                ))}
                {securityAlert.timestamps.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Suspicious timestamps:</strong>
                    <ul style={{ listStyleType: 'disc', marginLeft: '1.5rem' }}>
                      {securityAlert.timestamps.map((timestamp, index) => (
                        <li key={index}>{timestamp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Alert>
          </Collapse>
        </Box>
      )}

      {status && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="info">
            {status.message}
          </Alert>
        </Box>
      )}

      {error && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="error">
            {error}
          </Alert>
        </Box>
      )}

      {analysis && (
        <Box sx={{ mt: 4 }}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Analysis Results</h2>
            {!securityAlert?.hasSuspiciousActivity && (
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                <CheckCircle sx={{ mr: 1, fontSize: '1.25rem' }} />
                <span style={{ fontSize: '0.875rem' }}>No suspicious activity detected</span>
              </Box>
            )}
          </div>
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{analysis}</pre>
          </Box>
        </Box>
      )}
    </Box>
  );
}