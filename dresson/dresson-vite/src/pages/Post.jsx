import { useState, useContext, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import { getCategories, addCommentToPost, addProductReview, toggleLikePost, toggleDislikePost, toggleDislikeProduct, toggleLikeProduct } from "../api/api";
import VirtualTryOnModal from "../components/VirtualTryOnModal";
import { useAuth } from "../context/AuthContext";


export default function Post({ post, darkMode, currentUserImage, onDelete, onEdit, isSeller, onUpdatePost }) {
  const { addToCart, addToWishlist } = useContext(CartContext);
  const { user } = useAuth();
  const currentUserName = user?.first_name || user?.username || "User";
  const [likes, setLikes] = useState(post.likes || 0);
  const [dislikes, setDislikes] = useState(post.dislikes || 0);
  const [rating, setRating] = useState(post.rating || 0);
  const [comments, setComments] = useState(post.comments || []);
  const [liked, setLiked] = useState(post.isLiked || post.is_liked || false);
  const [disliked, setDisliked] = useState(post.isDisliked || post.is_disliked || false);


  const [commentText, setCommentText] = useState("");
  const [commentFile, setCommentFile] = useState(null);
  const [replyData, setReplyData] = useState({});

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCartSelection, setShowCartSelection] = useState(false);

  // ✅ مرحلتين: اختيار المنتج أولاً ثم الخيارات
  const [cartStep, setCartStep] = useState("product"); // "product" | "options"
  const [selectedProductIndex, setSelectedProductIndex] = useState(null);

  const [selection, setSelection] = useState({ size: "", color: "" });
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [messageModal, setMessageModal] = useState({ show: false, text: "" });
  const [tryOnProduct, setTryOnProduct] = useState(null);
  const [showRatingBox, setShowRatingBox] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState(post.categories || []);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [categoriesData, setCategoriesData] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  useEffect(() => {
    if (!categoriesLoaded) {
      getCategories().then(data => {
        setCategoriesData(data || []);
        setCategoriesLoaded(true);
      });
    }
  }, [categoriesLoaded]);

  const getFlatItems = (catObj) => {
    let items = [];
    if (catObj.children && catObj.children.length > 0) {
      catObj.children.forEach(child => {
        items.push({ id: child.id, name: child.name });
        items = items.concat(getFlatItems(child));
      });
    }
    return items;
  };

  const getCategoryGroupObj = (catId) => {
    if (!catId) return null;
    for (const group of categoriesData) {
      const items = getFlatItems(group);
      if (items.some(i => i.id == catId)) return group;
    }
    return null;
  };

  const getCategoryNameById = (id) => {
    if (!id) return "";
    if (isNaN(id)) return id;
    for (const group of categoriesData) {
      const items = getFlatItems(group);
      const found = items.find(i => i.id == id);
      if (found) return found.name;
    }
    return id;
  };

  // ✅ تحديث الكومنتات لما البوست يتغير
  useEffect(() => {
    if (post.comments && Array.isArray(post.comments)) {
      setComments(post.comments);
    }
  }, [post.id]);

  // بيانات كل صورة (السعر والتفاصيل) - مبنية على imageCategories و prices
  // كل صورة ممكن يكون ليها سعر خاص لو post.imagePrices موجود
  const getImagePrice = (idx) => {
    if (post.imagePrices && post.imagePrices[idx]) return post.imagePrices[idx];
    return post.price || "";
  };

  const getImageCategory = (idx) => {
    if (post.imageCategories && post.imageCategories[idx]) return post.imageCategories[idx];
    return selectedCategories[0] || "";
  };

  // ✅ متغيرات تُستخدم في مودال التفاصيل
  const currentPrice = getImagePrice(currentImgIndex);
  const currentCategory = getImageCategory(currentImgIndex);

  const showMessage = (text) => {
    setMessageModal({ show: true, text });
    setTimeout(() => setMessageModal({ show: false, text: "" }), 2000);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleRating = async (star) => {
    const newRating = rating === star ? 0 : star;
    setRating(newRating);
    try {
      await addProductReview(post.id, { rating: newRating, comment: "" });
      if (onUpdatePost) {
        onUpdatePost(post.id, { rating: newRating });
      }
    } catch (err) {
      console.error("Error saving rating:", err);
    }
  };

  const toggleLike = async () => {
    if (!post.isProduct) {
      try {
        const res = await toggleLikePost(post.id);
        const isNowLiked = res.status === "liked";
        setLiked(isNowLiked);
        setLikes(res.count);
        
        let newDislikes = dislikes;
        if (isNowLiked && disliked) {
          setDisliked(false);
          newDislikes = Math.max(0, dislikes - 1);
          setDislikes(newDislikes);
        }
        
        if (onUpdatePost) {
          onUpdatePost(post.id, { likes: res.count, isLiked: isNowLiked, dislikes: newDislikes, isDisliked: false });
        }
      } catch (err) {
        console.error("Error liking post:", err);
      }
    } else {
      try {
        const res = await toggleLikeProduct(post.id);
        const isNowLiked = res.status === "liked";
        const newLikes = isNowLiked ? likes + 1 : likes - 1;
        setLiked(isNowLiked);
        setLikes(newLikes);
        
        let newDislikes = dislikes;
        if (isNowLiked && disliked) {
          setDisliked(false);
          newDislikes = Math.max(0, dislikes - 1);
          setDislikes(newDislikes);
        }
        
        if (onUpdatePost) {
          onUpdatePost(post.id, { likes: newLikes, isLiked: isNowLiked, dislikes: newDislikes, isDisliked: false });
        }
      } catch (err) {
        console.error("Error toggling product like:", err);
      }
    }
  };

  const toggleDislike = async () => {
    if (!post.isProduct) {
      try {
        const res = await toggleDislikePost(post.id);
        const isNowDisliked = res.status === "disliked";
        setDisliked(isNowDisliked);
        setDislikes(res.count);
        
        let newLikes = likes;
        if (isNowDisliked && liked) {
          setLiked(false);
          newLikes = Math.max(0, likes - 1);
          setLikes(newLikes);
        }
        
        if (onUpdatePost) {
          onUpdatePost(post.id, { dislikes: res.count, isDisliked: isNowDisliked, likes: newLikes, isLiked: false });
        }
      } catch (err) {
        console.error("Error disliking post:", err);
      }
    } else {
      try {
        const res = await toggleDislikeProduct(post.id);
        const isNowDisliked = res.status === "disliked";
        setDisliked(isNowDisliked);
        setDislikes(res.count);
        
        let newLikes = likes;
        if (isNowDisliked && liked) {
          setLiked(false);
          newLikes = Math.max(0, likes - 1);
          setLikes(newLikes);
        }
        
        if (onUpdatePost) {
          onUpdatePost(post.id, { dislikes: res.count, isDisliked: isNowDisliked, likes: newLikes, isLiked: false });
        }
      } catch (err) {
        console.error("Error disliking product:", err);
      }
    }
  };

  const nextImage = (e) => {
    e.stopPropagation();
    if (post.files && post.files.length > 0)
      setCurrentImgIndex((prev) => (prev + 1) % post.files.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    if (post.files && post.files.length > 0)
      setCurrentImgIndex((prev) => (prev - 1 + post.files.length) % post.files.length);
  };

  // ✅ تأكيد الإضافة للسلة - بيضيف المنتج المختار مع بياناته الكاملة
  const confirmAddToCart = (e) => {
    if (e) e.stopPropagation();
    const needsSize = (post.sizes?.length > 0 || post.shoeSizes?.length > 0);
    const needsColor = (post.availableColors && post.availableColors.trim() !== "");
    if (needsSize && !selection.size) { showMessage("Please select size first!"); return; }
    if (needsColor && !selection.color) { showMessage("Please select color first!"); return; }

    // ✅ تحديد الصورة والسعر بناءً على المنتج المختار
    const chosenIdx = selectedProductIndex !== null ? selectedProductIndex : currentImgIndex;
    const chosenImage = post.files && post.files[chosenIdx] ? post.files[chosenIdx] : (post.files?.[0] || null);
    const chosenPrice = getImagePrice(chosenIdx);
    const chosenCategory = getImageCategory(chosenIdx);

    try {
      const productToAdd = {
        ...post,
        id: post.id || Date.now(), // ⭐ ضيفي السطر ده
        selectedSize: selection.size,
        selectedColor: selection.color,
        cartImage: chosenImage,
        cartPrice: chosenPrice,
        cartCategory: chosenCategory,
        cartProductIndex: chosenIdx,
        price: chosenPrice,
        cartDisplayName: post.text || "Product",
      };
      addToCart(productToAdd);
      const newInCart = (post.inCart || 0) + 1;
      onUpdatePost(post.id, { inCart: newInCart });
    } catch (err) {
      console.error("Cart error:", err);
    }
    setShowCartSelection(false);
    setSelectedProductIndex(null);
    showMessage("Added to cart successfully!");
  };

  // ✅ فتح مودال السلة - لو في صور متعددة بيبدأ بخطوة اختيار المنتج
  const handleCart = (e) => {
    if (e) e.stopPropagation();
    if (!post.price) { showMessage("This product does not have a valid price"); return; }
    setSelection({ size: "", color: "" });
    setSelectedProductIndex(null);
    // لو في أكتر من صورة، ابدأ بخطوة اختيار المنتج
    if (post.files && post.files.length > 1) {
      setCartStep("product");
    } else {
      setCartStep("options");
      setSelectedProductIndex(0);
    }
    setShowCartSelection(true);
  };

  const handleWish = async () => {
    try {
      await addToWishlist(post);
      showMessage("Toggled wishlist!");
    } catch (err) {
      console.error("Error adding to wishlist:", err);
      showMessage("Error updating wishlist");
    }
  };

  // ✅ النسخة الصح والنضيفة (دالة واحدة بس)
  // ✅ النسخة الصح: دالة واحدة كاملة ومنظمة
  const handleAddComment = async () => {
    if (!commentText.trim() && !commentFile) return;

    try {
      let backendComment = null;
      if (post.isProduct) {
        const formData = new FormData();
        formData.append('comment', commentText);
        formData.append('rating', 5);
        if (commentFile) {
          formData.append('image', commentFile);
        }
        const res = await addProductReview(post.id, formData);
        backendComment = {
          id: res.id,
          user: res.user_name || currentUserName,
          userImage: res.user_avatar || currentUserImage,
          text: res.comment,
          image: res.image || null,
          replies: []
        };
      } else {
        const formData = new FormData();
        formData.append('content', commentText);
        if (commentFile) {
          formData.append('image', commentFile);
        }
        const res = await addCommentToPost(post.id, formData);
        backendComment = {
          id: res.id,
          user: res.user_name || currentUserName,
          userImage: res.user_avatar || currentUserImage,
          text: res.content,
          image: res.image || null,
          replies: []
        };
      }

      const updatedComments = [backendComment, ...comments];
      setComments(updatedComments);

      if (onUpdatePost) {
        onUpdatePost(post.id, { comments: updatedComments });
      }

      setCommentText("");
      setCommentFile(null);
      showMessage("Comment added successfully!");
    } catch (error) {
      console.error("Failed to add comment:", error);
      showMessage("Error saving comment.");
    }
  };


  // ✅ دالة الرد على التعليقات
  const handleReply = async (commentIndex, parentCommentId) => {
    const replyText = replyData[commentIndex]?.text;
    const replyFile = replyData[commentIndex]?.file;

    if (!replyText?.trim() && !replyFile) return;

    try {
      let newReply = null;
      if (!post.isProduct) {
        const formData = new FormData();
        formData.append('content', replyText);
        formData.append('parent', parentCommentId);
        if (replyFile) {
          formData.append('image', replyFile);
        }
        const res = await addCommentToPost(post.id, formData);
        newReply = {
          id: res.id,
          user: res.user_name || currentUserName,
          userImage: res.user_avatar || currentUserImage,
          text: res.content,
          image: res.image || null,
        };
      } else {
        const formData = new FormData();
        formData.append('comment', replyText);
        formData.append('parent', parentCommentId);
        if (replyFile) {
          formData.append('image', replyFile);
        }
        const res = await addProductReview(post.id, formData);
        newReply = {
          id: res.id,
          user: res.user_name || currentUserName,
          userImage: res.user_avatar || currentUserImage,
          text: res.comment,
          image: res.image || null,
        };
      }

      const updatedComments = comments.map((comment, idx) => {
        if (idx === commentIndex) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newReply],
          };
        }
        return comment;
      });

      setComments(updatedComments);

      if (onUpdatePost) {
        onUpdatePost(post.id, { comments: updatedComments });
      }

      setReplyData({ ...replyData, [commentIndex]: { text: "", file: null } });
      showMessage("Reply added successfully!");
    } catch (error) {
      console.error("Failed to add reply:", error);
      showMessage("Error adding reply.");
    }
  };

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const saveCategoriesAndClose = () => {
    onUpdatePost(post.id, { categories: selectedCategories });
    setShowCategoryModal(false);
    showMessage("Categories saved!");
  };

  const toggleGroup = (group) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className={`card mb-4 border-0 shadow-sm rounded-4 ${darkMode ? "bg-dark text-light border-secondary" : "bg-white text-dark"}`}>
      <div className="card-body p-4">

        {/* Header - بدون السعر والكاتيجوري هنا */}
        <div className="d-flex justify-content-between mb-3">
          <div className="d-flex align-items-center">
            <img src={post.userImage || "https://ui-avatars.com/api/?name=User&background=random"} className="rounded-circle me-3 border" width="45" height="45" style={{ objectFit: 'cover' }} alt="user" />
            <div>
              <span className="fw-bold fs-5 d-block">{post.user}</span>
            </div>
          </div>
          {isSeller && (
            <div className="dropdown">
              <button className="btn btn-sm text-muted" data-bs-toggle="dropdown">•••</button>
              <ul className="dropdown-menu dropdown-menu-end shadow border-0">
                <li><button className="dropdown-item" onClick={onEdit}>✏️ Edit</button></li>
                <li><button className="dropdown-item text-danger" onClick={onDelete}>🗑️ Delete</button></li>
              </ul>
            </div>
          )}
        </div>

        <p className="mb-3 fs-5">{post.text}</p>

        {/* ✅ السلايدر - تم إزالة الكاتيجوريز من فوقه */}
        {post.files && post.files.length > 0 && (
          <div className="mb-0 position-relative rounded-4 overflow-hidden border shadow-sm bg-black" style={{ minHeight: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src={post.files[currentImgIndex]}
              className="img-fluid"
              style={{ maxHeight: "500px", objectFit: "contain", width: "100%" }}
              alt={`product-${currentImgIndex}`}
            />
            {post.files.length > 1 && (
              <>
                <button onClick={prevImage} className="btn btn-dark btn-sm rounded-circle position-absolute top-50 start-0 translate-middle-y ms-2 opacity-75 shadow" style={{ zIndex: 10, width: "35px", height: "35px" }}>❮</button>
                <button onClick={nextImage} className="btn btn-dark btn-sm rounded-circle position-absolute top-50 end-0 translate-middle-y me-2 opacity-75 shadow" style={{ zIndex: 10, width: "35px", height: "35px" }}>❯</button>
                <div className="position-absolute bottom-0 start-50 translate-middle-x mb-2 bg-dark bg-opacity-50 text-white px-3 py-1 rounded-pill small">
                  {currentImgIndex + 1} / {post.files.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* ✅ السعر والكاتيجوري وزر Details تحت الصورة مباشرة - بيتغيروا مع كل صورة */}
        {post.isProduct && (
          <div className={`px-3 py-2 mb-3 rounded-bottom-4 d-flex flex-wrap align-items-center justify-content-between gap-2 ${darkMode ? "bg-secondary bg-opacity-25" : "bg-light"}`}
            style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="d-flex flex-wrap align-items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
              {currentPrice && (
                <div className="d-flex align-items-center gap-2 bg-success text-white px-3 py-1 rounded-pill text-nowrap">
                  {post.priceBeforeSale > currentPrice && (
                    <span style={{ textDecoration: 'line-through', opacity: 0.8, fontSize: '0.85em' }}>
                      ${post.priceBeforeSale}
                    </span>
                  )}
                  <span className="fw-bold fs-6">
                    ${currentPrice}
                  </span>
                </div>
              )}
              {currentCategory && (
                <span className="badge rounded-pill px-3 py-1 text-truncate"
                  style={{ backgroundColor: getCategoryGroupObj(currentCategory)?.color || "#6c757d", color: "#fff", fontSize: "0.78rem", maxWidth: "150px" }}>
                  {getCategoryNameById(currentCategory)}
                </span>
              )}
            </div>
            <button
              className="btn btn-sm btn-info rounded-pill shadow-sm fw-bold flex-shrink-0"
              onClick={() => setShowDetailsModal(true)}
              style={{ fontSize: '0.75rem', color: 'black' }}
            >
              Details
            </button>
          </div>
        )}

        {/* أزرار التفاعل */}
        <div className="d-flex justify-content-between border-top border-bottom py-3 mb-3 px-1">
          <div className="d-flex gap-3 align-items-center">
            <button
              type="button"
              onClick={toggleLike}
              style={{
                cursor: "pointer", border: "none", padding: "4px 10px",
                borderRadius: "20px", display: "flex", alignItems: "center", gap: "5px",
                fontWeight: liked ? 700 : 400,
                color: liked ? "#16a34a" : (darkMode ? "#aaa" : "#555"),
                backgroundColor: liked ? "#22c55e18" : "transparent",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>👍</span>
              <span style={{ fontSize: "0.9rem" }}>{likes}</span>
            </button>

            <button
              type="button"
              onClick={toggleDislike}
              style={{
                cursor: "pointer", border: "none", padding: "4px 10px",
                borderRadius: "20px", display: "flex", alignItems: "center", gap: "5px",
                fontWeight: disliked ? 700 : 400,
                color: disliked ? "#dc2626" : (darkMode ? "#aaa" : "#555"),
                backgroundColor: disliked ? "#ef444418" : "transparent",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>👎</span>
              <span style={{ fontSize: "0.9rem" }}>{dislikes}</span>
            </button>

            {post.isProduct && (
              <>
                <span style={{ cursor: 'pointer' }} className="text-primary" onClick={handleCart}>🛒 Add</span>
                <span style={{ cursor: 'pointer' }} className="text-danger" onClick={handleWish}>❤️ Wish</span>
              </>
            )}
          </div>
          {post.isProduct && (
            <div className="position-relative" style={{ display: 'flex', alignItems: 'center' }}>
              <button 
                type="button"
                onClick={() => setShowRatingBox(!showRatingBox)}
                style={{
                  cursor: "pointer", border: "none", padding: "4px 12px",
                  borderRadius: "20px", display: "flex", alignItems: "center", gap: "6px",
                  fontWeight: 600, color: rating > 0 ? "#eab308" : (darkMode ? "#aaa" : "#555"),
                  backgroundColor: rating > 0 ? "#fef08a22" : (darkMode ? "#ffffff11" : "#00000008"),
                  transition: "all 0.2s"
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{rating > 0 ? "⭐" : "☆"}</span>
                <span style={{ fontSize: "0.9rem" }}>{rating > 0 ? `${rating}/5` : "Rate"}</span>
              </button>
              
              {showRatingBox && (
                <>
                  <div 
                    className="position-fixed top-0 start-0 w-100 h-100" 
                    style={{ zIndex: 99 }} 
                    onClick={() => setShowRatingBox(false)}
                  ></div>
                  <div 
                    className={`position-absolute shadow-lg rounded-pill px-3 py-2 d-flex align-items-center gap-2 ${darkMode ? 'bg-dark border border-secondary' : 'bg-white border'}`} 
                    style={{ bottom: "120%", right: "0", zIndex: 100, whiteSpace: "nowrap", transform: "translateX(10%)" }}
                  >
                    {[1, 2, 3, 4, 5].map(s => (
                      <span 
                        key={s} 
                        onClick={() => { handleRating(s); setShowRatingBox(false); }} 
                        style={{ cursor: 'pointer', fontSize: '1.6rem', lineHeight: '1', color: s <= rating ? "#eab308" : "#d1d5db", transition: "transform 0.1s" }} 
                        onMouseEnter={(e) => e.target.style.transform = "scale(1.2)"}
                        onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* التعليقات */}
        <div className="mt-4">
          {comments.map((c, i) => (
            <div key={c.id} className={`p-3 rounded-4 mb-3 shadow-sm ${darkMode ? "bg-secondary bg-opacity-25" : "bg-light"}`}>
              <div className="d-flex align-items-center mb-2">
                <img src={c.userImage || "https://ui-avatars.com/api/?name=User&background=random"} className="rounded-circle me-2 border shadow-sm" width="30" height="30" style={{ objectFit: 'cover' }} alt="commenter" />
                <p className="mb-0 fw-bold small">{c.user}</p>
              </div>
              <p className="mb-0 ps-4">{c.text}</p>
              {c.image && <img src={c.image} className="rounded-3 mb-2 d-block ms-4 shadow-sm" width="120" alt="comment" />}
              {c.replies && c.replies.map(r => (
                <div key={r.id} className="ms-5 border-start border-3 ps-3 mt-2 opacity-75 small">
                  <div className="d-flex align-items-center mb-1">
                    <img src={r.userImage || "https://ui-avatars.com/api/?name=User&background=random"} className="rounded-circle me-2 border shadow-sm" width="24" height="24" style={{ objectFit: 'cover' }} alt="replier" />
                    <p className="mb-0 fw-bold">{r.user}</p>
                  </div>
                  <p className="mb-0">{r.text}</p>
                  {r.image && <img src={r.image} width="80" className="rounded mt-1 shadow-sm" alt="reply-img" />}
                </div>
              ))}
              <div className="mt-3 ms-4 d-flex gap-2 align-items-center">
                <input className="form-control form-control-sm rounded-pill" placeholder="Reply..."
                  value={replyData[i]?.text || ""} onChange={(e) => setReplyData({ ...replyData, [i]: { ...replyData[i], text: e.target.value } })} />
                <label className="mb-0" style={{ cursor: 'pointer' }}>
                  📸
                  <input type="file" hidden onChange={(e) => setReplyData({ ...replyData, [i]: { ...replyData[i], file: e.target.files[0] } })} />
                </label>
                <button className="btn btn-sm btn-primary rounded-circle px-3" onClick={() => handleReply(i, c.id)}>Reply</button>
              </div>
            </div>
          ))}
          <div className="mt-4 pt-3 border-top d-flex gap-2 align-items-center">
            <img src={currentUserImage || "https://ui-avatars.com/api/?name=User&background=random"} className="rounded-circle shadow-sm" width="35" height="35" style={{ objectFit: 'cover' }} alt="user" />

            <input
              className={`form-control border-0 rounded-pill px-3 shadow-sm ${darkMode ? "bg-secondary text-white" : "bg-light"}`}
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // بيمنع الـ refresh
                  handleAddComment();
                }
              }}
            />

            <label className="mb-0" style={{ cursor: 'pointer' }}>
              📸
              <input type="file" hidden onChange={(e) => setCommentFile(e.target.files[0])} />
            </label>

            <button
              className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm"
              onClick={(e) => {
                e.preventDefault(); // بيمنع الصفحة تحمل من جديد
                handleAddComment(); // بينادي الدالة الصح
              }}
            >
              Ok
            </button>
          </div>
          {commentFile && <small className="d-block mt-1 ms-5 text-primary">Image Selected: {commentFile.name}</small>}
        </div>
      </div>

      {/* ✅ مودال اختيار الكاتيجوري */}
      {showCategoryModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, padding: "16px" }}>
          <div
            className={`rounded-4 shadow-lg w-100 ${darkMode ? "bg-dark text-light" : "bg-white text-dark"}`}
            style={{ maxWidth: "520px", maxHeight: "88vh", display: "flex", flexDirection: "column" }}
          >
            <div className="px-4 pt-4 pb-3 border-bottom">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="fw-bold mb-0">🏷️ Product Categories</h5>
                <button className="btn-close" onClick={() => setShowCategoryModal(false)}></button>
              </div>
              <p className="text-muted small mb-0">Select all categories that apply.</p>
              {selectedCategories.length > 0 && (
                <div className="d-flex flex-wrap gap-1 mt-2">
                  {selectedCategories.map((catId) => {
                    const groupObj = getCategoryGroupObj(catId);
                    const color = groupObj?.color || "#6c757d";
                    return (
                      <span key={catId} onClick={() => toggleCategory(catId)}
                        className="badge rounded-pill px-2 py-1"
                        style={{ backgroundColor: color, color: "#fff", fontSize: "0.7rem", cursor: "pointer" }}
                        title="Click to remove">
                        {getCategoryNameById(catId)} ✕
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ overflowY: "auto", flex: 1 }} className="px-4 py-2">
              {categoriesData.map((groupObj) => {
                const group = groupObj.name;
                const items = getFlatItems(groupObj);
                const isOpen = expandedGroups[group] !== false;
                const groupColor = groupObj.color || "#6c757d";
                const selectedInGroup = items.filter((i) => selectedCategories.includes(i.id));
                return (
                  <div key={group} className="mb-2">
                    <button
                      className="btn w-100 text-start d-flex justify-content-between align-items-center py-2 px-3 rounded-3 fw-bold border-0"
                      style={{ backgroundColor: groupColor + "18", color: groupColor, fontSize: "0.9rem" }}
                      onClick={() => toggleGroup(group)}
                    >
                      <span>
                        {group}
                        {selectedInGroup.length > 0 && (
                          <span className="ms-2 badge rounded-pill"
                            style={{ backgroundColor: groupColor, color: "#fff", fontSize: "0.65rem" }}>
                            {selectedInGroup.length}
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: "0.75rem" }}>{isOpen ? "▲" : "▼"}</span>
                    </button>
                    {isOpen && (
                      <div className="row g-1 mt-1 px-1 pb-1">
                        {items.map((catObj) => {
                          const catId = catObj.id;
                          const catName = catObj.name;
                          const isSelected = selectedCategories.includes(catId);
                          return (
                            <div className="col-6" key={catId}>
                              <button
                                onClick={() => toggleCategory(catId)}
                                className="btn w-100 text-start py-1 px-2 rounded-3 small border"
                                style={{
                                  fontSize: "0.78rem",
                                  backgroundColor: isSelected ? groupColor : "transparent",
                                  color: isSelected ? "#fff" : (darkMode ? "#ccc" : "#333"),
                                  borderColor: isSelected ? groupColor : (darkMode ? "#555" : "#ddd"),
                                  fontWeight: isSelected ? 600 : 400,
                                }}
                              >
                                {isSelected ? "✓ " : ""}{catName}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-top d-flex gap-2">
              <button className="btn btn-primary w-100 rounded-pill fw-bold" onClick={saveCategoriesAndClose}>
                Save ({selectedCategories.length} selected)
              </button>
              <button className="btn btn-light border w-100 rounded-pill fw-bold" onClick={() => setSelectedCategories([])} style={{ maxWidth: "100px" }}>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ مودال إضافة للسلة - مرحلتين */}
      {showCartSelection && (
        <div
          style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCartSelection(false); setSelectedProductIndex(null); } }}
        >
          <div className="p-4 bg-white text-dark rounded-4 shadow-lg" style={{ width: "400px", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>

            {/* ✅ المرحلة الأولى: اختيار المنتج (الصورة) */}
            {cartStep === "product" && post.files && post.files.length > 1 && (
              <>
                <h5 className="mb-3 fw-bold text-center border-bottom pb-2">🛍️ Select a Product</h5>
                <p className="text-muted small text-center mb-3">Which product would you like to add?</p>
                <div className="d-flex flex-column gap-3">
                  {post.files.map((file, idx) => {
                    const imgPrice = getImagePrice(idx);
                    const imgCat = getImageCategory(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => { setSelectedProductIndex(idx); setCartStep("options"); }}
                        className="d-flex align-items-center gap-3 p-2 rounded-4 border"
                        style={{
                          cursor: "pointer",
                          transition: "all 0.2s",
                          borderColor: "#dee2e6",
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "#0d6efd"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "#dee2e6"}
                      >
                        <img
                          src={file}
                          alt={`product-${idx + 1}`}
                          style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 10, flexShrink: 0 }}
                          onError={e => { e.target.src = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2270%22%20height%3D%2270%22%20viewBox%3D%220%200%2070%2070%22%3E%3Crect%20fill%3D%22%23dddddd%22%20width%3D%2270%22%20height%3D%2270%22%2F%3E%3C%2Fsvg%3E"; }}
                        />
                        <div className="flex-fill">
                          <div className="fw-bold small mb-1">
                            {post.text ? (post.text.length > 35 ? post.text.slice(0, 35) + "…" : post.text) : "Product"} #{idx + 1}
                          </div>
                          {imgCat && <div className="text-muted" style={{ fontSize: "0.72rem" }}>📦 {getCategoryNameById(imgCat)}</div>}
                          {imgPrice && <div className="fw-bold text-success mt-1">${imgPrice}</div>}
                        </div>
                        <span style={{ color: "#6c757d", fontSize: "1.2rem" }}>›</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="btn btn-light border w-100 rounded-pill fw-bold mt-3"
                  onClick={() => { setShowCartSelection(false); setSelectedProductIndex(null); }}
                >
                  Cancel
                </button>
              </>
            )}

            {/* ✅ المرحلة الثانية: اختيار المقاس واللون */}
            {cartStep === "options" && (
              <>
                <h5 className="mb-1 fw-bold text-center border-bottom pb-2">🛒 Product Options</h5>

                {/* معاينة المنتج المختار */}
                {selectedProductIndex !== null && post.files && post.files[selectedProductIndex] && (
                  <div className="d-flex align-items-center gap-3 mb-3 p-2 rounded-4 bg-light">
                    <img
                      src={post.files[selectedProductIndex]}
                      alt="selected"
                      style={{ width: 55, height: 55, objectFit: "cover", borderRadius: 10 }}
                      onError={e => { e.target.src = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2255%22%20height%3D%2255%22%20viewBox%3D%220%200%2055%2055%22%3E%3Crect%20fill%3D%22%23dddddd%22%20width%3D%2255%22%20height%3D%2255%22%2F%3E%3C%2Fsvg%3E"; }}
                    />
                    <div>
                      <div className="fw-bold small">{post.text || "Product"}</div>
                      <div className="fw-bold text-success">${getImagePrice(selectedProductIndex)}</div>
                    </div>
                    {/* زرار الرجوع للمرحلة الأولى لو في أكتر من صورة */}
                    {post.files.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary rounded-pill ms-auto"
                        onClick={() => setCartStep("product")}
                        style={{ fontSize: "0.72rem" }}
                      >
                        ← Change
                      </button>
                    )}
                  </div>
                )}

                {(post.sizes?.length > 0 || post.shoeSizes?.length > 0) && (
                  <div className="mb-3">
                    <label className="small fw-bold">Size (Required):</label>
                    <select className="form-select rounded-pill" value={selection.size} onChange={(e) => setSelection({ ...selection, size: e.target.value })}>
                      <option value="">Choose Size</option>
                      {post.sizes?.length > 0 && <optgroup label="Clothes">{post.sizes.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>}
                      {post.shoeSizes?.length > 0 && <optgroup label="Shoes">{post.shoeSizes.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>}
                    </select>
                  </div>
                )}
                {post.availableColors && post.availableColors.trim() !== "" && (
                  <div className="mb-3">
                    <label className="small fw-bold">Color (Required):</label>
                    <select className="form-select rounded-pill" value={selection.color} onChange={(e) => setSelection({ ...selection, color: e.target.value })}>
                      <option value="">Choose Color</option>
                      {post.availableColors.split(',').map(color => (
                        <option key={color} value={color.trim()}>{color.trim()}</option>
                      ))}
                    </select>
                  </div>
                )}
                {!((post.sizes?.length > 0 || post.shoeSizes?.length > 0) || (post.availableColors && post.availableColors.trim() !== "")) && (
                  <p className="text-center small text-muted my-3">No specific options required for this product.</p>
                )}
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-primary w-100 rounded-pill fw-bold" onClick={confirmAddToCart}>✅ Add to Cart</button>
                  <button type="button" className="btn btn-light border w-100 rounded-pill fw-bold" onClick={(e) => { e.stopPropagation(); setShowCartSelection(false); setSelectedProductIndex(null); }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ✅ مودال التفاصيل - بيتغير حسب الصورة الحالية */}
      {showDetailsModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, padding: "20px" }}>
          <div className={`p-4 rounded-4 shadow-lg w-100 ${darkMode ? "bg-dark text-light border" : "bg-white text-dark"}`} style={{ maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="fw-bold mb-0">Product Info</h4>
              <button className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
            </div>
            <hr />

            {/* ✅ معاينة الصورة الحالية مع سعرها */}
            {post.files && post.files[currentImgIndex] && (
              <div className="mb-3 text-center">
                <img
                  src={post.files[currentImgIndex]}
                  alt="current product"
                  style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 12, background: "#f8f9fa" }}
                />
                <div className="mt-2 d-flex align-items-center justify-content-center gap-2">
                  {currentPrice && (
                    <div className="d-flex align-items-center gap-2 bg-success text-white px-3 py-1 rounded-pill">
                      {post.priceBeforeSale > currentPrice && (
                        <span style={{ textDecoration: 'line-through', opacity: 0.8, fontSize: '0.85em' }}>
                          ${post.priceBeforeSale}
                        </span>
                      )}
                      <span className="fw-bold fs-6">
                        ${currentPrice}
                      </span>
                    </div>
                  )}
                  {currentCategory && (
                    <span className="badge rounded-pill px-3 py-1"
                      style={{ backgroundColor: getCategoryGroupObj(currentCategory)?.color || "#6c757d", color: "#fff", fontSize: "0.78rem" }}>
                      {getCategoryNameById(currentCategory)}
                    </span>
                  )}
                </div>
                {post.files.length > 1 && (
                  <p className="text-muted small mt-1">Image {currentImgIndex + 1} of {post.files.length} — use arrows on post to browse</p>
                )}
              </div>
            )}

            {/* ✅ كل الكاتيجوريز في التفاصيل */}
            {selectedCategories.length > 0 && (
              <div className="mb-3">
                <strong>All Categories:</strong>
                <div className="d-flex flex-wrap gap-1 mt-2">
                  {selectedCategories.map((cat) => {
                    const groupObj = getCategoryGroupObj(cat);
                    const color = groupObj?.color || "#6c757d";
                    return (
                      <span key={cat} className="badge rounded-pill px-3 py-1"
                        style={{ backgroundColor: color, color: "#fff", fontSize: "0.72rem" }}>
                        {getCategoryNameById(cat)}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mb-2"><strong>Fabric Type:</strong> {post.fabricType || "N/A"}</p>
            <p className="mb-2"><strong>Available Colors:</strong> {post.availableColors || "N/A"}</p>
            <p className="mb-3"><strong>Care:</strong> {post.careInstructions || "N/A"}</p>

            {post.sizes?.length > 0 && (
              <div className="mb-3">
                <strong className="text-primary">Clothes Size Guide:</strong>
                <div className="mt-2 bg-light p-2 rounded text-dark small">
                  {post.sizeGuide ? Object.entries(post.sizeGuide).map(([sz, wt]) => (
                    <div key={sz} className="d-flex justify-content-between border-bottom py-1">
                      <span>Size {sz}:</span> <span className="fw-bold">{wt} kg</span>
                    </div>
                  )) : <span>No guide provided</span>}
                </div>
              </div>
            )}

            {post.shoeSizes?.length > 0 && (
              <div className="mb-3">
                <strong className="text-success">Shoes Size Guide:</strong>
                <div className="mt-2 bg-light p-2 rounded text-dark small">
                  {post.shoeSizeGuide ? Object.entries(post.shoeSizeGuide).map(([sz, detail]) => (
                    <div key={sz} className="d-flex justify-content-between border-bottom py-1">
                      <span>Size {sz}:</span> <span className="fw-bold">{detail}</span>
                    </div>
                  )) : <span>No guide provided</span>}
                </div>
              </div>
            )}

            {post.fabricFocus && post.fabricFocus.length > 0 && (
              <div className="mb-3">
                <strong>Fabric Focus:</strong>
                <div className="d-flex gap-2 overflow-auto py-2">
                  {post.fabricFocus.map((img, idx) => (
                    <img key={idx} src={img} width="180" height="180" className="rounded border shadow-sm" style={{ objectFit: "cover", flexShrink: 0 }} alt="focus" />
                  ))}
                </div>
              </div>
            )}
            <button className="btn btn-secondary w-100 rounded-pill fw-bold mt-2" onClick={() => setShowDetailsModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* الرسائل */}
      {messageModal.show && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 99999 }}>
          <div style={{ backgroundColor: "#000", color: "#f5f5dc", padding: "20px 40px", borderRadius: "10px", textAlign: "center" }}>
            {messageModal.text}
          </div>
        </div>
      )}

      {tryOnProduct && (
        <VirtualTryOnModal
          product={tryOnProduct}
          onClose={() => setTryOnProduct(null)}
        />
      )}
    </div>
  );
}