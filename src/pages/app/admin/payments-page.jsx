import { useDeferredValue, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionDialog, QueryState } from "@/features/admin/admin-components";
import { Pagination } from "@/features/dashboard/pagination";
import { DownloadButton } from "@/features/reports/download-button";
import { adminApi, useAdminMutation, useAdminQuery } from "@/lib/api/admin";
import { formatDateTime, formatMoney } from "@/lib/format";

const ALL = "all";
const ORDER_BADGES = {
  paid: ["Paid", "success"],
  created: ["Not completed", "neutral"],
  failed: ["Failed", "destructive"],
  review: ["Needs review", "destructive"],
};
const PAYMENT_LABELS = {
  captured: "Captured",
  authorized: "Authorized",
  failed: "Failed",
  partially_refunded: "Partly refunded",
  refunded: "Refunded",
};

function RefundDialog({ payment, onClose }) {
  const [amount, setAmount] = useState("");
  const refund = useAdminMutation((reason) =>
    adminApi.post(`/admin/payments/payments/${payment.gateway_payment_id}/refund/`, {
      amount_minor: amount ? Math.round(Number.parseFloat(amount) * 100) : undefined,
      reason,
    }),
  );
  const full = !amount || Math.round(Number.parseFloat(amount) * 100) >= payment.refundable_minor;

  return (
    <ActionDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Refund ${payment.gateway_payment_id}?`}
      description={
        full
          ? `Refunds ${formatMoney(payment.refundable_minor, payment.currency)} through the gateway and revokes the subscription this payment bought.`
          : "A partial refund through the gateway. The subscription stays active."
      }
      confirmLabel="Refund"
      destructive
      reasonRequired
      onConfirm={(reason) => refund.mutateAsync(reason)}
    >
      <div className="grid gap-2">
        <Label htmlFor="refund-amount">Amount ({payment.currency})</Label>
        <Input
          id="refund-amount"
          type="number"
          min="0.01"
          step="0.01"
          placeholder={`Full remaining: ${(payment.refundable_minor / 100).toFixed(2)}`}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
    </ActionDialog>
  );
}

function OrderRow({ order, onRefund }) {
  const [label, variant] = ORDER_BADGES[order.status] ?? [order.status, "neutral"];
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">{formatDateTime(order.paid_at ?? order.created_at)}</TableCell>
      <TableCell className="max-w-48 truncate">
        <Link to={`/app/admin/users/${order.user_id}`} className="hover:text-primary">{order.user_email}</Link>
        <span className="block truncate text-xs text-muted-foreground">
          {order.plan_name} v{order.plan_version}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap">{formatMoney(order.amount_minor, order.currency)}</TableCell>
      <TableCell>
        <Badge variant={variant}>{label}</Badge>
        {order.payments.map((payment) => (
          <span key={payment.gateway_payment_id} className="mt-1 block text-xs text-muted-foreground">
            {payment.gateway_payment_id}: {PAYMENT_LABELS[payment.status] ?? payment.status}
            {payment.amount_refunded_minor ? `, ${formatMoney(payment.amount_refunded_minor, payment.currency)} refunded` : ""}
            {payment.is_duplicate ? ", duplicate" : ""}
            {payment.dispute_status ? `, dispute ${payment.dispute_status}` : ""}
          </span>
        ))}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-2">
          {order.invoice ? (
            <DownloadButton
              url={`/admin/payments/invoices/${order.invoice.id}/pdf/`}
              filename={`${order.invoice.number}.pdf`}
              aria-label={`Download invoice ${order.invoice.number}`}
            >
              {order.invoice.number}
            </DownloadButton>
          ) : null}
          {order.payments
            .filter((payment) => payment.refundable_minor > 0)
            .map((payment) => (
              <Button key={payment.gateway_payment_id} variant="outline" size="sm" onClick={() => onRefund(payment)}>
                Refund
              </Button>
            ))}
        </div>
      </TableCell>
    </TableRow>
  );
}

function OrdersTab() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get("status") || ALL);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refunding, setRefunding] = useState(null);
  const deferred = useDeferredValue(search.trim());
  const query = useAdminQuery("/admin/payments/orders/", {
    status: status === ALL || status === "refunded" ? null : status,
    refunded: status === "refunded" ? "true" : null,
    search: deferred,
    page,
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="grid gap-2">
          <Label htmlFor="order-search">User email or gateway order ID</Label>
          <Input id="order-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="order-status">Status</Label>
          <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
            <SelectTrigger id="order-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="review">Needs review</SelectItem>
              <SelectItem value="created">Not completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">With refunds</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <QueryState query={query} isEmpty={(data) => data.count === 0} empty={<EmptyState title="No orders match" />}>
        {(data) => (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <caption className="sr-only">Orders</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User and plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Invoice and refunds</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((order) => (
                    <OrderRow key={order.id} order={order} onRefund={setRefunding} />
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination page={page} count={data.count} pageSize={20} onPageChange={setPage} isFetching={query.isFetching} label="Order pages" />
          </>
        )}
      </QueryState>
      {refunding ? <RefundDialog payment={refunding} onClose={() => setRefunding(null)} /> : null}
    </div>
  );
}

function WebhooksTab() {
  const [page, setPage] = useState(1);
  const query = useAdminQuery("/admin/payments/webhooks/", { page });
  return (
    <QueryState query={query} isEmpty={(data) => data.count === 0} empty={<EmptyState title="No webhook deliveries yet" />}>
      {(data) => (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Delivery status only. Payloads contain customer details and aren&apos;t shown.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <caption className="sr-only">Webhook deliveries</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Attempts</TableHead>
                  <TableHead className="hidden sm:table-cell">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((event) => (
                  <TableRow key={event.event_id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(event.received_at)}</TableCell>
                    <TableCell className="max-w-48 truncate font-mono text-xs">{event.event_type}</TableCell>
                    <TableCell>
                      <Badge variant={event.status === "failed" ? "destructive" : event.status === "processed" ? "success" : "neutral"}>
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{event.attempts}</TableCell>
                    <TableCell className="hidden sm:table-cell">{event.error || "None"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} count={data.count} pageSize={20} onPageChange={setPage} isFetching={query.isFetching} label="Webhook pages" />
        </div>
      )}
    </QueryState>
  );
}

function AdminPaymentsPage() {
  return (
    <Tabs defaultValue="orders">
      <TabsList>
        <TabsTrigger value="orders">Orders and refunds</TabsTrigger>
        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
      </TabsList>
      <TabsContent value="orders" className="mt-4">
        <OrdersTab />
      </TabsContent>
      <TabsContent value="webhooks" className="mt-4">
        <WebhooksTab />
      </TabsContent>
    </Tabs>
  );
}

export default AdminPaymentsPage;
