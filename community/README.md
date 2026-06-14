# Community App

The Community app provides a social layer to the e-commerce platform, allowing users to engage with each other, share styles, and provide feedback on products through a social feed.

## 🌟 Features
- **Social Feed**: A global feed of posts from the community.
- **Post Management**: Users can create posts with text content and images.
- **Interactions**: Like and Comment on posts.
- **Nested Replies**: Support for threaded conversations in comments.
- **Shared Style**: Direct link between user engagement and the platform ecosystem.

## 🛠️ Key Components

### Models
- `Post`: The core entity for community sharing. Includes slugs for unique URLs.
- `Like`: Tracks user engagement on posts (enforces one like per user/post).
- `Comment`: Highly flexible model supporting parent-child relationships for nested replies.

### Views
- `PostViewSet`: Main endpoint for feed, creating/deleting posts, and liking/unliking.
- `CommentViewSet`: Specialized endpoint for managing discussions and replies.

## 📡 API Endpoints
- `GET /api/community/posts/`: Retrieve the social feed.
- `POST /api/community/posts/`: Create a new post.
- `POST /api/community/posts/<slug>/like/`: Toggle a like on a post.
- `GET /api/community/posts/<slug>/comments/`: Get all comments for a post.
- `POST /api/community/comments/`: Add a comment or reply to a post.

> [!TIP]
> Use the `parent` field when creating a comment to make it a reply to another comment.
