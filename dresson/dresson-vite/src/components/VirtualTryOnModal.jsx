import React, { useState } from 'react';
import axios from 'axios';
import '../styles/VirtualTryOn.css';

const VirtualTryOnModal = ({ product, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResultImage(null);
      setError('');
    }
  };

  const handleTryOn = async () => {
    if (!selectedFile) {
      setError('Please upload your photo first!');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('product', product.id);
    formData.append('user_image', selectedFile);

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post('http://localhost:8000/api/virtual-tryon/clothes/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data && response.data.processed_image) {
        setResultImage(`http://localhost:8000${response.data.processed_image}`);
      } else {
        // If it returns PROCESSING, we might need to poll, but for the fallback it's synchronous
        setError('Try-on is processing or failed. Please try again later.');
      }
    } catch (err) {
      console.error('Try-on error:', err);
      setError('An error occurred while processing your image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vton-modal-overlay" onClick={onClose}>
      <div className="vton-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="vton-close-btn" onClick={onClose}>&times;</button>
        
        <h2>Virtual Try-On</h2>
        <p>جرب الملابس (Trying: {product.name})</p>

        {!resultImage ? (
          <>
            <label className="vton-upload-area">
              <input type="file" className="vton-file-input" accept="image/*" onChange={handleFileChange} />
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="vton-preview-img" />
              ) : (
                <div style={{ color: '#aaa' }}>
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '40px', marginBottom: '10px' }}></i>
                  <p>Click to upload a clear photo of yourself</p>
                </div>
              )}
            </label>

            {error && <p style={{ color: '#ff4444' }}>{error}</p>}

            {loading ? (
              <div className="vton-loading-spinner"></div>
            ) : (
              <button className="vton-submit-btn" onClick={handleTryOn} disabled={!selectedFile}>
                Try It On!
              </button>
            )}
          </>
        ) : (
          <div className="vton-result-area">
            <h3>✨ Looking Good! ✨</h3>
            <img src={resultImage} alt="Try-on Result" className="vton-preview-img" />
            <button className="vton-submit-btn" onClick={() => { setResultImage(null); setSelectedFile(null); setPreviewUrl(null); }} style={{ marginTop: '15px' }}>
              Try Another Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualTryOnModal;
