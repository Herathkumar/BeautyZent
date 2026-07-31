export type UserRole = "owner" | "cashier" | "staff";

export type OrderChannel = "pos" | "online";

export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "reserved"
  | "fulfilled"
  | "cancelled"
  | "completed";

export type TenderType = "cash" | "card_external" | "stripe";

export type StockMovementType =
  | "sale"
  | "receive"
  | "adjust"
  | "reserve"
  | "release"
  | "fulfill";

export type SyncEntityType = "product" | "inventory" | "order" | "stock_movement";

export type ConflictStatus = "open" | "resolved";
