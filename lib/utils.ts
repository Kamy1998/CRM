import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatRelative, isValid, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  return isValid(d) ? format(d, 'MMM d, yyyy') : '—';
}

export function formatTimestamp(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  return isValid(d) ? format(d, "MMM d, yyyy 'at' h:mm a") : '—';
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = parseISO(dateStr);
  return isValid(d) ? formatRelative(d, new Date()) : '—';
}

export function isStale(lastUpdatedAt: string | null | undefined): boolean {
  if (!lastUpdatedAt) return false;
  const d = parseISO(lastUpdatedAt);
  if (!isValid(d)) return false;
  const diffMs = new Date().getTime() - d.getTime();
  return diffMs > 48 * 60 * 60 * 1000;
}

export function daysBetween(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  if (!isValid(d)) return null;
  const diffMs = d.getTime() - new Date().getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
