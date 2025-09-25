import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "REGISTERED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_CHANGED"
  | "SITE_CONFIG_UPDATED"
  | "SIDEBAR_ITEM_CREATED"
  | "SIDEBAR_ITEM_UPDATED"
  | "SIDEBAR_ITEM_DELETED"
  | "SIDEBAR_ROLE_ACCESS_CHANGED"
  | "SIDEBAR_GROUP_CREATED"
  | "SIDEBAR_GROUP_UPDATED"
  | "SIDEBAR_GROUP_DELETED"
  | "API_CALLED";

export async function logAudit(params: {
  action: AuditAction | string;
  userId?: string | null;
  resource?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.JsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        userId: params.userId ?? undefined,
        resource: params.resource ?? undefined,
        ip: params.ip ?? undefined,
        userAgent: params.userAgent ?? undefined,
        metadata: params.metadata as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // Avoid throwing to not break the main flow
    console.error("Failed to write audit log", err);
  }
}

export function getRequestIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.headers.get("x-real-ip") ?? null;
}

export function getRequestUA(req: NextRequest) {
  return req.headers.get("user-agent");
}
