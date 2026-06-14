import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMakeupHistory, deleteMakeupHistory } from '../api/api';

import { FaTrashAlt, FaArrowLeft as FaArrowLeftIcon, FaMagic as FaMagicIcon } from 'react-icons/fa';

export default function MakeupHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getMakeupHistory();
      const historyArray = data?.results ? data.results : (data || []);
      setHistory(historyArray);
    } catch (error) {
      console.error("Error loading history", error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteMakeupHistory(itemToDelete);
      setHistory(history.filter(item => item.id !== itemToDelete));
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      alert("Failed to delete snapshot.");
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  return (
    <div style={styles.container}>
      <style>{`
        @media (max-width: 768px) {
          .history-nav { flex-direction: column !important; gap: 15px !important; padding: 15px 20px !important; }
          .history-nav-spacer { display: none !important; }
          .history-title { font-size: 20px !important; text-align: center !important; }
          .history-content { padding: 20px 15px !important; }
          .history-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important; gap: 20px !important; }
        }
        @media (max-width: 480px) {
          .history-title { font-size: 18px !important; }
          .history-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <nav style={styles.nav} className="history-nav">
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeftIcon /> Back
        </button>
        <h1 style={styles.title} className="history-title">My Makeup Studio <FaMagicIcon style={{ color: '#ff4488', marginLeft: '10px' }} /></h1>
        <div style={{ width: '80px' }} className="history-nav-spacer"></div>
      </nav>

      <div style={styles.content} className="history-content">
        {loading ? (
          <div style={styles.emptyState}>
            <h2>Loading your glamour...</h2>
          </div>
        ) : history.length === 0 ? (
          <div style={styles.emptyState}>
            <h2>No snapshots yet!</h2>
            <p>Try out our AI Makeup feature and save your favorite looks here.</p>
            <button style={styles.primaryBtn} onClick={() => window.location.href = '/makeup/index.html'}>
              Try AI Makeup Now
            </button>
          </div>
        ) : (
          <div style={styles.grid} className="history-grid">
            {history.map((item) => (
              <div key={item.id} style={styles.card}>
                <div style={styles.imageWrapper}>
                  <img src={item.result_image} alt="Makeup Snapshot" style={styles.image} />
                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDeleteClick(item.id)}
                    title="Delete Snapshot"
                  >
                    <FaTrashAlt />
                  </button>
                </div>
                <div style={styles.cardInfo}>
                  <p style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ margin: '0 0 15px 0' }}>Confirm Deletion</h3>
            <p style={{ margin: '0 0 20px 0', color: '#ccc' }}>Are you sure you want to delete this snapshot?</p>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={cancelDelete}>Cancel</button>
              <button style={styles.confirmBtn} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #120309 0%, #1a050f 100%)',
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
    paddingBottom: '50px'
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    background: 'rgba(20, 5, 10, 0.8)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 68, 136, 0.2)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(90deg, #ff8a00, #e52e71)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'flex',
    alignItems: 'center'
  },
  content: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  emptyState: {
    textAlign: 'center',
    padding: '100px 20px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '24px',
    border: '1px dashed rgba(255, 68, 136, 0.3)',
    backdropFilter: 'blur(10px)'
  },
  primaryBtn: {
    marginTop: '20px',
    background: 'linear-gradient(90deg, #ff8a00, #e52e71)',
    border: 'none',
    padding: '12px 30px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '30px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    boxShadow: '0 4px 15px rgba(229, 46, 113, 0.4)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '30px'
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
    transition: 'transform 0.3s, box-shadow 0.3s',
    position: 'relative'
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    paddingTop: '133%', // 3:4 aspect ratio typical for portraits
    overflow: 'hidden'
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  deleteBtn: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ff4444',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(5px)',
    transition: 'all 0.2s'
  },
  cardInfo: {
    padding: '15px',
    textAlign: 'center'
  },
  dateText: {
    margin: 0,
    color: '#aaa',
    fontSize: '14px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#000',
    color: '#fff',
    padding: '30px',
    borderRadius: '15px',
    textAlign: 'center',
    border: '1px solid #333',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    maxWidth: '400px',
    width: '90%',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: '25px',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    color: '#fff',
    border: '1px solid #555',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  confirmBtn: {
    backgroundColor: '#ff4444',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }
};
