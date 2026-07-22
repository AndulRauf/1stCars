import React from "react";
import { supabase } from "./supabaseClient";

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id?: string;
  title: string;
  message: string;
  type: "info" | "alert" | "success" | "action";
  is_read: boolean;
  metadata?: any;
  created_at: string;
}

// Global listeners for real-time notification updates within the SPA
type NotificationListener = (notif: Notification) => void;
const listeners: Set<NotificationListener> = new Set();

export const subscribeToNotifications = (listener: NotificationListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = (notif: Notification) => {
  listeners.forEach((listener) => {
    try {
      listener(notif);
    } catch (e) {
      console.error("Error in notification listener:", e);
    }
  });
};

// Local storage helper for resilient offline / fallback notification management
const NOTIF_STORAGE_KEY = "1stcars_sb_notifications";

function getLocalNotifications(userId: string): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    const list: Notification[] = raw ? JSON.parse(raw) : [
      {
        id: "notif-1",
        recipient_id: "u-buyer",
        title: "Welcome to 1stCars!",
        message: "Verify your email and complete your buyer profile to schedule a test drive on premium models.",
        type: "info",
        is_read: false,
        created_at: new Date().toISOString()
      },
      {
        id: "notif-2",
        recipient_id: "u-seller",
        title: "Inspection Submitted",
        message: "Your inspection request for Honda City is currently assigned to certified inspector Vikram Rathore.",
        type: "action",
        is_read: false,
        created_at: new Date().toISOString()
      }
    ];
    return list.filter((n) => !userId || n.recipient_id === userId);
  } catch {
    return [];
  }
}

function saveLocalNotification(notif: Notification) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    const list: Notification[] = raw ? JSON.parse(raw) : [];
    const updated = [notif, ...list.filter((n) => n.id !== notif.id)];
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

function updateLocalReadStatus(userId: string, notifId?: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!raw) return;
    const list: Notification[] = JSON.parse(raw);
    const updated = list.map((n) => {
      if (notifId && n.id === notifId) {
        return { ...n, is_read: true };
      }
      if (!notifId && userId && n.recipient_id === userId) {
        return { ...n, is_read: true };
      }
      return n;
    });
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

// ==========================================
// CENTRAL NOTIFICATION SERVICE
// ==========================================
export const notificationService = {
  /**
   * General purpose notification dispatcher
   */
  async createNotification(payload: {
    recipientId: string;
    senderId?: string;
    title: string;
    message: string;
    type: "info" | "alert" | "success" | "action";
    metadata?: any;
  }): Promise<{ data: Notification | null; error: any }> {
    const fallbackNotif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      recipient_id: payload.recipientId,
      sender_id: payload.senderId,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      is_read: false,
      metadata: payload.metadata || {},
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from("notifications").insert([
        {
          recipient_id: payload.recipientId,
          sender_id: payload.senderId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          is_read: false,
          metadata: payload.metadata || {}
        }
      ]);

      if (!error && data) {
        const inserted = Array.isArray(data) ? data[0] : data;
        saveLocalNotification(inserted);
        notifyListeners(inserted);
        return { data: inserted, error: null };
      }
    } catch {
      // Fallback below
    }

    saveLocalNotification(fallbackNotif);
    notifyListeners(fallbackNotif);
    return { data: fallbackNotif, error: null };
  },

  /**
   * Fetch active notifications for a specific user
   */
  async getNotifications(userId: string): Promise<Notification[]> {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Using local notification state fallback:", error.message || error);
        return getLocalNotifications(userId);
      }
      if (data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn("Notification query exception, falling back to local storage:", err);
    }
    return getLocalNotifications(userId);
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    updateLocalReadStatus("", notificationId);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) {
        console.warn("Could not sync markAsRead remotely:", error.message || error);
      }
    } catch {
      // Local fallback completed
    }
    return true;
  },

  /**
   * Mark all notifications as read for a specific user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    if (!userId) return false;
    updateLocalReadStatus(userId);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", userId);

      if (error) {
        console.warn("Could not sync markAllAsRead remotely:", error.message || error);
      }
    } catch {
      // Local fallback completed
    }
    return true;
  },

  // ==========================================
  // SPECIFIC LOGICAL WORKFLOW TRIGGERS
  // ==========================================

  /**
   * Rule 1: Seller submits inspection → Notify Inspector.
   * Recipients: All Inspectors (or a general pool).
   */
  async triggerInspectionSubmitted(inspection: {
    id: string;
    sellerName: string;
    brand: string;
    model: string;
    city: string;
    preferred_date: string;
  }) {
    // Locate inspector profiles in the same city
    const { data: inspectors } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "Inspector");

    const inspectorList = inspectors || [{ id: "u-inspector" }];

    // Dispatch notification to inspectors
    for (const inspector of inspectorList) {
      await this.createNotification({
        recipientId: inspector.id,
        title: "New Vehicle Inspection Request",
        message: `${inspection.sellerName} has requested an inspection for a ${inspection.brand} ${inspection.model} in ${inspection.city} on ${inspection.preferred_date}.`,
        type: "action",
        metadata: { inspection_id: inspection.id, city: inspection.city }
      });
    }
  },

  /**
   * Rule 2: Inspector submits report → Notify Admin.
   * Recipients: All Admins.
   */
  async triggerReportSubmitted(report: {
    inspectionId: string;
    inspectorName: string;
    brand: string;
    model: string;
    score: number;
  }) {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "Admin");

    const adminList = admins || [{ id: "u-admin" }];

    for (const admin of adminList) {
      await this.createNotification({
        recipientId: admin.id,
        title: "Vehicle Report Submitted",
        message: `Inspector ${report.inspectorName} has uploaded a detailed report for ${report.brand} ${report.model} with an overall health score of ${report.score}/10. Ready for final valuation approval.`,
        type: "alert",
        metadata: { inspection_id: report.inspectionId, score: report.score }
      });
    }
  },

  /**
   * Rule 3: Admin approves → Notify Seller.
   * Recipients: The original seller who requested the evaluation.
   */
  async triggerInspectionApproved(approved: {
    sellerId: string;
    inspectionId: string;
    brand: string;
    model: string;
    certifiedPrice: number;
  }) {
    await this.createNotification({
      recipientId: approved.sellerId,
      title: "Vehicle Valuation Approved! 🌟",
      message: `Great news! 1stCars has approved your ${approved.brand} ${approved.model} after evaluation. Our official certified offer price is ₹${approved.certifiedPrice.toLocaleString("en-IN")}. Accept in your dashboard to sell instantly.`,
      type: "success",
      metadata: { inspection_id: approved.inspectionId, offer_amount: approved.certifiedPrice }
    });
  },

  /**
   * Rule 4: Buyer books test drive → Notify Sales Associate.
   * Recipients: All Sales Associates.
   */
  async triggerTestDriveBooked(booking: {
    buyerName: string;
    carTitle: string;
    preferredDate: string;
    preferredTime: string;
  }) {
    const { data: associates } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "Sales Associate");

    const staffList = associates || [{ id: "u-sales" }];

    for (const staff of staffList) {
      await this.createNotification({
        recipientId: staff.id,
        title: "Test Drive Request Scheduled",
        message: `${booking.buyerName} requested a doorstep test drive for the ${booking.carTitle} on ${booking.preferredDate} at ${booking.preferredTime}.`,
        type: "action",
        metadata: { car_title: booking.carTitle, date: booking.preferredDate }
      });
    }
  },

  /**
   * Rule 5: Buyer reserves car → Notify Sales Associate.
   * Recipients: All Sales Associates.
   */
  async triggerCarReserved(reservation: {
    buyerName: string;
    carTitle: string;
    price: number;
  }) {
    const { data: associates } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "Sales Associate");

    const staffList = associates || [{ id: "u-sales" }];

    for (const staff of staffList) {
      await this.createNotification({
        recipientId: staff.id,
        title: "Premium Vehicle Reserved! 🔥",
        message: `${reservation.buyerName} has reserved the ${reservation.carTitle} (₹${reservation.price.toLocaleString("en-IN")}). Please initiate contact to draft elite financing documentation.`,
        type: "success",
        metadata: { car_title: reservation.carTitle, amount: reservation.price }
      });
    }
  },

  /**
   * Rule 6: Dealer places bid → Notify Seller and Admin.
   * Recipients: Original seller and all administrators.
   */
  async triggerBidPlaced(bid: {
    dealerName: string;
    inspectionId: string;
    sellerId: string;
    carTitle: string;
    bidAmount: number;
  }) {
    // A. Notify the Seller
    await this.createNotification({
      recipientId: bid.sellerId,
      title: "New Bid Received! 💰",
      message: `Dealer ${bid.dealerName} has placed a bid of ₹${bid.bidAmount.toLocaleString("en-IN")} on your listed ${bid.carTitle}. Access your seller dashboard to accept or negotiate!`,
      type: "success",
      metadata: { inspection_id: bid.inspectionId, bid_amount: bid.bidAmount }
    });

    // B. Notify the Admin
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "Admin");

    const adminList = admins || [{ id: "u-admin" }];

    for (const admin of adminList) {
      await this.createNotification({
        recipientId: admin.id,
        title: "Auction Activity Update",
        message: `Dealer ${bid.dealerName} placed a bid of ₹${bid.bidAmount.toLocaleString("en-IN")} on ${bid.carTitle}.`,
        type: "info",
        metadata: { inspection_id: bid.inspectionId, bid_amount: bid.bidAmount }
      });
    }
  }
};

// ==========================================
// REUSABLE REACT HOOK
// ==========================================
export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const fetchNotifs = React.useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    const list = await notificationService.getNotifications(userId);
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.is_read).length);
    setLoading(false);
  }, [userId]);

  React.useEffect(() => {
    fetchNotifs();

    // Subscribe to in-app real-time dispatches
    const unsubscribe = subscribeToNotifications((notif) => {
      if (notif.recipient_id === userId) {
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((count) => count + 1);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId, fetchNotifs]);

  const markRead = async (id: string) => {
    const success = await notificationService.markAsRead(id);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    }
  };

  const markAllRead = async () => {
    if (!userId) return;
    const success = await notificationService.markAllAsRead(userId);
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    refresh: fetchNotifs,
    markRead,
    markAllRead
  };
}
