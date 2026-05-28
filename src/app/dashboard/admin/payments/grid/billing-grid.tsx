"use client";

/**
 * Billing Grid — client-side rendering.
 *
 * Receives a fully-computed row array from the server page and renders:
 *   - search + status filter + CSV export toolbar
 *   - sticky-header / sticky-first-column table
 *   - color-coded cells (paid green / pending amber / rejected red /
 *     owed slate / N/A muted)
 *   - click any payable cell → CellDialog opens with receipt link +
 *     approve / reject buttons (admin & treasurer auth via the existing
 *     RLS policies on enrollments and monthly_payments)
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { formatMonthlyAmount } from "@/lib/monthly-payments";
import type { MonthlyPaymentStatus } from "@/lib/types/database";
import { toast } from "sonner";

export type CycleColumn = { key: string; label: string };

export type Cell =
  | { kind: "pre-enrollment" }
  | { kind: "na" }
  | {
      kind: "initial";
      status: "approved" | "pending" | "rejected";
      amount: number;
      currency: "PKR" | "INR" | "USD";
      receiptPath: string | null;
      enrollmentId: string;
    }
  | {
      kind: "monthly";
      status: MonthlyPaymentStatus;
      amount: number;
      currency: string;
      receiptPath: string | null;
      paymentId: string;
      senderName: string | null;
    }
  | {
      kind: "owed";
      expectedAmount: number;
      currency: string;
      enrollmentId: string;
      cycle: string;
    };

export type GridRow = {
  enrollmentId: string;
  studentId: string | null;
  studentName: string;
  studentPhone: string | null;
  studentEmail: string;
  offeringId: string;
  offeringTitle: string;
  offeringFeeType: "one_time" | "monthly";
  enrolledAt: string;
  enrollmentStatus: "approved" | "pending" | "rejected";
  enrollmentCycle: string;
  enrollmentCycleIndex: number;
  currency: "PKR" | "INR" | "USD";
  cells: Record<string, Cell>;
  totalPaid: number;
  totalOwed: number;
  lastPaidAt: string | null;
};

type StatusFilter =
  | "all"
  | "has_owed"
  | "has_pending"
  | "has_rejected"
  | "fully_paid";

interface Props {
  rows: GridRow[];
  cycleColumns: CycleColumn[];
}

export function BillingGrid({ rows, cycleColumns }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [openCell, setOpenCell] = useState<{
    row: GridRow;
    cellKey: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (s) {
        const hay =
          `${r.studentName} ${r.offeringTitle} ${r.studentEmail} ${r.studentPhone || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (statusFilter !== "all") {
        const arr = Object.values(r.cells);
        const hasOwed = arr.some((c) => c.kind === "owed");
        const hasPending = arr.some(
          (c) =>
            (c.kind === "initial" || c.kind === "monthly") &&
            c.status === "pending"
        );
        const hasRejected = arr.some(
          (c) =>
            (c.kind === "initial" || c.kind === "monthly") &&
            c.status === "rejected"
        );
        const fullyPaid =
          !hasOwed && !hasPending && !hasRejected && r.totalPaid > 0;
        if (statusFilter === "has_owed" && !hasOwed) return false;
        if (statusFilter === "has_pending" && !hasPending) return false;
        if (statusFilter === "has_rejected" && !hasRejected) return false;
        if (statusFilter === "fully_paid" && !fullyPaid) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter]);

  function exportCsv() {
    const headers = [
      "Sister",
      "Phone",
      "Email",
      "Offering",
      "Fee Type",
      "Enrolled",
      ...cycleColumns.map((c) => c.label),
      "Total Paid",
      "Total Owed",
      "Last Paid",
    ];
    const cellLabel = (c: Cell | undefined): string => {
      if (!c || c.kind === "pre-enrollment" || c.kind === "na") return "";
      if (c.kind === "initial")
        return `Initial · ${c.status} · ${formatMonthlyAmount(c.amount, c.currency)}`;
      if (c.kind === "monthly")
        return `${c.status} · ${formatMonthlyAmount(c.amount, c.currency)}`;
      return `OWED · ${formatMonthlyAmount(c.expectedAmount, c.currency)}`;
    };
    const data = filtered.map((r) => [
      r.studentName,
      r.studentPhone || "",
      r.studentEmail,
      r.offeringTitle,
      r.offeringFeeType,
      new Date(r.enrolledAt).toLocaleDateString("en-PK"),
      ...cycleColumns.map((col) => cellLabel(r.cells[col.key])),
      r.totalPaid > 0 ? formatMonthlyAmount(r.totalPaid, r.currency) : "",
      r.totalOwed > 0 ? formatMonthlyAmount(r.totalOwed, r.currency) : "",
      r.lastPaidAt ? new Date(r.lastPaidAt).toLocaleDateString("en-PK") : "",
    ]);
    const csv = [headers, ...data]
      .map((row) =>
        row
          .map((v) => {
            const s = String(v ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nisa-alhuda-billing-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sister, email, phone, course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All sisters</option>
          <option value="has_owed">Has unpaid (owed)</option>
          <option value="has_pending">Has pending review</option>
          <option value="has_rejected">Has rejected</option>
          <option value="fully_paid">Fully paid</option>
        </select>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Status legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <LegendDot className="bg-green-500" label="Paid" />
        <LegendDot className="bg-amber-500" label="Pending" />
        <LegendDot className="bg-red-500" label="Rejected" />
        <LegendDot className="bg-slate-400" label="Owed" />
        <LegendDot className="bg-muted-foreground/30" label="N/A" />
        <span className="ml-auto text-[11px]">
          Showing {filtered.length} of {rows.length} enrollment
          {rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Scrollable + sticky table */}
      <div className="rounded-lg border bg-background">
        <div className="overflow-auto max-h-[72vh]">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 min-w-[220px] border-b border-r bg-muted/95 px-3 py-2 text-left font-semibold backdrop-blur">
                  Sister · Course
                </th>
                {cycleColumns.map((col) => (
                  <th
                    key={col.key}
                    className="min-w-[110px] border-b border-r bg-muted/95 px-2 py-2 text-center font-semibold backdrop-blur"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="min-w-[110px] border-b border-r bg-muted/95 px-3 py-2 text-right font-semibold backdrop-blur">
                  Paid
                </th>
                <th className="min-w-[110px] border-b border-r bg-muted/95 px-3 py-2 text-right font-semibold backdrop-blur">
                  Owed
                </th>
                <th className="min-w-[110px] border-b bg-muted/95 px-3 py-2 text-right font-semibold backdrop-blur">
                  Last Paid
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={cycleColumns.length + 4}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No matching enrollments.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.enrollmentId} className="hover:bg-muted/30">
                  <td className="sticky left-0 z-10 border-b border-r bg-background px-3 py-2">
                    <div className="truncate font-medium">{r.studentName}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {r.offeringTitle}
                    </div>
                    {r.studentPhone && (
                      <div className="text-[10px] text-muted-foreground">
                        {r.studentPhone}
                      </div>
                    )}
                  </td>
                  {cycleColumns.map((col) => (
                    <td
                      key={col.key}
                      className="border-b border-r p-0 align-stretch"
                    >
                      <CellView
                        cell={r.cells[col.key]}
                        onClick={() => setOpenCell({ row: r, cellKey: col.key })}
                      />
                    </td>
                  ))}
                  <td className="border-b border-r px-3 py-2 text-right font-medium tabular-nums">
                    {r.totalPaid > 0
                      ? formatMonthlyAmount(r.totalPaid, r.currency)
                      : "—"}
                  </td>
                  <td className="border-b border-r px-3 py-2 text-right font-medium text-amber-700 tabular-nums dark:text-amber-400">
                    {r.totalOwed > 0
                      ? formatMonthlyAmount(r.totalOwed, r.currency)
                      : "—"}
                  </td>
                  <td className="border-b px-3 py-2 text-right text-muted-foreground tabular-nums">
                    {r.lastPaidAt
                      ? new Date(r.lastPaidAt).toLocaleDateString("en-PK", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CellDialog
        cell={openCell ? openCell.row.cells[openCell.cellKey] : null}
        row={openCell?.row}
        cycleLabel={
          openCell
            ? cycleColumns.find((c) => c.key === openCell.cellKey)?.label || ""
            : ""
        }
        onClose={() => setOpenCell(null)}
        onUpdated={() => {
          setOpenCell(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function CellView({
  cell,
  onClick,
}: {
  cell: Cell | undefined;
  onClick: () => void;
}) {
  if (!cell || cell.kind === "pre-enrollment" || cell.kind === "na") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/20 px-2 py-2 text-center text-[10px] text-muted-foreground">
        —
      </div>
    );
  }
  if (cell.kind === "initial") {
    const tone = toneFor(cell.status);
    return (
      <button
        onClick={onClick}
        className={`h-full w-full ${tone.bg} ${tone.text} px-2 py-2 text-center transition-opacity hover:opacity-80`}
      >
        <div className="text-[9px] font-semibold uppercase tracking-wide opacity-80">
          Initial
        </div>
        <div className="text-[11px] font-medium tabular-nums">
          {formatMonthlyAmount(cell.amount, cell.currency)}
        </div>
        <div className="text-[9px] uppercase tracking-wide">{cell.status}</div>
      </button>
    );
  }
  if (cell.kind === "monthly") {
    const tone = toneFor(cell.status);
    return (
      <button
        onClick={onClick}
        className={`h-full w-full ${tone.bg} ${tone.text} px-2 py-2 text-center transition-opacity hover:opacity-80`}
      >
        <div className="text-[11px] font-medium tabular-nums">
          {formatMonthlyAmount(cell.amount, cell.currency)}
        </div>
        <div className="text-[9px] uppercase tracking-wide">{cell.status}</div>
      </button>
    );
  }
  // Owed
  return (
    <button
      onClick={onClick}
      className="h-full w-full bg-slate-50 px-2 py-2 text-center text-slate-600 transition-opacity hover:opacity-80 dark:bg-slate-900/30 dark:text-slate-400"
    >
      <div className="text-[11px] font-medium tabular-nums">
        {formatMonthlyAmount(cell.expectedAmount, cell.currency)}
      </div>
      <div className="text-[9px] uppercase tracking-wide">Owed</div>
    </button>
  );
}

function toneFor(status: string): { bg: string; text: string } {
  if (status === "approved")
    return {
      bg: "bg-green-50 dark:bg-green-950/30",
      text: "text-green-700 dark:text-green-400",
    };
  if (status === "rejected")
    return {
      bg: "bg-red-50 dark:bg-red-950/30",
      text: "text-red-700 dark:text-red-400",
    };
  if (status === "owed")
    return {
      bg: "bg-slate-50 dark:bg-slate-900/30",
      text: "text-slate-600 dark:text-slate-400",
    };
  return {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
  };
}

// ── Cell action dialog ──

interface DialogProps {
  cell: Cell | null;
  row: GridRow | undefined;
  cycleLabel: string;
  onClose: () => void;
  onUpdated: () => void;
}

function CellDialog({ cell, row, cycleLabel, onClose, onUpdated }: DialogProps) {
  const [busy, setBusy] = useState<"approve" | "reject" | "receipt" | null>(
    null
  );
  const [rejectReason, setRejectReason] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const open = Boolean(cell && row && cell.kind !== "pre-enrollment" && cell.kind !== "na");

  async function loadReceipt(path: string) {
    setBusy("receipt");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .createSignedUrl(path, 300);
      if (error) throw error;
      setReceiptUrl(data?.signedUrl || null);
    } catch {
      toast.error("Failed to load receipt.");
    } finally {
      setBusy(null);
    }
  }

  async function approveMonthly(id: string) {
    setBusy("approve");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("monthly_payments")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Monthly payment approved.");
      onUpdated();
    } catch {
      toast.error("Failed to approve.");
    } finally {
      setBusy(null);
    }
  }

  async function rejectMonthly(id: string) {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setBusy("reject");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("monthly_payments")
        .update({
          status: "rejected",
          rejection_reason: rejectReason.trim(),
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Monthly payment rejected.");
      onUpdated();
    } catch {
      toast.error("Failed to reject.");
    } finally {
      setBusy(null);
    }
  }

  async function approveInitial(enrollmentId: string) {
    setBusy("approve");
    try {
      // Initial enrollment approval goes through the existing server-action
      // path so credentials get provisioned + the welcome email fires. We
      // import lazily to keep the client bundle slim.
      const { approveEnrollmentWithCredentials } = await import(
        "../actions"
      );
      const r = await approveEnrollmentWithCredentials(enrollmentId);
      if (!r.success) {
        toast.error(r.error || "Failed to approve.");
        return;
      }
      toast.success("Enrollment approved — credentials emailed.");
      onUpdated();
    } catch {
      toast.error("Failed to approve.");
    } finally {
      setBusy(null);
    }
  }

  async function rejectInitial(enrollmentId: string) {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setBusy("reject");
    try {
      const { rejectEnrollment } = await import("../actions");
      const r = await rejectEnrollment(enrollmentId, rejectReason.trim());
      if (!r.success) {
        toast.error(r.error || "Failed to reject.");
        return;
      }
      toast.success("Enrollment rejected.");
      onUpdated();
    } catch {
      toast.error("Failed to reject.");
    } finally {
      setBusy(null);
    }
  }

  function handleClose() {
    setReceiptUrl(null);
    setRejectReason("");
    onClose();
  }

  if (!open || !cell || !row) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {row.studentName} · {cycleLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-3 text-sm">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Course</p>
            <p className="font-medium">{row.offeringTitle}</p>
          </div>

          {cell.kind === "owed" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-300">
              <p className="text-xs uppercase tracking-wide">Owed</p>
              <p className="font-medium">
                {formatMonthlyAmount(cell.expectedAmount, cell.currency)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                No receipt uploaded yet for this cycle. Nothing to approve until
                the sister submits one.
              </p>
            </div>
          )}

          {(cell.kind === "initial" || cell.kind === "monthly") && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-medium tabular-nums">
                    {formatMonthlyAmount(cell.amount, cell.currency)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{cell.status}</p>
                </div>
              </div>

              {cell.kind === "monthly" && cell.senderName && (
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">
                    Sender name (on bank transfer)
                  </p>
                  <p className="font-medium">{cell.senderName}</p>
                </div>
              )}

              {cell.receiptPath ? (
                receiptUrl ? (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border bg-primary/5 px-3 py-2 text-center text-sm font-medium text-primary hover:bg-primary/10"
                  >
                    Open Receipt in new tab ↗
                  </a>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadReceipt(cell.receiptPath!)}
                    disabled={busy === "receipt"}
                    className="w-full"
                  >
                    {busy === "receipt" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Load Receipt
                  </Button>
                )
              ) : (
                <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  No receipt file on this row.
                </p>
              )}

              {cell.status === "pending" && (
                <div className="space-y-2 border-t pt-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (cell.kind === "initial")
                        approveInitial(cell.enrollmentId);
                      else approveMonthly(cell.paymentId);
                    }}
                    disabled={busy !== null}
                    className="w-full"
                  >
                    {busy === "approve" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Approve
                  </Button>
                  <div className="space-y-1.5">
                    <Input
                      placeholder="Reason for rejection (required)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (cell.kind === "initial")
                          rejectInitial(cell.enrollmentId);
                        else rejectMonthly(cell.paymentId);
                      }}
                      disabled={busy !== null || !rejectReason.trim()}
                      className="w-full"
                    >
                      {busy === "reject" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
