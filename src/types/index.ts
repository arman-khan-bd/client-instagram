export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  isVerified: boolean;
  isPrivate?: boolean;
  _count?: { posts: number; followers: number; following: number };
  isFollowing?: boolean;
}

export interface Post {
  id: string;
  caption?: string;
  mediaUrls: { url: string; type: string }[];
  thumbnailUrl?: string;
  mobileUrl?: string;
  masterUrl?: string;
  location?: string;
  userId: string;
  user: Pick<User, 'id' | 'username' | 'avatarUrl' | 'isVerified'>;
  _count: { likes: number; comments: number };
  isLiked?: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  text: string;
  userId: string;
  user: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  createdAt: string;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  sender: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
}

export interface Story {
  id: string;
  mediaUrl: string;
  mediaType: string;
  userId: string;
  user: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  expiresAt: string;
  createdAt: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  apply: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}
