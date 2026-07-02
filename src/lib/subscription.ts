import { User } from "../types";

export function isUserPremium(user: User | null): boolean {
  if (!user || !user.subscription) return false;
  const isPremiumPlan = user.subscription.plan === "PREMIUM";
  const isActiveStatus = ["active", "trial", "canceled"].includes(user.subscription.status);
  const isNotExpired = new Date(user.subscription.expiresAt).getTime() > Date.now();
  return isPremiumPlan && isActiveStatus && isNotExpired;
}
