'use client';
import { useState, type FormEvent } from 'react';
import type { PaymentInput, PaymentRequest } from '../../types/payment';
import { duplicateInvoice, today, vendors } from '../../lib/payments';
export default function PaymentForm({ payment, payments, onSubmit, onCancel, busy, maxResubmissions }: { payment?: PaymentRequest; payments: PaymentRequest[]; onSubmit: (input: PaymentInput) => Promise<void>; onCancel: () => void; busy: boolean; maxResubmissions: number }) {
  const [vendor, setVendor] = useState(payment?.vendor ?? '');
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '');
  const [purpose, setPurpose] = useState(payment?.purpose ?? '');
  const [invoice, setInvoice] = useState(payment?.invoice_no ?? '');
  const [date, setDate] = useState(payment?.request_date ?? today());
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    try { await onSubmit({ vendor, amount: Number(amount), purpose, invoice_no: invoice, request_date: date }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save payment.'); }
  }
  return <form onSubmit={submit} className="payment-form" noValidate>
    <p className="muted">{payment ? `You have ${Math.max(0, maxResubmissions - payment.resubmit_count)} resubmission(s) remaining. The request returns to Manager review.` : 'Submit a payment for Manager review. All fields are required.'}</p>
    <label>Vendor<select value={vendor} onChange={e => setVendor(e.target.value)} required><option value="">Select a vendor</option>{vendors.map(v => <option key={v}>{v}</option>)}</select></label>
    <div className="form-row"><label>Amount (₹)<input type="number" min="0.01" step="any" value={amount} onChange={e => setAmount(e.target.value)} required /></label><label>Request date<input type="date" max={today()} value={date} onChange={e => setDate(e.target.value)} required /></label></div>
    <label>Purpose<textarea rows={3} value={purpose} onChange={e => setPurpose(e.target.value)} required /></label>
    <label>Invoice number<input value={invoice} onChange={e => setInvoice(e.target.value)} required /></label>
    {duplicateInvoice(payments, invoice, payment?.req_id) && <p className="notice warning" role="status">This invoice number already exists on another request. You can still submit.</p>}
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="modal-actions"><button type="button" disabled={busy} onClick={onCancel}>Cancel</button><button className="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : payment ? 'Resubmit request' : 'Submit request'}</button></div>
  </form>;
}
