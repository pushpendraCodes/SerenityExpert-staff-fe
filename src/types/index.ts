export type UserRole = "user" | "expert" | "admin";
export type ExpertStatus = "online" | "offline" | "busy";
export type CallStatus = "ringing" | "active" | "completed" | "missed" | "rejected" | "failed";
export type ChatStatus = "active" | "closed";
export type MessageType = "text" | "image" | "system";
export type NotificationType = "call" | "chat" | "community" | "payment" | "system" | "promo";
export type PayoutStatus = "pending" | "processing" | "completed" | "failed";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: Pagination;
}

export interface User {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  walletBalance?: number;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface AvailabilitySlot {
  day: string;
  startTime: string;
  endTime: string;
}

export interface BankDetails {
  accountName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  upiId?: string;
}

export interface Expert {
  _id: string;
  userId: User | string;
  mobile?: string;
  bio: string;
  experience: number;
  categories: Category[] | string[];
  languages: string[];
  pricePerMinute: number;
  rating: number;
  totalRatings: number;
  totalCalls: number;
  totalMinutes?: number;
  totalEarnings?: number;
  commissionPercent?: number;
  status: ExpertStatus;
  availabilitySchedule?: AvailabilitySlot[];
  bankDetails?: BankDetails;
  isVerified?: boolean;
  isApproved?: boolean;
}

export interface Call {
  _id: string;
  userId: string | User;
  expertId: string | Expert;
  status: CallStatus;
  durationSeconds: number;
  totalCost: number;
  pricePerMinute: number;
  agoraChannelName?: string;
  agoraToken?: string;
  recordingUrl?: string;
  rating?: number;
  review?: string;
  endReason?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface Chat {
  _id: string;
  userId: string | User;
  expertId: string | Expert;
  status: ChatStatus;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt: string;
}

export interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  senderRole: UserRole;
  content: string;
  messageType: MessageType;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Payout {
  _id: string;
  expertId: string;
  amount: number;
  commission: number;
  netAmount: number;
  periodStart: string;
  periodEnd: string;
  status: PayoutStatus;
  processedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface DashboardData {
  expert: Expert;
  earnings: {
    totalEarnings: number;
    totalCalls: number;
    totalMinutes: number;
    commissionPercent: number;
    weeklyEarnings: {
      grossAmount: number;
      commission: number;
      netAmount: number;
      callCount: number;
    };
    recentPayouts: Payout[];
    recentCalls: Call[];
  };
}
