import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Post from "./Post";
import SellerCoupons from "./SellerCoupons";
import { getPosts, getSellerProducts, addProduct, updateProduct, deleteProduct as deleteProductAPI, addPost, updatePostInAPI, deletePost as deletePostAPI, getCategories, updateUserProfile, getPublicUserProfile, toggleFollow } from "../api/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import * as bootstrap from "bootstrap";
import dressBanner from "../assets/dress-on-me-banner.jpeg";
import "../styles/Profile.css"; // Responsive layout styles
import { Country } from "country-state-city";
import { FaArrowUp } from "react-icons/fa";

// Dynamic categories will be fetched from the backend API

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { removeFromCart, removeFromWishlist } = useCart();

  const { user, setUser, logout } = useAuth();

  const isPublicProfile = location.state?.sellerId && location.state.sellerId !== user?.id;
  const targetUserId = isPublicProfile ? location.state.sellerId : user?.id;

  const [username, setUsername] = useState(user?.first_name || user?.username || "Guest");
  const [profileImage, setProfileImage] = useState(user?.profile?.image || null);
  const [coverImage, setCoverImage] = useState(user?.profile?.cover_image || null);
  const [userRole, setUserRole] = useState((user?.role || "customer").toLowerCase());

  // ── Brand Info (seller only) ──
  const [brandData, setBrandData] = useState(user?.profile || null);

  const [posts, setPosts] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPostText, setNewPostText] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [priceBeforeSale, setPriceBeforeSale] = useState("");
  const [gender, setGender] = useState("MALE");
  const [imagePrices, setImagePrices] = useState([]); // ✅ سعر كل صورة على حدة
  const [availableColors, setAvailableColors] = useState(""); // إضافة: حقل الألوان الجديد
  const [canBeHijabi, setCanBeHijabi] = useState(false);
  const [needsBasic, setNeedsBasic] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [tempName, setTempName] = useState(username);
  const [countries] = useState(Country.getAllCountries());
  const [tempCountry, setTempCountry] = useState(user?.profile?.country || "");
  const [countrySearch, setCountrySearch] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editPostId, setEditPostId] = useState(null);

  // ✅ الإضافات الجديدة المطلوبة (البيانات الإضافية للبوست)
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedShoeSizes, setSelectedShoeSizes] = useState([]); // جدول مقاسات الجزم
  const [fabricFocusFiles, setFabricFocusFiles] = useState([]);
  const [sizeGuide, setSizeGuide] = useState({});
  const [shoeSizeGuide, setShoeSizeGuide] = useState({}); // جايد مقاسات الجزم
  const [fabricType, setFabricType] = useState("");
  const [careInstructions, setCareInstructions] = useState("");
  const [imageCategories, setImageCategories] = useState([]); // كاتيجوري لكل صورة
  const [activeCategoryGroup, setActiveCategoryGroup] = useState([]); // الجروب المفتوح لكل صورة

  // ✅ State للرسائل السوداء
  const [messageModal, setMessageModal] = useState({ show: false, text: "" });
  const [confirmModal, setConfirmModal] = useState({ show: false, text: "", onConfirm: null });
  const [profileData, setProfileData] = useState(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  // ✅ Refs للبوستات عشان نعمل scroll
  const postRefs = useRef({});
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Dynamic Categories
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
    if (isNaN(catId)) {
      // Legacy handling for string category names
      for (const group of categoriesData) {
        const items = getFlatItems(group);
        if (items.some(i => i.name === catId)) return group;
      }
      return null;
    }
    for (const group of categoriesData) {
      const items = getFlatItems(group);
      if (items.some(i => i.id == catId)) return group;
    }
    return null;
  };

  const getCategoryNameById = (id) => {
    if (!id) return "";
    if (isNaN(id)) return id; // Legacy products
    for (const group of categoriesData) {
      const items = getFlatItems(group);
      const found = items.find(i => i.id == id);
      if (found) return found.name;
    }
    return id;
  };

  const showModestyCheckboxes = () => {
    if (gender === 'MALE') return false;
    
    const primaryCatId = imageCategories.find(c => c !== "") || (categoriesData.length > 0 ? categoriesData[0].id : null);
    if (!primaryCatId) return true; 

    const group = getCategoryGroupObj(primaryCatId);
    const catName = String(getCategoryNameById(primaryCatId)).toLowerCase();
    const groupName = group ? String(group.name).toLowerCase() : "";

    const nonClothingKeywords = ['bag', 'shoe', 'accessories', 'شنط', 'احذية', 'حذاء', 'اكسسوار', 'مجوهرات'];
    
    if (nonClothingKeywords.some(kw => groupName.includes(kw) || catName.includes(kw))) {
      return false;
    }
    return true; 
  };

  const showMessage = (text) => {
    setMessageModal({ show: true, text });
    setTimeout(() => setMessageModal({ show: false, text: "" }), 2000);
  };

  const showConfirm = (text, onConfirm) => {
    setConfirmModal({ show: true, text, onConfirm });
  };

  const handleConfirm = () => {
    if (confirmModal.onConfirm) {
      confirmModal.onConfirm();
    }
    setConfirmModal({ show: false, text: "", onConfirm: null });
  };

  const handleCancel = () => {
    setConfirmModal({ show: false, text: "", onConfirm: null });
  };

  useEffect(() => { fetchProfileData(); }, [isPublicProfile, targetUserId, user]);

  // ✅ Scroll للبوست المطلوب لما نيجي من Shop
  useEffect(() => {
    if (location.state?.scrollToPostId && posts.length > 0) {
      const postId = location.state.scrollToPostId;
      setTimeout(() => {
        if (postRefs.current[postId]) {
          postRefs.current[postId].scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
          // إضافة highlight للبوست
          postRefs.current[postId].style.transition = "all 0.3s";
          postRefs.current[postId].style.boxShadow = "0 0 20px rgba(255, 193, 7, 0.8)";
          setTimeout(() => {
            if (postRefs.current[postId]) {
              postRefs.current[postId].style.boxShadow = "";
            }
          }, 2000);
        }
      }, 500);
      // مسح الـ state بعد الاستخدام
      window.history.replaceState({}, document.title);
    }
  }, [location.state, posts]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Map Backend Product -> Frontend Post shape
  const mapProductToPost = (prod) => {
    return {
      id: prod.id,
      user: prod.seller_brand_name || prod.seller_email || "Seller",
      userImage: prod.seller_avatar || null,
      text: prod.name || prod.description,
      price: prod.price,
      priceBeforeSale: prod.price_before_sale || 0,
      availableColors: prod.available_colors || "",
      imagePrices: prod.image_prices || [],
      files: [prod.image, ...(prod.additional_images || []).map(img => img.image)].filter(Boolean),
      sizes: [],
      shoeSizes: [],
      fabricFocus: prod.fabric_focus || [],
      sizeGuide: prod.size_guide || {},
      shoeSizeGuide: prod.shoe_size_guide || {},
      fabricType: prod.fabric_type || "",
      careInstructions: prod.care_instructions || "",
      categories: (prod.image_categories && prod.image_categories.length > 0 && prod.image_categories.some(c => c !== "")) ? prod.image_categories : (prod.category ? [prod.category] : []),
      imageCategories: (prod.image_categories && prod.image_categories.length > 0 && prod.image_categories.some(c => c !== "")) ? prod.image_categories : (prod.category ? [prod.category] : []),
      likes: prod.likes_count || 0,
      dislikes: prod.dislikes_count || 0,
      inCart: prod.in_cart_count || 0,
      sales: prod.sales_count || 0,
      rating: prod.average_rating || 0,
      comments: (prod.reviews || []).map(r => ({
        id: r.id,
        user: r.user_name || r.user_email || "User",
        userImage: r.user_avatar || null,
        text: r.comment,
        image: r.image || null,
        replies: (r.replies || []).map(reply => ({
          id: reply.id,
          user: reply.user_name || reply.user_email || "User",
          userImage: reply.user_avatar || null,
          text: reply.comment,
          image: reply.image || null,
        }))
      })),
      isProduct: true,
      isLiked: prod.is_liked || false,
      isDisliked: prod.is_disliked || false,
      canBeHijabi: prod.can_be_hijabi || false,
      needsBasic: prod.needs_basic || false,
      gender: prod.gender || "MALE",
    };
  };

  // Map Backend Community Post -> Frontend Post shape
  const mapCommunityPostToPost = (postObj) => {
    return {
      id: postObj.id,
      user: postObj.user_name || postObj.user_email || "User",
      userImage: postObj.user_avatar || null,
      text: postObj.content,
      price: null,
      files: postObj.image ? [postObj.image] : [],
      likes: postObj.like_count || 0,
      dislikes: postObj.dislike_count || 0,
      comments: (postObj.comments || []).map(c => ({
        id: c.id,
        user: c.user_name || c.user_email || "User",
        userImage: c.user_avatar || null,
        text: c.content,
        image: c.image || null,
        replies: (c.replies || []).map(r => ({
          id: r.id,
          user: r.user_name || r.user_email || "User",
          userImage: r.user_avatar || null,
          text: r.content,
          image: r.image || null,
        }))
      })),
      isProduct: false,
      isLiked: postObj.is_liked || false,
      isDisliked: postObj.is_disliked || false,
    };
  };


  const fetchProfileData = async () => {
    try {
      setLoadingPosts(true);
      if (isPublicProfile) {
        const publicUser = await getPublicUserProfile(targetUserId);
        setUsername(publicUser.first_name || publicUser.username || "Seller");
        setProfileImage(publicUser.profile?.image || null);
        setCoverImage(publicUser.profile?.cover_image || null);
        setUserRole((publicUser.role || "seller").toLowerCase());
        setBrandData(publicUser.profile || null);
        setFollowersCount(publicUser.profile?.followers_count || 0);
        setIsFollowing(publicUser.profile?.is_following || false);

        const data = await getSellerProducts(targetUserId);
        const actualData = data?.results || data || [];
        const mapped = actualData.map(mapProductToPost);
        setPosts(mapped);
      } else {
        if (!user) return;
        setUsername(user.first_name || user.username || "Guest");
        setProfileImage(user.profile?.image || null);
        setCoverImage(user.profile?.cover_image || null);
        setUserRole((user.role || "customer").toLowerCase());
        setBrandData(user.profile || null);
        setFollowersCount(user.profile?.followers_count || 0);

        if ((user.role || "customer").toLowerCase() === "seller") {
          const data = await getSellerProducts(user.id);
          const actualData = data?.results || data || [];
          const mapped = actualData.map(mapProductToPost);
          setPosts(mapped);
        } else {
          const data = await getPosts();
          const actualData = data?.results || data || [];
          const mapped = actualData.map(mapCommunityPostToPost);
          setPosts(mapped);
        }
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      showMessage("You need to login to follow this seller!");
      return;
    }
    try {
      const result = await toggleFollow(targetUserId);
      setIsFollowing(result.is_following);
      setFollowersCount(result.followers_count);
    } catch (err) {
      showMessage("Error following seller");
    }
  };

  const handleUpdatePost = async (postId, updatedData) => {
    try {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updatedData } : p));

      const isActualEdit =
        updatedData.text !== undefined ||
        updatedData.price !== undefined ||
        updatedData.priceBeforeSale !== undefined ||
        updatedData.availableColors !== undefined ||
        updatedData.fabricType !== undefined ||
        updatedData.careInstructions !== undefined ||
        updatedData.sizeGuide !== undefined ||
        updatedData.shoeSizeGuide !== undefined ||
        updatedData.imageCategories !== undefined ||
        updatedData.imagePrices !== undefined ||
        updatedData.fabricFocusFiles !== undefined;

      if (!isActualEdit) {
        return; // Don't call backend edit/patch endpoints for likes/comments/ratings updates
      }

      if (userRole === "seller") {
        // Build FormData
        const formData = new FormData();
        if (updatedData.text) {
          formData.append('name', updatedData.text);
          formData.append('description', updatedData.text);
        }
        if (updatedData.price) formData.append('price', updatedData.price);
        if (updatedData.priceBeforeSale !== undefined) formData.append('price_before_sale', updatedData.priceBeforeSale ? updatedData.priceBeforeSale : 0);
        if (updatedData.availableColors !== undefined) formData.append('available_colors', updatedData.availableColors);
        if (updatedData.fabricType !== undefined) formData.append('fabric_type', updatedData.fabricType);
        if (updatedData.careInstructions !== undefined) formData.append('care_instructions', updatedData.careInstructions);
        if (updatedData.sizeGuide) formData.append('size_guide', JSON.stringify(updatedData.sizeGuide));
        if (updatedData.shoeSizeGuide) formData.append('shoe_size_guide', JSON.stringify(updatedData.shoeSizeGuide));
        if (updatedData.imageCategories) formData.append('image_categories', JSON.stringify(updatedData.imageCategories));
        if (updatedData.imagePrices) formData.append('image_prices', JSON.stringify(updatedData.imagePrices));
        if (updatedData.canBeHijabi !== undefined) formData.append('can_be_hijabi', updatedData.canBeHijabi);
        if (updatedData.needsBasic !== undefined) formData.append('needs_basic', updatedData.needsBasic);
        if (updatedData.gender) formData.append('gender', updatedData.gender);
        if (updatedData.fabricFocusFiles && updatedData.fabricFocusFiles.length > 0) {
          for (let i = 0; i < Math.min(updatedData.fabricFocusFiles.length, 10); i++) {
            formData.append(`fabric_focus_${i}`, updatedData.fabricFocusFiles[i]);
          }
        }
        // Note: For files, we are skipping them in update for now to avoid base64 upload issues via FormData

        await updateProduct(postId, formData);
      } else {
        await updatePostInAPI(postId, { content: updatedData.text });
      }
    } catch (error) {
      console.error("Error updating:", error);
      if (error.response && error.response.data) {
        console.error("Backend update validation errors:", error.response.data);
      }
    }
  };

  // دالة لتحويل File إلى base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleProfileImage = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        setProfileImage(base64);

        const formData = new FormData();
        formData.append('image', file);
        await updateUserProfile(formData);

        if (setUser) {
          setUser(prev => ({
            ...prev,
            profile: { ...prev?.profile, image: base64 }
          }));
        }
        showMessage("Profile image updated successfully!");
      } catch (error) {
        console.error("Error updating image:", error);
        showMessage("Error uploading image");
      }
    }
  };

  const handleCoverImage = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        setCoverImage(base64);

        const formData = new FormData();
        formData.append('cover_image', file);
        await updateUserProfile(formData);

        if (setUser) {
          setUser(prev => ({
            ...prev,
            profile: { ...prev?.profile, cover_image: base64 }
          }));
        }
        showMessage("Cover image updated successfully!");
      } catch (error) {
        console.error("Error updating cover:", error);
        showMessage("Error uploading cover image");
      }
    }
  };

  const handleSaveName = async () => {
    try {
      const formData = new FormData();
      formData.append('first_name', tempName);
      await updateUserProfile(formData);
      setUsername(tempName);
      if (setUser) {
        setUser(prev => ({ ...prev, first_name: tempName }));
      }
      showMessage("Name updated successfully!");
    } catch (error) {
      console.error("Failed to update name on backend:", error);
      showMessage("Failed to update name.");
    }
  };

  const handleSaveCountry = async () => {
    try {
      const selectedCountryObj = countries.find(c => c.name === tempCountry || c.isoCode === tempCountry);
      const currency = selectedCountryObj ? selectedCountryObj.currency : "EGP";
      const countryName = selectedCountryObj ? selectedCountryObj.name : tempCountry;
      const formData = new FormData();
      formData.append('country', countryName);
      formData.append('currency', currency);
      await updateUserProfile(formData);
      if (setUser) {
        setUser(prev => ({
          ...prev,
          profile: { ...prev?.profile, country: countryName, currency: currency }
        }));
      }
      showMessage("Country & Currency updated successfully!");
    } catch (error) {
      console.error("Failed to update country:", error);
      showMessage("Failed to update country.");
    }
  };

  const handleEdit = (post) => {
    setIsEditing(true);
    setEditPostId(post.id);
    setNewPostText(post.text);
    setNewPrice(post.price || "");
    setPriceBeforeSale(post.priceBeforeSale || "");
    setAvailableColors(post.availableColors || "");
    setImagePrices(post.imagePrices || []); // ✅ إضافة imagePrices
    setCanBeHijabi(post.canBeHijabi || false);
    setNeedsBasic(post.needsBasic || false);
    setGender(post.gender || "MALE");
    // إرجاع البيانات الجديدة للمودال عند التعديل
    setSelectedSizes(post.sizes || []);
    setSelectedShoeSizes(post.shoeSizes || []);
    setFabricType(post.fabricType || "");
    setCareInstructions(post.careInstructions || "");
    setSizeGuide(post.sizeGuide || {});
    setShoeSizeGuide(post.shoeSizeGuide || {});
    setNewFiles([]);
    setFabricFocusFiles([]);
    setImageCategories(post.imageCategories || []);
    setActiveCategoryGroup((post.imageCategories || []).map(() => null));
    const modal = new bootstrap.Modal(document.getElementById('postModal'));
    modal.show();
  };

  // دالة اختيار المقاسات
  const toggleSize = (size) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  // دالة اختيار مقاسات الجزم
  const toggleShoeSize = (size) => {
    setSelectedShoeSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const resetPostForm = () => {
    setIsEditing(false);
    setNewPostText("");
    setNewPrice("");
    setPriceBeforeSale("");
    setAvailableColors("");
    setImagePrices([]);
    setCanBeHijabi(false);
    setNeedsBasic(false);
    setNewFiles([]);
    setSelectedSizes([]);
    setSelectedShoeSizes([]);
    setFabricFocusFiles([]);
    setSizeGuide({});
    setShoeSizeGuide({});
    setFabricType("");
    setCareInstructions("");
    setImageCategories([]);
    setActiveCategoryGroup([]);
    setTimeout(() => {
      document.querySelectorAll('#postModal input[type="file"]').forEach(input => input.value = '');
    }, 100);
  };

  const handleAddPost = async () => {
    if (!newPostText || newPostText.trim() === "") {
      showMessage(userRole === "seller" ? "Please add a product description!" : "Please write something first!");
      return;
    }

    if (userRole === "seller" && !isEditing && newFiles.length === 0) {
      showMessage("Please add at least one product image!");
      return;
    }

    if (userRole === "seller" && !isEditing && !imageCategories.some(c => c !== "")) {
      showMessage("Please select a category for the product image!");
      return;
    }

    if (userRole === "seller" && !isEditing && fabricFocusFiles.length === 0) {
      showMessage("Please upload at least one Fabric Focus image!");
      return;
    }

    if (userRole === "seller" && (!newPrice || newPrice.trim() === "")) {
      showMessage("You forgot to add the product price!");
      return;
    }

    if (isEditing) {
      const updatedData = {
        text: newPostText,
        ...(userRole === "seller" ? {
          price: newPrice,
          priceBeforeSale,
          availableColors,
          imagePrices,
          sizes: selectedSizes,
          shoeSizes: selectedShoeSizes,
          sizeGuide,
          shoeSizeGuide,
          fabricType,
          careInstructions,
          categories: [...new Set(imageCategories.filter(Boolean))],
          imageCategories,
          fabricFocusFiles,
          canBeHijabi,
          needsBasic,
          gender,
        } : {})
      };
      await handleUpdatePost(editPostId, updatedData);
      setIsEditing(false);
      setEditPostId(null);
    } else {
      if (userRole === "seller") {
        try {
          const formData = new FormData();
          formData.append('name', newPostText || 'Product');
          formData.append('description', newPostText);
          formData.append('price', newPrice);
          formData.append('price_before_sale', priceBeforeSale ? priceBeforeSale : 0);

          let primaryCategoryId = categoriesData[0]?.id || 1;
          const firstImgCatId = imageCategories.find(c => c !== "");
          if (firstImgCatId) {
            primaryCategoryId = firstImgCatId;
          }
          formData.append('category', primaryCategoryId);

          formData.append('gender', gender);
          formData.append('available_colors', availableColors);
          formData.append('fabric_type', fabricType);
          formData.append('care_instructions', careInstructions);
          formData.append('size_guide', JSON.stringify(sizeGuide));
          formData.append('shoe_size_guide', JSON.stringify(shoeSizeGuide));
          formData.append('image_categories', JSON.stringify(imageCategories));
          formData.append('image_prices', JSON.stringify(imagePrices));
          formData.append('can_be_hijabi', canBeHijabi);
          formData.append('needs_basic', needsBasic);

          if (newFiles.length > 0) {
            formData.append('image', newFiles[0]); // main image
            for (let i = 1; i < Math.min(newFiles.length, 5); i++) {
              formData.append(`secondary_image_${i}`, newFiles[i]);
            }
          }

          if (fabricFocusFiles && fabricFocusFiles.length > 0) {
            for (let i = 0; i < Math.min(fabricFocusFiles.length, 10); i++) {
              formData.append(`fabric_focus_${i}`, fabricFocusFiles[i]);
            }
          }

          const newProd = await addProduct(formData);
          setPosts([mapProductToPost(newProd), ...posts]);
        } catch (error) {
          console.error("Error adding product:", error);
          if (error.response && error.response.data) {
            console.error("Backend Error Data:", error.response.data);
            const errStr = typeof error.response.data === 'object'
              ? Object.entries(error.response.data).map(([k, v]) => `${k}: ${v}`).join(' | ')
              : "Bad Request";
            showMessage(`Error: ${errStr}`);
          } else {
            showMessage("Failed to add product");
          }
          return;
        }
      } else {
        // Customer: Create a community post
        try {
          const formData = new FormData();
          formData.append('content', newPostText);
          if (newFiles.length > 0) {
            formData.append('image', newFiles[0]);
          }
          const newP = await addPost(formData);
          setPosts([mapCommunityPostToPost(newP), ...posts]);
        } catch (error) {
          console.error("Error adding community post:", error);
          showMessage("Failed to create post");
          return;
        }
      }
    }

    resetPostForm();

    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('postModal'));
    if (modalInstance) modalInstance.hide();
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.style.overflow = 'auto';
    showMessage(userRole === "seller" ? "Product Posted Successfully!" : "Post Created Successfully!");
  };

  const deletePost = async (id) => {
    showConfirm("Are you sure you want to delete this?", async () => {
      try {
        if (userRole === "seller") {
          await deleteProductAPI(id);
        } else {
          await deletePostAPI(id);
        }
        setPosts(posts.filter(p => p.id !== id));
        removeFromCart(id);
        removeFromWishlist(id);
        showMessage("Deleted successfully");
      } catch (error) {
        console.error("Delete failed:", error);
        showMessage("Delete failed");
      }
    });
  };

  return (
    <div style={{ backgroundColor: darkMode ? "#121212" : "#f0f2f5", minHeight: "100vh", color: darkMode ? "#fff" : "#000", transition: "0.3s" }}>
      <style>{`
        @media (max-width: 768px) {
          .profile-cover-container { height: auto !important; min-height: 120px; overflow: visible !important; background-color: #121212; display: flex; align-items: center; justify-content: center; }
          .profile-cover-img { border-radius: 0 !important; width: 100% !important; height: auto !important; max-height: 400px !important; object-fit: contain !important; }
          .profile-info-section { flex-direction: column !important; align-items: center !important; padding: 0 15px !important; top: -40px !important; margin-bottom: -20px !important; }
          .profile-info-left { flex-direction: column !important; align-items: center !important; gap: 8px !important; width: 100% !important; }
          .profile-avatar { width: 110px !important; height: 110px !important; border-width: 3px !important; }
          .profile-name-container { padding-bottom: 0 !important; text-align: center !important; }
          .profile-name-text { font-size: 1.4rem !important; }
          .profile-info-right { width: 100% !important; padding-top: 10px !important; padding-bottom: 0 !important; justify-content: center !important; gap: 8px !important; flex-wrap: wrap !important; }
          .cover-overlay-actions { top: 10px !important; right: 10px !important; z-index: 100 !important; }
        }
        @media (max-width: 480px) {
          .profile-info-right { flex-direction: row !important; flex-wrap: wrap !important; gap: 5px !important; width: 100% !important; }
          .profile-action-btn { flex-grow: 1 !important; font-size: 0.8rem !important; padding: 8px !important; white-space: nowrap !important; }
          .more-btn { flex-grow: 0 !important; padding: 8px 10px !important; }
          .brand-info-card { margin-top: 20px !important; }
        }
        .custom-hover-light:hover { background-color: #f3f4f6 !important; }
        .custom-hover-dark:hover { background-color: #3f3f46 !important; color: #fff !important; }
      `}</style>
      {/* ══════════════════════════════════
          ── Facebook Style Profile Header ──
      ══════════════════════════════════ */}
      <div className={`profile-header-container ${darkMode ? 'dark-mode' : 'light-mode'}`}>
        
        {/* ── Cover Photo ── */}
        <div className="profile-cover-container">
          <img
            src={coverImage || dressBanner}
            alt="Cover"
            className="profile-cover-img"
          />
          
          {/* Top Nav Actions */}
          <div className="cover-overlay-actions">
            
            <div className="dropdown">
              <button className="btn" data-bs-toggle="dropdown" aria-expanded="false" style={{ 
                background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", color: "#fff", 
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                padding: "8px 18px", borderRadius: "999px", fontWeight: "bold", fontSize: "15px"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
                Menu
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 p-2" style={{ borderRadius: "14px", minWidth: "160px", marginTop: "8px", zIndex: 99999, backgroundColor: darkMode ? "#242526" : "#ffffff" }}>
                <li><button className={`dropdown-item py-2 px-3 rounded-3 fw-semibold ${darkMode ? 'text-light custom-hover-dark' : 'text-dark custom-hover-light'}`} onClick={() => navigate("/home")}>Home</button></li>
                <li><button className={`dropdown-item py-2 px-3 rounded-3 fw-semibold ${darkMode ? 'text-light custom-hover-dark' : 'text-dark custom-hover-light'}`} onClick={() => navigate("/shop")}>Shop</button></li>
                <li><hr className="dropdown-divider my-2" style={{ borderColor: darkMode ? "#3f3f46" : "#f3f4f6" }} /></li>
                <li><button className={`dropdown-item py-2 px-3 rounded-3 fw-semibold ${darkMode ? 'text-light custom-hover-dark' : 'text-dark custom-hover-light'}`} onClick={() => navigate("/vichat")}>Chatbot</button></li>
                <li><button className={`dropdown-item py-2 px-3 rounded-3 fw-semibold ${darkMode ? 'text-light custom-hover-dark' : 'text-dark custom-hover-light'}`} onClick={() => navigate("/wish")}>Wishlist</button></li>
                <li><button className={`dropdown-item py-2 px-3 rounded-3 fw-semibold ${darkMode ? 'text-light custom-hover-dark' : 'text-dark custom-hover-light'}`} onClick={() => navigate("/cart")}>Cart</button></li>
              </ul>
            </div>

          </div>
        </div>

        {/* ── Profile Info Section ── */}
        <div className="profile-info-section">
          
          {/* Left: Avatar & Name */}
          <div className="profile-info-left">
            <div className="profile-avatar-wrapper">
              <img src={profileImage || "https://ui-avatars.com/api/?name=User"} alt="Avatar" className="profile-avatar" />
            </div>
            <div className="profile-name-container">
              <h2 className={`profile-name-text ${darkMode ? 'dark-mode' : 'light-mode'}`}>{username}</h2>
              {userRole === "seller" && (
                <div className="profile-stats-container" style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "8px", flexWrap: "wrap", justifyContent: "inherit" }}>
                  <span className="badge bg-warning text-dark" style={{ alignSelf: "center", fontSize: "0.85rem", padding: "6px 10px" }}>✦ Seller</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="profile-info-right">
            {!isPublicProfile && (
              <>
                {/* Primary Action */}
                {userRole === "seller" ? (
                  <>
                    <button className="profile-action-btn btn-primary-action d-lg-none" onClick={() => {
                      const el = document.getElementById('seller-dashboard-card');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }} style={{ backgroundColor: "#10b981", border: "none" }}>
                      📊 Dashboard
                    </button>
                    <button className="profile-action-btn btn-primary-action" data-bs-target="#postModal" data-bs-toggle="modal" onClick={resetPostForm}>
                      + New Product
                    </button>
                  </>
                ) : (
                  <button className="profile-action-btn btn-primary-action" data-bs-target="#postModal" data-bs-toggle="modal" onClick={resetPostForm}>
                    + New Post
                  </button>
                )}

                {/* Secondary Actions (Hamburger Menu) */}
                <div className="dropdown">
                  <button className="profile-action-btn btn-secondary-action more-btn" data-bs-toggle="dropdown" aria-expanded="false">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                    </svg>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 p-2" style={{ borderRadius: "14px", minWidth: "220px", zIndex: 9999, backgroundColor: darkMode ? "#242526" : "#ffffff" }}>
                    <li><h6 className="dropdown-header text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: "1px", color: darkMode ? "#9ca3af" : "#6b7280" }}>Profile Settings</h6></li>
                    <li><label className={`dropdown-item py-2 rounded-3 ${darkMode ? 'text-light custom-hover-dark' : 'text-dark custom-hover-light'}`} style={{cursor:"pointer", fontWeight:500, fontSize:"0.9rem", transition:"all 0.2s"}}>Change Cover <input type="file" hidden onChange={handleCoverImage} /></label></li>
                    <li><label className={`dropdown-item py-2 rounded-3 ${darkMode ? 'text-light custom-hover-dark' : 'text-dark custom-hover-light'}`} style={{cursor:"pointer", fontWeight:500, fontSize:"0.9rem", transition:"all 0.2s"}}>Change Avatar <input type="file" hidden onChange={handleProfileImage} /></label></li>
                    <li><button className={`dropdown-item py-2 rounded-3 ${darkMode ? 'text-light custom-hover-dark' : 'text-dark custom-hover-light'}`} style={{fontWeight:500, fontSize:"0.9rem", transition:"all 0.2s"}} data-bs-target="#nameModal" data-bs-toggle="modal">Change Name</button></li>
                    <li><button className={`dropdown-item py-2 rounded-3 ${darkMode ? 'text-light custom-hover-dark' : 'text-dark custom-hover-light'}`} style={{fontWeight:500, fontSize:"0.9rem", transition:"all 0.2s"}} data-bs-target="#countryModal" data-bs-toggle="modal">Change Country</button></li>
                    <li><hr className="dropdown-divider my-2" style={{ borderColor: darkMode ? "#3f3f46" : "#f3f4f6" }} /></li>
                    <li><h6 className="dropdown-header text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: "1px", color: darkMode ? "#9ca3af" : "#6b7280" }}>Account</h6></li>
                    <li><button className={`dropdown-item py-2 rounded-3 ${darkMode ? 'text-light custom-hover-dark' : 'text-dark custom-hover-light'}`} style={{fontWeight:500, fontSize:"0.9rem", transition:"all 0.2s"}} onClick={() => navigate('/makeup-history')}>Makeup History</button></li>
                    <li><button className={`dropdown-item py-2 rounded-3 ${darkMode ? 'text-light custom-hover-dark' : 'text-dark custom-hover-light'}`} style={{fontWeight:500, fontSize:"0.9rem", transition:"all 0.2s"}} onClick={() => setDarkMode(!darkMode)}>{darkMode ? "Light Mode" : "Dark Mode"}</button></li>
                    <li><hr className="dropdown-divider my-2" style={{ borderColor: darkMode ? "#3f3f46" : "#f3f4f6" }} /></li>
                    <li><button className="dropdown-item py-2 rounded-3 text-danger" style={{fontWeight:600, fontSize:"0.9rem", transition:"all 0.2s"}} onClick={logout}>Logout</button></li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>

      </div>{/* end header container */}

      <div className="container" style={{ maxWidth: userRole === "seller" ? "1400px" : "1000px", marginTop: "28px" }}>
        <div className="row">
          <div className={userRole === "seller" ? "col-lg-7" : "col-12"}>
            {loadingPosts ? (
              <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
                <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : posts.length > 0 ? (
              posts.map(p => (
                <div
                  key={p.id}
                  ref={(el) => postRefs.current[p.id] = el}
                >
                  <Post
                    post={p} darkMode={darkMode} currentUserImage={profileImage}
                    onDelete={isPublicProfile ? null : () => deletePost(p.id)} onEdit={isPublicProfile ? null : () => handleEdit(p)}
                    isSeller={userRole === "seller"}
                    onUpdatePost={handleUpdatePost}
                  />
                </div>
              ))
            ) : (
              <div className="text-center p-5 mt-4 rounded-4" style={{ backgroundColor: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "10px", opacity: 0.5 }}>📭</div>
                <h5 className={`fw-bold ${darkMode ? 'text-light' : 'text-dark'}`}>No posts yet</h5>
                <p className={`${darkMode ? 'text-secondary' : 'text-muted'}`}>When there are posts or products, they will show up here.</p>
              </div>
            )}
          </div>

          {userRole === "seller" && (
            <div className="col-lg-5" id="seller-dashboard-card">
              <div className={`card border-0 shadow rounded-4 sticky-top ${darkMode ? "bg-dark text-white" : "bg-white"}`} style={{ top: "20px", maxHeight: "calc(100vh - 40px)", overflowY: "auto", overflowX: "hidden" }}>

                {/* ══════════════════════════════════
                    ── Brand Identity Card ──
                ══════════════════════════════════ */}
                {brandData && (
                  <div style={{
                    background: darkMode
                      ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
                      : "linear-gradient(135deg, #fdfbff 0%, #f3eeff 100%)",
                    borderBottom: darkMode ? "1px solid #2a2a3e" : "1px solid #e8e0f8",
                    padding: "22px 24px 18px",
                  }}>

                    {/* Brand Header row */}
                    <div className="d-flex align-items-center gap-3 mb-3">
                      {/* Brand logo placeholder */}
                      <div style={{
                        width: 54, height: 54, borderRadius: "14px", flexShrink: 0,
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.5rem", boxShadow: "0 4px 14px rgba(118,75,162,0.35)",
                      }}>
                        🏷️
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: "1.05rem", fontWeight: 800, letterSpacing: "-0.2px",
                          color: darkMode ? "#e2e8f0" : "#1e1b2e",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {brandData.brandName || username}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: darkMode ? "#a78bfa" : "#7c3aed", fontWeight: 600 }}>
                          Official Brand Account
                        </div>
                      </div>

                      {/* Actions and Stats */}
                      <div className="ms-auto d-flex flex-column align-items-end gap-2">
                        <div style={{
                          background: "linear-gradient(135deg, #667eea, #764ba2)",
                          borderRadius: "20px", padding: "3px 10px",
                          fontSize: "0.65rem", fontWeight: 700, color: "#fff",
                          letterSpacing: "0.3px", whiteSpace: "nowrap",
                          boxShadow: "0 2px 8px rgba(118,75,162,0.3)",
                        }}>
                          ✓ Verified
                        </div>
                        <div style={{ fontSize: "0.75rem", fontWeight: "600", color: darkMode ? "#e2e8f0" : "#1e293b" }}>
                          👥 {followersCount} Followers
                        </div>
                        {isPublicProfile && (
                          <button 
                            className="btn btn-sm rounded-pill fw-bold px-3 py-1 mt-1 shadow-sm" 
                            style={{
                              background: isFollowing ? "transparent" : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                              border: isFollowing ? "1px solid #7c3aed" : "none",
                              color: isFollowing ? (darkMode ? "#a78bfa" : "#7c3aed") : "#fff",
                              fontSize: "0.75rem",
                              transition: "all 0.2s"
                            }}
                            onClick={handleToggleFollow}
                          >
                            {isFollowing ? "Following" : "+ Follow"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: darkMode ? "rgba(255,255,255,0.06)" : "rgba(118,75,162,0.12)", marginBottom: 14 }} />

                    {/* Info rows */}
                    <div className="d-flex flex-column gap-2" style={{ fontSize: "0.82rem" }}>

                      {brandData.brandYear && (
                        <div className="d-flex align-items-center gap-2">
                          <span style={{
                            width: 28, height: 28, borderRadius: "8px", flexShrink: 0,
                            background: darkMode ? "#2a2a3e" : "#ede9fe",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.9rem",
                          }}>📅</span>
                          <div>
                            <div style={{ fontSize: "0.65rem", fontWeight: 600, color: darkMode ? "#888" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Founded</div>
                            <div style={{ fontWeight: 700, color: darkMode ? "#e2e8f0" : "#1e293b" }}>{brandData.brandYear}</div>
                          </div>
                        </div>
                      )}

                      {brandData.taxNumber && (
                        <div className="d-flex align-items-center gap-2">
                          <span style={{
                            width: 28, height: 28, borderRadius: "8px", flexShrink: 0,
                            background: darkMode ? "#2a2a3e" : "#ede9fe",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.9rem",
                          }}>🧾</span>
                          <div>
                            <div style={{ fontSize: "0.65rem", fontWeight: 600, color: darkMode ? "#888" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tax Reg. No.</div>
                            <div style={{ fontWeight: 600, color: darkMode ? "#e2e8f0" : "#1e293b", fontFamily: "monospace", fontSize: "0.85rem" }}>{brandData.taxNumber}</div>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Brand Intro */}
                    {brandData.brandIntro && (
                      <div style={{
                        marginTop: 14,
                        background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(118,75,162,0.06)",
                        border: darkMode ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(118,75,162,0.15)",
                        borderRadius: 12,
                        padding: "12px 14px",
                        position: "relative",
                      }}>
                        {/* quote icon */}
                        <div style={{
                          position: "absolute", top: -8, left: 14,
                          background: darkMode ? "#1a1a2e" : "#f3eeff",
                          padding: "0 6px",
                          fontSize: "0.75rem", color: "#764ba2", fontWeight: 800,
                        }}>❝</div>
                        <p style={{
                          margin: 0, fontSize: "0.8rem", lineHeight: 1.65,
                          color: darkMode ? "#c4b5fd" : "#4c1d95",
                          fontStyle: "italic",
                        }}>
                          {brandData.brandIntro}
                        </p>
                      </div>
                    )}

                  </div>
                )}

                {/* ── Header Gradient ── */}
                {!isPublicProfile && (
                  <>
                <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "20px 24px 16px" }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h5 className="fw-bold mb-0 text-white">📊 Business Analytics</h5>
                      <p className="mb-0" style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem" }}>
                        {posts.length} product{posts.length !== 1 ? "s" : ""} listed
                      </p>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "12px", padding: "8px 14px", backdropFilter: "blur(8px)" }}>
                      <span style={{ fontSize: "1.5rem" }}>🏪</span>
                    </div>
                  </div>
                </div>

                {/* ── Summary Stat Cards ── */}
                <div className="d-flex gap-2 p-3 flex-wrap" style={{ background: darkMode ? "#1a1a2e" : "#f5f3ff" }}>
                  {[
                    { label: "Likes", value: posts.reduce((s, p) => s + (p.likes || 0), 0), color: "#22c55e", icon: "👍" },
                    { label: "In Cart", value: posts.reduce((s, p) => s + (p.inCart || 0), 0), color: "#3b82f6", icon: "🛒" },
                    { label: "Sales", value: posts.reduce((s, p) => s + (p.sales || 0), 0), color: "#f59e0b", icon: "💰" },
                    { label: "Comments", value: posts.reduce((s, p) => s + (p.comments?.length || 0), 0), color: "#8b5cf6", icon: "💬" },
                    { label: "Replies", value: posts.reduce((s, p) => s + (p.comments?.reduce((rs, c) => rs + (c.replies?.length || 0), 0) || 0), 0), color: "#06b6d4", icon: "↩️" },
                  ].map(stat => (
                    <div key={stat.label} className="flex-fill text-center rounded-3 py-2 px-1"
                      style={{ background: darkMode ? "#242536" : "#fff", border: `1px solid ${stat.color}30`, minWidth: "58px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                      <div style={{ fontSize: "1rem", lineHeight: 1.2 }}>{stat.icon}</div>
                      <div className="fw-bold" style={{ color: stat.color, fontSize: "1.15rem", lineHeight: 1.1 }}>{stat.value}</div>
                      <div style={{ color: darkMode ? "#aaa" : "#94a3b8", fontSize: "0.62rem", fontWeight: 500 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* ── Products Table ── */}
                <div className="px-3 pb-3">
                  <div className="table-responsive" style={{ overflowY: "visible" }}>
                    <table className={`table table-borderless align-middle mb-0 ${darkMode ? "table-dark" : ""}`} style={{ fontSize: "0.78rem" }}>
                      <thead className="sticky-top" style={{ background: darkMode ? "#242526" : "#fff", zIndex: 1 }}>
                        <tr style={{ borderBottom: `2px solid ${darkMode ? "#3a3a50" : "#e2e8f0"}` }}>
                          <th className="fw-semibold pb-2" style={{ color: darkMode ? "#aaa" : "#64748b", fontSize: "0.72rem" }}>Product</th>
                          <th className="fw-semibold pb-2" style={{ color: darkMode ? "#aaa" : "#64748b", fontSize: "0.72rem" }}>Category</th>
                          <th className="fw-semibold pb-2 text-center" style={{ color: "#22c55e", fontSize: "0.72rem" }}>👍</th>
                          <th className="fw-semibold pb-2 text-center" style={{ color: "#ef4444", fontSize: "0.72rem" }}>👎</th>
                          <th className="fw-semibold pb-2 text-center" style={{ color: "#3b82f6", fontSize: "0.72rem" }}>🛒</th>
                          <th className="fw-semibold pb-2 text-center" style={{ color: "#f59e0b", fontSize: "0.72rem" }}>💰</th>
                          <th className="fw-semibold pb-2 text-center" style={{ color: "#f59e0b", fontSize: "0.72rem" }}>⭐</th>
                          <th className="fw-semibold pb-2 text-center" style={{ color: darkMode ? "#aaa" : "#64748b", fontSize: "0.72rem" }}>💬</th>
                          <th className="fw-semibold pb-2 text-center" style={{ color: "#06b6d4", fontSize: "0.72rem" }}>↩️</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posts.map(p => {
                          const totalVotes = (p.likes || 0) + (p.dislikes || 0);
                          const likeRatio = totalVotes > 0 ? Math.round(((p.likes || 0) / totalVotes) * 100) : null;
                          return (
                            <tr key={p.id}
                              style={{ borderBottom: `1px solid ${darkMode ? "#2a2a3e" : "#f1f5f9"}`, transition: "background 0.15s", cursor: "default" }}
                              onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#1a1a2e" : "#f8f7ff"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                              {/* Product name + like ratio bar */}
                              <td style={{ maxWidth: "85px" }}>
                                <div className="fw-bold text-truncate" style={{ color: darkMode ? "#e2e8f0" : "#1e293b" }}>
                                  {p.text || "Product"}
                                </div>
                                {likeRatio !== null && (
                                  <div style={{ marginTop: "3px", height: "3px", borderRadius: "99px", background: darkMode ? "#333" : "#e2e8f0", overflow: "hidden" }}>
                                    <div style={{ width: `${likeRatio}%`, height: "100%", background: likeRatio >= 70 ? "#22c55e" : likeRatio >= 40 ? "#f59e0b" : "#ef4444", borderRadius: "99px", transition: "width 0.4s" }} />
                                  </div>
                                )}
                              </td>

                              {/* Category badge */}
                              <td style={{ minWidth: "80px" }}>
                                {p.categories && p.categories.length > 0 ? (
                                  <div className="d-flex flex-column gap-1">
                                    {p.categories.slice(0, 1).map((catId, i) => {
                                      const groupObj = getCategoryGroupObj(catId);
                                      const color = groupObj?.color || "#6c757d";
                                      return (
                                        <span key={i} className="badge rounded-pill px-2" style={{ background: color + "18", color, border: `1px solid ${color}44`, fontSize: "0.6rem", fontWeight: 600 }}>
                                          {getCategoryNameById(catId)}
                                        </span>
                                      );
                                    })}
                                    {p.categories.length > 1 && (
                                      <span style={{ color: darkMode ? "#777" : "#94a3b8", fontSize: "0.6rem" }}>+{p.categories.length - 1} more</span>
                                    )}
                                  </div>
                                ) : <span style={{ color: "#94a3b8" }}>—</span>}
                              </td>

                              {/* Metrics */}
                              <td className="text-center">
                                <span className="badge rounded-pill" style={{ background: "#22c55e18", color: "#22c55e", fontSize: "0.72rem", padding: "3px 7px" }}>{p.likes || 0}</span>
                              </td>
                              <td className="text-center">
                                <span className="badge rounded-pill" style={{ background: "#ef444418", color: "#ef4444", fontSize: "0.72rem", padding: "3px 7px" }}>{p.dislikes || 0}</span>
                              </td>
                              <td className="text-center">
                                <span className="badge rounded-pill" style={{ background: "#3b82f618", color: "#3b82f6", fontSize: "0.72rem", padding: "3px 7px" }}>{p.inCart || 0}</span>
                              </td>
                              <td className="text-center fw-bold" style={{ color: "#f59e0b" }}>{p.sales || 0}</td>
                              <td className="text-center">
                                <span style={{ color: "#f59e0b", fontSize: "0.72rem", fontWeight: 600 }}>
                                  {p.rating ? `⭐${p.rating}` : "—"}
                                </span>
                              </td>
                              <td className="text-center" style={{ color: darkMode ? "#aaa" : "#64748b" }}>{p.comments?.length || 0}</td>
                              <td className="text-center">
                                <span className="badge rounded-pill" style={{ background: "#06b6d418", color: "#06b6d4", fontSize: "0.72rem", padding: "3px 7px" }}>
                                  {p.comments?.reduce((sum, c) => sum + (c.replies?.length || 0), 0) || 0}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Seller Coupons Section ── */}
                {userRole === "seller" && (
                  <SellerCoupons darkMode={darkMode} />
                )}
                </>
                )}

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Name */}
      <div
        className="modal fade"
        id="nameModal"
        tabIndex="-1"
        style={{ zIndex: 99999 }}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          style={{ zIndex: 99999 }}
        >
          <div className={`modal-content border-0 rounded-4 ${darkMode ? "bg-dark text-white" : ""}`}>
            <div className="modal-header border-0 pb-0"><h5 className="modal-title fw-bold">Update Name</h5><button type="button" className="btn-close" data-bs-dismiss="modal"></button></div>
            <div className="modal-body py-4"><input type="text" className="form-control rounded-pill px-3" value={tempName} onChange={(e) => setTempName(e.target.value)} /></div>
            <div className="modal-footer border-0 pt-0">
              <button className="btn btn-primary w-100 rounded-pill fw-bold" onClick={handleSaveName} data-bs-dismiss="modal">Save</button>
            </div>
          </div>
        </div>
      </div>
      {/* ✅ Modal Post المحدث */}
      <div
        className="modal fade"
        id="postModal"
        tabIndex="-1"
        style={{ zIndex: 99999 }}
      >
        <div
          className="modal-dialog modal-dialog-centered modal-lg"
          style={{ zIndex: 99999 }}
        >
          <div className={`modal-content border-0 rounded-4 shadow ${darkMode ? "bg-dark text-white" : ""}`}>
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title fw-bold">
                {isEditing ? (userRole === "seller" ? "Edit Product" : "Edit Post") : (userRole === "seller" ? "New Product" : "New Post")}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body py-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <textarea
                className={`form-control border-0 rounded-4 mb-3 ${darkMode ? "bg-secondary text-white" : "bg-light"}`}
                rows="3"
                placeholder={userRole === "seller" ? "Product details..." : "What's on your mind?..."}
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
              />

              {userRole === "seller" && (
                <>
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="small fw-bold mb-1">Price Before Sale ($)</label>
                      <input type="number" className="form-control rounded-pill px-3 shadow-sm" placeholder="If no sale write 0" value={priceBeforeSale} onChange={(e) => setPriceBeforeSale(e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="small fw-bold mb-1">Price After Sale ($)</label>
                      <input type="number" className="form-control rounded-pill px-3 shadow-sm" placeholder="Final Price" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="small fw-bold mb-1">Gender</label>
                      <select className="form-control rounded-pill px-3 shadow-sm" value={gender} onChange={(e) => setGender(e.target.value)}>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="UNISEX">Unisex</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="small fw-bold mb-1">Colors</label>
                      <input type="text" className="form-control rounded-pill px-3 shadow-sm" placeholder="e.g. Red" value={availableColors} onChange={(e) => setAvailableColors(e.target.value)} />
                    </div>
                  </div>

                  {/* 👕 جدول مقاسات الملابس */}
                  <div className="mb-3">
                    <label className="small fw-bold mb-2 d-block">Clothes Sizes (Select multiple)</label>
                    <div className="d-flex gap-2 flex-wrap">
                      {['S', 'M', 'L', 'XL', 'XXL', 'Free Size'].map(size => (
                        <button
                          key={size}
                          type="button"
                          className={`btn btn-sm rounded-pill px-3 ${selectedSizes.includes(size) ? 'btn-primary shadow' : 'btn-outline-secondary'}`}
                          onClick={() => toggleSize(size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedSizes.length > 0 && (
                    <div className="mb-3 p-3 rounded-4 border shadow-sm bg-light text-dark">
                      <label className="small fw-bold mb-2 d-block">Clothes Size Guide (Weight kg)</label>
                      <div className="row g-2">
                        {selectedSizes.map(size => (
                          <div key={size} className="col-4">
                            <small className="d-block text-muted">{size}:</small>
                            <input
                              type="text"
                              className="form-control form-control-sm border-0 shadow-sm rounded-pill px-2"
                              placeholder="e.g. 60-70"
                              value={sizeGuide[size] || ""}
                              onChange={(e) => setSizeGuide({ ...sizeGuide, [size]: e.target.value })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 👞 جدول مقاسات الأحذية */}
                  <div className="mb-3">
                    <label className="small fw-bold mb-2 d-block">Shoe Sizes (35 to 43)</label>
                    <div className="d-flex gap-2 flex-wrap">
                      {['35', '36', '37', '38', '39', '40', '41', '42', '43'].map(size => (
                        <button
                          key={size}
                          type="button"
                          className={`btn btn-sm rounded-pill px-3 ${selectedShoeSizes.includes(size) ? 'btn-success text-white shadow' : 'btn-outline-secondary'}`}
                          onClick={() => toggleShoeSize(size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedShoeSizes.length > 0 && (
                    <div className="mb-3 p-3 rounded-4 border shadow-sm bg-light text-dark">
                      <label className="small fw-bold mb-2 d-block">Shoe Size Guide (Details)</label>
                      <div className="row g-2">
                        {selectedShoeSizes.map(size => (
                          <div key={size} className="col-4">
                            <small className="d-block text-muted">{size}:</small>
                            <input
                              type="text"
                              className="form-control form-control-sm border-0 shadow-sm rounded-pill px-2"
                              placeholder="e.g. Fits wide feet"
                              value={shoeSizeGuide[size] || ""}
                              onChange={(e) => setShoeSizeGuide({ ...shoeSizeGuide, [size]: e.target.value })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="small fw-bold mb-1">Fabric Type</label>
                    <input type="text" className="form-control rounded-pill px-3 shadow-sm" placeholder="e.g. Cotton, Silk" value={fabricType} onChange={(e) => setFabricType(e.target.value)} />
                  </div>

                  <div className="mb-3">
                    <label className="small fw-bold mb-1">Care & Cleaning Instructions</label>
                    <input type="text" className="form-control rounded-pill px-3 shadow-sm" placeholder="How to clean the product..." value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} />
                  </div>
                </>
              )}

              {userRole === "seller" ? (
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="small fw-bold mb-1">Main Images (Select Multiple)</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="form-control rounded-pill shadow-sm"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setNewFiles(files);
                        setImageCategories(files.map(() => ""));
                        setActiveCategoryGroup(files.map(() => null));
                      }}
                    />
                    {newFiles.length > 0 && <small className="text-primary d-block mt-1 ps-2">{newFiles.length} files selected</small>}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="small fw-bold mb-1">Fabric Focus (Close-up - Multiple) <span className="text-danger">*</span></label>
                    <input type="file" multiple accept="image/*" className="form-control rounded-pill shadow-sm" onChange={(e) => setFabricFocusFiles(Array.from(e.target.files))} />
                    {fabricFocusFiles.length > 0 && <small className="text-primary d-block mt-1 ps-2">{fabricFocusFiles.length} files selected</small>}
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <label className="small fw-bold mb-1">Add Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control rounded-pill shadow-sm"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setNewFiles(file ? [file] : []);
                    }}
                  />
                </div>
              )}

              {/* ✅ اختيار الكاتيجوري لكل صورة - Modern UI */}
              {userRole === "seller" && newFiles.length > 0 && (
                <div className="mb-3">
                  <label className="small fw-bold mb-2 d-block">
                    🏷️ {newFiles.length > 1 ? "Select a Category for Each Image" : "Select Category"}
                  </label>
                  <div className="d-flex flex-column gap-3">
                    {newFiles.map((file, idx) => {
                      const selectedCatId = imageCategories[idx] || "";
                      const selectedCatName = getCategoryNameById(selectedCatId);
                      const activeGroup = activeCategoryGroup[idx] || null;
                      const groupObj = getCategoryGroupObj(selectedCatId);
                      const selectedGroupColor = groupObj?.color || "#6c757d";

                      return (
                        <div
                          key={idx}
                          className="rounded-4 p-3"
                          style={{
                            background: darkMode ? "#1a1a2e" : "#f8f9ff",
                            border: selectedCatId
                              ? `1.5px solid ${selectedGroupColor}55`
                              : `1.5px solid ${darkMode ? "#333" : "#e2e8f0"}`,
                            transition: "border 0.2s",
                          }}
                        >
                          {/* صف رقم الصورة + اسمها + الاختيار الحالي */}
                          <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                            <span
                              className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                              style={{
                                width: 28, height: 28, fontSize: "0.75rem",
                                background: selectedCatId ? selectedGroupColor : "#6366f1",
                                color: "#fff", flexShrink: 0,
                              }}
                            >
                              {idx + 1}
                            </span>
                            <span className="small text-muted text-truncate" style={{ maxWidth: 160 }}>{file.name}</span>
                            {selectedCatId ? (
                              <span
                                className="badge rounded-pill px-3 py-1 ms-auto"
                                style={{ background: selectedGroupColor, color: "#fff", fontSize: "0.72rem" }}
                              >
                                ✓ {selectedCatName}
                              </span>
                            ) : (
                              <span className="badge rounded-pill px-3 py-1 ms-auto" style={{ background: "#e2e8f0", color: "#64748b", fontSize: "0.72rem" }}>
                                Not selected
                              </span>
                            )}
                          </div>

                          {/* Group pills */}
                          <div className="d-flex flex-wrap gap-1 mb-2">
                            {categoriesData.map((groupObj) => {
                              const group = groupObj.name;
                              const gColor = groupObj.color || "#6c757d";
                              const isActive = activeGroup === group;
                              return (
                                <button
                                  key={group}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...activeCategoryGroup];
                                    updated[idx] = isActive ? null : group;
                                    setActiveCategoryGroup(updated);
                                  }}
                                  className="btn btn-sm rounded-pill fw-semibold"
                                  style={{
                                    fontSize: "0.72rem",
                                    padding: "3px 10px",
                                    background: isActive ? gColor : gColor + "18",
                                    color: isActive ? "#fff" : gColor,
                                    border: `1px solid ${gColor}44`,
                                    transition: "all 0.15s",
                                  }}
                                >
                                  {group}
                                </button>
                              );
                            })}
                          </div>

                          {/* Sub-category pills */}
                          {activeGroup && (
                            <div
                              className="d-flex flex-wrap gap-1 pt-2"
                              style={{ borderTop: `1px solid ${darkMode ? "#333" : "#e2e8f0"}` }}
                            >
                              {getFlatItems(categoriesData.find(g => g.name === activeGroup) || {}).map(item => {
                                const isSelected = selectedCatId === item.id;
                                const parentColor = categoriesData.find(g => g.name === activeGroup)?.color || "#6c757d";
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      const updated = [...imageCategories];
                                      updated[idx] = isSelected ? "" : item.id;
                                      setImageCategories(updated);
                                    }}
                                    className="btn btn-sm rounded-pill"
                                    style={{
                                      fontSize: "0.72rem",
                                      padding: "3px 10px",
                                      background: isSelected ? parentColor : (darkMode ? "#2a2a3e" : "#fff"),
                                      color: isSelected ? "#fff" : (darkMode ? "#ccc" : "#334155"),
                                      border: `1px solid ${isSelected ? parentColor : (darkMode ? "#444" : "#cbd5e1")}`,
                                      fontWeight: isSelected ? 600 : 400,
                                      transition: "all 0.15s",
                                    }}
                                  >
                                    {isSelected ? "✓ " : ""}{item.name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ✅ Modesty Checkboxes (At the end of the form) */}
              {userRole === "seller" && showModestyCheckboxes() && (
                <div className="row mb-3 mt-4 pt-3 border-top" style={{ borderColor: darkMode ? "#333" : "#e2e8f0" }}>
                  <div className="col-md-6">
                    <div className="form-check mt-2 border p-3 rounded-4 shadow-sm" style={{ background: darkMode ? "#2a2a3e" : "#f8f9ff", transition: "all 0.2s" }}>
                      <input className="form-check-input ms-1" type="checkbox" id="canBeHijabi" checked={canBeHijabi} onChange={(e) => setCanBeHijabi(e.target.checked)} style={{ transform: "scale(1.2)", cursor: "pointer" }} />
                      <label className="form-check-label fw-bold ms-2" htmlFor="canBeHijabi" style={{ cursor: 'pointer', fontSize: "0.95rem" }}>
                        Can Be Hijabi (Suitable for Modest Wear)
                      </label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    {canBeHijabi && (
                      <div className="form-check mt-2 border p-3 rounded-4 shadow-sm" style={{ background: darkMode ? "#3a2a2a" : "#fff1f2", borderColor: "#ffe4e6", transition: "all 0.2s" }}>
                        <input className="form-check-input ms-1" type="checkbox" id="needsBasic" checked={needsBasic} onChange={(e) => setNeedsBasic(e.target.checked)} style={{ transform: "scale(1.2)", cursor: "pointer" }} />
                        <label className="form-check-label fw-bold ms-2 text-danger" htmlFor="needsBasic" style={{ cursor: 'pointer', fontSize: "0.95rem" }}>
                          Needs Basic Layer (Sleeveless / Open Neck)
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
            <div className="modal-footer border-0 pt-0">
              <button className="btn btn-primary w-100 rounded-pill fw-bold shadow" onClick={handleAddPost}>
                {isEditing ? "Update Product" : "Post Product"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* الرسائل السوداء */}
      {messageModal.show && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 999999,
        }}>
          <div style={{
            backgroundColor: "#000",
            color: "#f5f5dc",
            padding: "25px 30px",
            borderRadius: "10px",
            textAlign: "center",
            maxWidth: "90%",
            fontSize: "16px",
          }}>
            {messageModal.text}
          </div>
        </div>
      )}

      {/* رسالة تأكيد (Confirm) */}
      {confirmModal.show && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 999999,
        }}>
          <div style={{
            backgroundColor: "#000",
            color: "#f5f5dc",
            padding: "30px 40px",
            borderRadius: "10px",
            textAlign: "center",
            maxWidth: "90%",
          }}>
            <p style={{ fontSize: "16px", marginBottom: "20px", color: "#fff" }}>{confirmModal.text}</p>
            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
              <button
                onClick={handleConfirm}
                style={{
                  backgroundColor: "#dc3545",
                  color: "#fff",
                  border: "none",
                  padding: "10px 25px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold"
                }}
              >
                Yes, Delete
              </button>
              <button
                onClick={handleCancel}
                style={{
                  backgroundColor: "#6c757d",
                  color: "#fff",
                  border: "none",
                  padding: "10px 25px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name Modal */}
      <div className="modal fade" id="nameModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content" style={{ backgroundColor: darkMode ? "#242526" : "#ffffff", color: darkMode ? "#fff" : "#000" }}>
            <div className="modal-header border-0">
              <h5 className="modal-title fw-bold">Change Name</h5>
              <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <input type="text" className="form-control rounded-pill px-3 shadow-sm" value={tempName} onChange={(e) => setTempName(e.target.value)} />
            </div>
            <div className="modal-footer border-0">
              <button type="button" className="btn btn-secondary rounded-pill" data-bs-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-primary rounded-pill" data-bs-dismiss="modal" onClick={handleSaveName}>Save</button>
            </div>
          </div>
        </div>
      </div>

      {/* Country Modal */}
      <div className="modal fade" id="countryModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content" style={{ backgroundColor: darkMode ? "#242526" : "#ffffff", color: darkMode ? "#fff" : "#000" }}>
            <div className="modal-header border-0">
              <h5 className="modal-title fw-bold">Change Country</h5>
              <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <input 
                type="text" 
                className={`form-control rounded-pill px-3 shadow-sm mb-3 ${darkMode ? 'bg-dark text-light border-secondary' : ''}`} 
                placeholder="Search country... 🔍" 
                value={countrySearch} 
                onChange={(e) => setCountrySearch(e.target.value)} 
              />
              <select className={`form-select rounded-3 px-3 shadow-sm ${darkMode ? 'bg-dark text-light border-secondary' : ''}`} value={tempCountry} onChange={(e) => setTempCountry(e.target.value)} size="6">
                <option value="" disabled>Select your country</option>
                {countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())).map(c => (
                  <option key={c.isoCode} value={c.name} className="py-2 border-bottom" style={{cursor: "pointer"}}>{c.flag} {c.name}</option>
                ))}
              </select>
              <small className="text-muted d-block mt-2 px-2">Changing your country will automatically update your currency in the Cart and Chatbot.</small>
            </div>
            <div className="modal-footer border-0">
              <button type="button" className="btn btn-secondary rounded-pill" data-bs-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-primary rounded-pill" data-bs-dismiss="modal" onClick={handleSaveCountry}>Save</button>
            </div>
          </div>
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            backgroundColor: '#7B61FF',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            zIndex: 9999,
            transition: 'opacity 0.3s'
          }}
          title="العودة للأعلى"
        >
          <FaArrowUp />
        </button>
      )}

    </div>
  );
}