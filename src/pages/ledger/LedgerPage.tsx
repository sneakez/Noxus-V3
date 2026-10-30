import { useEffect, useState } from 'react';
import { Banknote, Plus, ArrowRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatDateTime, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS } from '@/lib/utils';
import type { JournalEntry, LedgerAccount, JournalLine } from '@/types';

interface LedgerPageProps {
  search: string;
}

export function LedgerPage({ search }: LedgerPageProps) {
  const toast = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [lines, setLines] = useState<JournalLine[]>([]);

  async function load() {
    setLoading(true);
    const [eRes, aRes] = await Promise.all([
      supabase.from('journal_entries').select('*').order('posted_at', { ascending: false }).limit(100),
      supabase.from('ledger_accounts').select('*').order('account_code'),
    ]);
    setEntries((eRes.data as JournalEntry[]) ?? []);
    setAccounts((aRes.data as LedgerAccount[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = entries.filter((e) =>
    !search || e.entry_number.toLowerCase().includes(search.toLowerCase()) ||
    (e.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function viewLines(entry: JournalEntry) {
    setSelectedEntry(entry);
    const { data } = await supabase
      .from('journal_lines')
      .select('*, account:ledger_accounts(*)')
      .eq('journal_entry_id', entry.id);
    setLines((data as JournalLine[]) ?? []);
  }

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit_amount), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit_amount), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">Sổ Kế Toán Kép (General Ledger)</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Ghi chép giao dịch bất biến tuân thủ nguyên tắc kế toán kép — Tổng Nợ (Debit) luôn bằng Tổng Có (Credit)
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Tạo bút toán thủ công
        </button>
      </div>

      {/* Account summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(['asset', 'liability', 'equity', 'revenue', 'expense'] as const).map((type) => (
          <div key={type} className="card p-4 hover:shadow-md transition-shadow">
            <span className={`badge ${ACCOUNT_TYPE_COLORS[type]} mb-2`}>{ACCOUNT_TYPE_LABELS[type]}</span>
            <p className="text-2xl font-bold text-ink-900">{accounts.filter((a) => a.account_type === type).length}</p>
            <p className="text-xs text-ink-400">tài khoản hệ thống</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon={Banknote} title="Chưa có bút toán" description="Các nghiệp vụ bán hàng, xuất kho, và hoàn tiền sẽ tự động ghi sổ tại đây." />
        </Card>
      ) : (
        <Card className="overflow-hidden hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold">Mã Bút Toán</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Nguồn Nghiệp Vụ</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Diễn Giải Hạch Toán</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Tham Chiếu</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Thời Gian Ghi Sổ</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => viewLines(e)}
                    className="hover:bg-ink-50/60 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-ink-900 group-hover:text-[var(--brand-600)] transition-colors">
                      {e.entry_number}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-medium text-ink-700 bg-ink-100 px-2 py-0.5 rounded">
                        {(e.event_source ?? 'order_sale').replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ink-700 font-medium">
                      {e.description ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-ink-500 font-mono text-xs">
                      {e.reference_id ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-ink-500 text-xs">
                      {formatDateTime(e.posted_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(ev) => { ev.stopPropagation(); viewLines(e); }}
                        className="text-xs font-semibold text-[var(--brand-600)] hover:underline inline-flex items-center gap-1"
                      >
                        <Layers size={13} /> Xem dòng Nợ/Có
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* View lines modal */}
      {selectedEntry && (
        <Modal
          open={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          title={`Chi Tiết Dòng Hạch Toán — ${selectedEntry.entry_number}`}
          size="lg"
          footer={
            <>
              <div className="flex-1" />
              <button onClick={() => setSelectedEntry(null)} className="btn-secondary">
                Đóng
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3 bg-ink-50 rounded-lg text-xs text-ink-600">
              <span className="font-semibold text-ink-800">Diễn giải: </span>{selectedEntry.description}
            </div>

            <div className="border border-ink-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-ink-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="text-left px-4 py-2.5">Tài Khoản Kế Toán</th>
                    <th className="text-right px-4 py-2.5">Nợ (Debit)</th>
                    <th className="text-right px-4 py-2.5">Có (Credit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-3 text-ink-800">
                        <span className="font-bold text-[var(--brand-600)]">{l.account?.account_code}</span> — {l.account?.account_name}
                        {l.description && <p className="text-xs text-ink-400 mt-0.5">{l.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-ink-900">
                        {Number(l.debit_amount) > 0 ? formatCurrency(Number(l.debit_amount)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-ink-900">
                        {Number(l.credit_amount) > 0 ? formatCurrency(Number(l.credit_amount)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-ink-200 bg-ink-50/50">
                  <tr className="font-bold text-ink-900">
                    <td className="px-4 py-3">Tổng cộng phát sinh</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{formatCurrency(totalDebit)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{formatCurrency(totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className={`badge ${isBalanced ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                {isBalanced ? (
                  <span className="flex items-center gap-1 font-semibold">
                    <CheckCircle2 size={14} /> Cân đối hoàn hảo: Tổng Nợ == Tổng Có
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-semibold">
                    <AlertTriangle size={14} /> Lệch sổ: Chênh lệch {formatCurrency(Math.abs(totalDebit - totalCredit))}
                  </span>
                )}
              </div>
              <span className="text-xs text-ink-400">
                Chứng từ tham chiếu: {selectedEntry.reference_id ?? 'N/A'}
              </span>
            </div>
          </div>
        </Modal>
      )}

      {showModal && (
        <NewEntryModal
          open={showModal}
          onClose={() => setShowModal(false)}
          accounts={accounts}
          onSaved={() => { load(); setShowModal(false); }}
        />
      )}
    </div>
  );
}

function NewEntryModal({ open, onClose, accounts, onSaved }: {
  open: boolean; onClose: () => void; accounts: LedgerAccount[]; onSaved: () => void;
}) {
  const toast = useToast();
  const [description, setDescription] = useState('');
  const [debitAccountId, setDebitAccountId] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!debitAccountId || !creditAccountId) { toast('Vui lòng chọn tài khoản Nợ và Có', 'error'); return; }
    if (debitAccountId === creditAccountId) { toast('Tài khoản Nợ và Có không được trùng nhau', 'error'); return; }
    if (amount <= 0) { toast('Số tiền phải lớn hơn 0', 'error'); return; }

    setSaving(true);
    const { data: en } = await supabase.rpc('next_journal_entry_number');
    const entryId = `je_${Date.now()}`;
    const now = new Date().toISOString();

    const { error: eErr } = await supabase.from('journal_entries').insert({
      id: entryId,
      entry_number: en ?? `JE-${Date.now().toString().slice(-6)}`,
      description,
      status: 'posted',
      posted_at: now,
    });

    if (eErr) { toast('Lỗi tạo bút toán: ' + eErr.message, 'error'); setSaving(false); return; }

    await supabase.from('journal_lines').insert([
      { journal_entry_id: entryId, account_id: debitAccountId, debit_amount: amount, credit_amount: 0 },
      { journal_entry_id: entryId, account_id: creditAccountId, debit_amount: 0, credit_amount: amount },
    ]);

    setSaving(false);
    toast('✓ Đã ghi sổ bút toán kép thành công', 'success');
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Tạo Bút Toán Kế Toán Thủ Công" size="md"
      footer={<><button onClick={onClose} className="btn-secondary">Hủy bỏ</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner size={16} /> : null} Ghi sổ bút toán</button></>}>
      <div className="space-y-4">
        <div>
          <label className="label">Diễn giải nghiệp vụ *</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" placeholder="Ví dụ: Rút tiền ngân hàng nhập quỹ tiền mặt..." />
        </div>
        <div>
          <label className="label">Tài khoản ghi Nợ (Debit) *</label>
          <select value={debitAccountId} onChange={(e) => setDebitAccountId(e.target.value)} className="input">
            <option value="">Chọn tài khoản ghi Nợ...</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tài khoản ghi Có (Credit) *</label>
          <select value={creditAccountId} onChange={(e) => setCreditAccountId(e.target.value)} className="input">
            <option value="">Chọn tài khoản ghi Có...</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} — {a.account_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Số tiền phát sinh (VND) *</label>
          <input type="number" step="1000" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} className="input font-semibold" />
        </div>
      </div>
    </Modal>
  );
}
