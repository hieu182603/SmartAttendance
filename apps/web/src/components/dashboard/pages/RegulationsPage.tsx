import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Bot,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  Sparkles,
  File,
  FilePlus2,
  ChevronRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "@/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Regulation {
  _id: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  docType: string;
  status: "processing" | "active" | "failed" | "deleted";
  chunksIngested: number;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  data: Regulation[];
  total: number;
  page: number;
  limit: number;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

const regulationApi = {
  list: async (): Promise<ListResponse> => {
    const { data } = await api.get("/companies/regulations");
    return data;
  },
  upload: async (formData: FormData): Promise<{ message: string; data: Regulation }> => {
    const { data } = await api.post("/companies/regulations", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/companies/regulations/${id}`);
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_CONFIG = {
  processing: {
    icon: Loader2,
    className: "status-processing",
    spin: true,
  },
  active: {
    icon: CheckCircle2,
    className: "status-active",
    spin: false,
  },
  failed: {
    icon: AlertCircle,
    className: "status-failed",
    spin: false,
  },
  deleted: {
    icon: Trash2,
    className: "status-deleted",
    spin: false,
  },
};

const DOC_TYPES = [
  "company_regulation",
  "hr_policy",
  "work_procedure",
  "code_of_conduct",
  "other",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Regulation["status"] }) {
  const { t } = useTranslation(["dashboard"]);
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  const Icon = cfg.icon;
  return (
    <span className={`reg-status-badge ${cfg.className}`}>
      <Icon size={12} className={cfg.spin ? "spin-animation" : ""} />
      {t(`dashboard:regulations.status.${status}`)}
    </span>
  );
}

function RegulationCard({
  reg,
  onDelete,
  deleting,
}: {
  reg: Regulation;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const { t } = useTranslation(["dashboard"]);
  return (
    <div className="reg-card" id={`reg-card-${reg._id}`}>
      <div className="reg-card-icon-wrap">
        <FileText size={22} />
      </div>
      <div className="reg-card-body">
        <div className="reg-card-header">
          <h3 className="reg-card-title">{reg.title}</h3>
          <StatusBadge status={reg.status} />
        </div>
        <p className="reg-card-meta">
          <span>{reg.fileName}</span>
          <span className="reg-dot">·</span>
          <span>{formatBytes(reg.fileSize)}</span>
          <span className="reg-dot">·</span>
          <span>{t(`dashboard:regulations.docType.${reg.docType}`, { defaultValue: reg.docType })}</span>
        </p>
        {reg.status === "active" && (
          <p className="reg-card-chunks">
            <Sparkles size={11} />
            {t("dashboard:regulations.list.chunks", { count: reg.chunksIngested })}
          </p>
        )}
        {reg.description && (
          <p className="reg-card-desc">{reg.description}</p>
        )}
        <p className="reg-card-date">
          {t("dashboard:regulations.list.uploadedAt", { date: formatDate(reg.createdAt) })}
        </p>
      </div>
      <button
        id={`btn-delete-reg-${reg._id}`}
        className="reg-card-delete-btn"
        onClick={() => onDelete(reg._id)}
        disabled={deleting}
        title={t("dashboard:regulations.deleteDialog.title")}
        aria-label={`${t("dashboard:regulations.deleteDialog.title")} ${reg.title}`}
      >
        {deleting ? (
          <Loader2 size={16} className="spin-animation" />
        ) : (
          <Trash2 size={16} />
        )}
      </button>
    </div>
  );
}

// ─── Upload Form ──────────────────────────────────────────────────────────────

interface UploadFormProps {
  onSuccess: () => void;
}

function UploadForm({ onSuccess }: UploadFormProps) {
  const { t } = useTranslation(["dashboard"]);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [docType, setDocType] = useState("company_regulation");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_TYPES = [
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];

  const handleFileSelect = (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError(t("dashboard:regulations.upload.errors.unsupportedType"));
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError(t("dashboard:regulations.upload.errors.fileTooLarge"));
      return;
    }
    setFile(f);
    setError(null);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }, [title, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError(t("dashboard:regulations.upload.errors.noFile")); return; }
    if (!title.trim()) { setError(t("dashboard:regulations.upload.errors.noTitle")); return; }

    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("docType", docType);
      const res = await regulationApi.upload(fd);
      setSuccess(res.message);
      setFile(null);
      setTitle("");
      setDescription("");
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t("dashboard:regulations.upload.errors.uploadFailed");
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form className="reg-upload-form" onSubmit={handleSubmit} id="reg-upload-form">
      {/* Drop Zone */}
      <div
        className={`reg-dropzone ${dragging ? "reg-dropzone--active" : ""} ${file ? "reg-dropzone--has-file" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label={t("dashboard:regulations.upload.dropzone")}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        id="reg-dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.docx,.doc"
          style={{ display: "none" }}
          id="reg-file-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelect(f);
          }}
        />
        {file ? (
          <div className="reg-file-preview">
            <File size={32} className="reg-file-icon" />
            <div>
              <p className="reg-file-name">{file.name}</p>
              <p className="reg-file-size">{formatBytes(file.size)}</p>
            </div>
          </div>
        ) : (
          <div className="reg-dropzone-content">
            <div className="reg-dropzone-icon">
              <FilePlus2 size={36} />
            </div>
            <p className="reg-dropzone-main">{t("dashboard:regulations.upload.dropzone")}</p>
            <p className="reg-dropzone-sub">{t("dashboard:regulations.upload.dropzoneSub")}</p>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="reg-form-fields">
        <div className="reg-field-group">
          <label className="reg-label" htmlFor="reg-title-input">
            {t("dashboard:regulations.upload.titleLabel")} <span className="reg-required">{t("dashboard:regulations.upload.required")}</span>
          </label>
          <input
            id="reg-title-input"
            type="text"
            className="reg-input"
            placeholder={t("dashboard:regulations.upload.titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="reg-form-row">
          <div className="reg-field-group">
            <label className="reg-label" htmlFor="reg-doctype-select">
              {t("dashboard:regulations.upload.doctypeLabel")}
            </label>
            <select
              id="reg-doctype-select"
              className="reg-select"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              {DOC_TYPES.map((v) => (
                <option key={v} value={v}>{t(`dashboard:regulations.docType.${v}`)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="reg-field-group">
          <label className="reg-label" htmlFor="reg-desc-input">
            {t("dashboard:regulations.upload.descLabel")}
          </label>
          <textarea
            id="reg-desc-input"
            className="reg-textarea"
            rows={2}
            placeholder={t("dashboard:regulations.upload.descPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="reg-alert reg-alert--error" role="alert">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {success && (
        <div className="reg-alert reg-alert--success" role="status">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      <button
        id="btn-upload-regulation"
        type="submit"
        className="reg-submit-btn"
        disabled={uploading || !file}
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="spin-animation" />
            {t("dashboard:regulations.upload.submittingBtn")}
          </>
        ) : (
          <>
            <Bot size={16} />
            {t("dashboard:regulations.upload.submitBtn")}
          </>
        )}
      </button>
    </form>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  reg,
  onConfirm,
  onCancel,
  deleting,
  error,
}: {
  reg: Regulation;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation(["dashboard"]);
  return (
    <div className="reg-dialog-overlay" role="dialog" aria-modal="true" id="reg-delete-dialog">
      <div className="reg-dialog">
        <div className="reg-dialog-icon">
          <Trash2 size={28} />
        </div>
        <h3 className="reg-dialog-title">{t("dashboard:regulations.deleteDialog.title")}</h3>
        <p
          className="reg-dialog-body"
          dangerouslySetInnerHTML={{
            __html: t("dashboard:regulations.deleteDialog.body", { title: reg.title }),
          }}
        />
        {error && (
          <div
            className="reg-alert reg-alert--error"
            role="alert"
            style={{ marginBottom: "1rem" }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        <div className="reg-dialog-actions">
          <button
            id="btn-cancel-delete-reg"
            className="reg-btn-secondary"
            onClick={onCancel}
            disabled={deleting}
          >
            {t("dashboard:regulations.deleteDialog.cancelBtn")}
          </button>
          <button
            id="btn-confirm-delete-reg"
            className="reg-btn-danger"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 size={14} className="spin-animation" />
                {t("dashboard:regulations.deleteDialog.deletingBtn")}
              </>
            ) : (
              <>
                <Trash2 size={14} />
                {t("dashboard:regulations.deleteDialog.confirmBtn")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RegulationsPage() {
  const { t } = useTranslation(["dashboard", "menu"]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Regulation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchRegulations = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await regulationApi.list();
      setRegulations(res.data);
      setLoaded(true);
    } catch {
      setLoadError(t("dashboard:regulations.list.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Load on mount
  useEffect(() => {
    fetchRegulations();
  }, [fetchRegulations]);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await regulationApi.remove(toDelete._id);
      setRegulations((prev) => prev.filter((r) => r._id !== toDelete._id));
      setToDelete(null);
    } catch (err: unknown) {
      // Surface the server message (or a generic fallback) so the user knows
      // why the delete failed and can decide whether to retry / refresh.
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t("dashboard:regulations.deleteDialog.deleteFailed", {
          defaultValue: "Không xóa được tài liệu. Vui lòng thử lại.",
        });
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = regulations.filter((r) => r.status === "active").length;
  const failedCount = regulations.filter((r) => r.status === "failed").length;

  return (
    <div className="reg-page">
      <style>{`
        /* ── Page layout ───────────────────────────────── */
        .reg-page {
          min-height: 100vh;
          padding: 2rem 1.5rem 4rem;
          background: var(--background, #0f1117);
          color: var(--foreground, #e2e8f0);
          font-family: 'Inter', sans-serif;
        }

        /* ── Header ────────────────────────────────────── */
        .reg-header { margin-bottom: 2rem; }
        .reg-header-top {
          display: flex; align-items: flex-start;
          gap: 1rem; flex-wrap: wrap;
        }
        .reg-header-icon {
          width: 52px; height: 52px; border-radius: 14px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          display: flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0;
          box-shadow: 0 4px 20px rgba(99,102,241,0.4);
        }
        .reg-header-text { flex: 1; }
        .reg-header-title {
          font-size: 1.6rem; font-weight: 700;
          background: linear-gradient(90deg, #a78bfa, #6366f1);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          margin: 0 0 0.25rem;
        }
        .reg-header-subtitle {
          font-size: 0.875rem;
          color: var(--text-sub, #94a3b8);
          margin: 0;
        }
        .reg-header-actions {
          display: flex; align-items: center; gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .reg-refresh-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-sub, #94a3b8);
          padding: 0.4rem 0.75rem; border-radius: 8px;
          font-size: 0.8rem; cursor: pointer;
          display: flex; align-items: center; gap: 0.4rem;
          transition: all 0.2s;
        }
        .reg-refresh-btn:hover {
          background: rgba(99,102,241,0.15);
          color: #a78bfa; border-color: rgba(99,102,241,0.3);
        }

        /* ── Stats row ─────────────────────────────────── */
        .reg-stats {
          display: flex; gap: 0.75rem; flex-wrap: wrap;
          margin: 1.25rem 0 0;
        }
        .reg-stat-chip {
          padding: 0.35rem 0.85rem; border-radius: 20px;
          font-size: 0.8rem; font-weight: 500;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .reg-stat-chip--total {
          background: rgba(99,102,241,0.12);
          color: #a78bfa; border: 1px solid rgba(99,102,241,0.25);
        }
        .reg-stat-chip--active {
          background: rgba(34,197,94,0.1);
          color: #4ade80; border: 1px solid rgba(34,197,94,0.25);
        }
        .reg-stat-chip--failed {
          background: rgba(239,68,68,0.1);
          color: #f87171; border: 1px solid rgba(239,68,68,0.25);
        }

        /* ── Grid layout ───────────────────────────────── */
        .reg-grid {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 1.75rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .reg-grid { grid-template-columns: 1fr; }
        }

        /* ── Panel ─────────────────────────────────────── */
        .reg-panel {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 1.5rem;
          backdrop-filter: blur(12px);
        }
        .reg-panel-title {
          font-size: 0.875rem; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: #6366f1; margin: 0 0 1.25rem;
          display: flex; align-items: center; gap: 0.5rem;
        }

        /* ── Upload form ───────────────────────────────── */
        .reg-upload-form { display: flex; flex-direction: column; gap: 1rem; }
        .reg-dropzone {
          border: 2px dashed rgba(99,102,241,0.35);
          border-radius: 12px;
          padding: 2rem 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.25s;
          background: rgba(99,102,241,0.04);
          position: relative;
          overflow: hidden;
        }
        .reg-dropzone:hover,
        .reg-dropzone--active {
          border-color: #6366f1;
          background: rgba(99,102,241,0.1);
          transform: translateY(-2px);
        }
        .reg-dropzone--has-file {
          border-style: solid;
          border-color: rgba(34,197,94,0.5);
          background: rgba(34,197,94,0.05);
        }
        .reg-dropzone-icon {
          width: 60px; height: 60px; border-radius: 14px;
          background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 0.75rem; color: #818cf8;
        }
        .reg-dropzone-main {
          font-size: 0.9rem; font-weight: 500; color: var(--foreground, #e2e8f0);
          margin: 0 0 0.25rem;
        }
        .reg-dropzone-sub {
          font-size: 0.78rem; color: var(--text-sub, #64748b); margin: 0;
        }
        .reg-file-preview {
          display: flex; align-items: center; gap: 1rem;
          justify-content: center;
        }
        .reg-file-icon { color: #6366f1; }
        .reg-file-name {
          font-size: 0.875rem; font-weight: 500;
          color: var(--foreground, #e2e8f0); margin: 0 0 0.2rem;
          word-break: break-all;
        }
        .reg-file-size { font-size: 0.78rem; color: var(--text-sub, #64748b); margin: 0; }

        /* ── Form fields ───────────────────────────────── */
        .reg-form-fields { display: flex; flex-direction: column; gap: 0.75rem; }
        .reg-form-row { display: flex; gap: 0.75rem; }
        .reg-field-group { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; }
        .reg-label { font-size: 0.8rem; font-weight: 500; color: var(--text-sub, #94a3b8); }
        .reg-required { color: #f87171; }
        .reg-input, .reg-select, .reg-textarea {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: var(--foreground, #e2e8f0);
          font-size: 0.875rem; padding: 0.55rem 0.75rem;
          width: 100%; box-sizing: border-box;
          transition: border-color 0.2s;
          outline: none;
        }
        .reg-input::placeholder, .reg-textarea::placeholder {
          color: rgba(148,163,184,0.5);
        }
        .reg-input:focus, .reg-select:focus, .reg-textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .reg-select option { background: #1e1e2e; }
        .reg-textarea { resize: vertical; font-family: inherit; }

        /* ── Alert ─────────────────────────────────────── */
        .reg-alert {
          display: flex; align-items: flex-start; gap: 0.5rem;
          padding: 0.65rem 0.85rem; border-radius: 8px;
          font-size: 0.8rem; line-height: 1.45;
        }
        .reg-alert--error { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
        .reg-alert--success { background: rgba(34,197,94,0.1); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }

        /* ── Submit button ─────────────────────────────── */
        .reg-submit-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; border: none; border-radius: 10px;
          padding: 0.7rem 1.25rem; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 0.5rem;
          transition: all 0.2s; box-shadow: 0 4px 15px rgba(99,102,241,0.35);
        }
        .reg-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.5);
        }
        .reg-submit-btn:disabled {
          opacity: 0.55; cursor: not-allowed; transform: none;
        }

        /* ── Cards list ────────────────────────────────── */
        .reg-cards-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .reg-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 1rem 1.1rem;
          display: flex; align-items: flex-start; gap: 0.9rem;
          transition: all 0.2s;
          animation: reg-card-in 0.35s ease;
        }
        .reg-card:hover {
          border-color: rgba(99,102,241,0.3);
          background: rgba(99,102,241,0.05);
          transform: translateX(3px);
        }
        @keyframes reg-card-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .reg-card-icon-wrap {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
          display: flex; align-items: center; justify-content: center;
          color: #818cf8;
        }
        .reg-card-body { flex: 1; min-width: 0; }
        .reg-card-header {
          display: flex; align-items: center; gap: 0.5rem;
          flex-wrap: wrap; margin-bottom: 0.3rem;
        }
        .reg-card-title {
          font-size: 0.9rem; font-weight: 600;
          color: var(--foreground, #e2e8f0); margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 280px;
        }
        .reg-card-meta {
          font-size: 0.75rem; color: var(--text-sub, #64748b);
          margin: 0 0 0.2rem; display: flex; align-items: center;
          gap: 0.35rem; flex-wrap: wrap;
        }
        .reg-dot { opacity: 0.4; }
        .reg-card-chunks {
          font-size: 0.72rem; color: #4ade80;
          display: flex; align-items: center; gap: 0.3rem;
          margin: 0.25rem 0 0;
        }
        .reg-card-desc {
          font-size: 0.75rem; color: var(--text-sub, #64748b);
          margin: 0.25rem 0 0;
        }
        .reg-card-date {
          font-size: 0.7rem; color: rgba(148,163,184,0.5);
          margin: 0.3rem 0 0;
        }
        .reg-card-delete-btn {
          background: none; border: none; color: rgba(148,163,184,0.4);
          cursor: pointer; padding: 0.35rem; border-radius: 7px;
          transition: all 0.2s; flex-shrink: 0;
          margin-top: 0.1rem;
        }
        .reg-card-delete-btn:hover { background: rgba(239,68,68,0.1); color: #f87171; }
        .reg-card-delete-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Status badges ─────────────────────────────── */
        .reg-status-badge {
          display: inline-flex; align-items: center; gap: 0.3rem;
          padding: 0.2rem 0.55rem; border-radius: 20px;
          font-size: 0.7rem; font-weight: 600; letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .status-active { background: rgba(34,197,94,0.12); color: #4ade80; border: 1px solid rgba(34,197,94,0.25); }
        .status-processing { background: rgba(234,179,8,0.12); color: #facc15; border: 1px solid rgba(234,179,8,0.25); }
        .status-failed { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.25); }
        .status-deleted { background: rgba(148,163,184,0.1); color: #64748b; border: 1px solid rgba(148,163,184,0.15); }

        /* ── Empty + loading states ────────────────────── */
        .reg-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 3rem 1rem; gap: 0.75rem;
          color: var(--text-sub, #64748b); text-align: center;
        }
        .reg-empty-icon {
          width: 64px; height: 64px; border-radius: 16px;
          background: rgba(99,102,241,0.08);
          display: flex; align-items: center; justify-content: center;
          color: rgba(99,102,241,0.5);
        }
        .reg-empty p { font-size: 0.875rem; margin: 0; }
        .reg-empty-hint { font-size: 0.78rem !important; }
        .reg-error-msg {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.8rem; color: #f87171;
          background: rgba(239,68,68,0.08); border-radius: 8px;
          padding: 0.65rem 0.85rem;
        }
        .reg-loading-row {
          display: flex; align-items: center; justify-content: center;
          gap: 0.5rem; padding: 2rem; color: var(--text-sub, #64748b);
          font-size: 0.875rem;
        }

        /* ── Info banner ───────────────────────────────── */
        .reg-info-banner {
          background: rgba(99,102,241,0.08);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 10px; padding: 0.7rem 1rem;
          display: flex; align-items: flex-start; gap: 0.6rem;
          font-size: 0.78rem; color: #a78bfa; line-height: 1.5;
          margin-bottom: 1.25rem;
        }
        .reg-info-banner svg { flex-shrink: 0; margin-top: 1px; }

        /* ── Dialog ────────────────────────────────────── */
        .reg-dialog-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
        }
        .reg-dialog {
          background: #1a1b26; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px; padding: 2rem; width: 100%; max-width: 420px;
          text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.5);
          animation: reg-dialog-in 0.25s ease;
        }
        @keyframes reg-dialog-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        .reg-dialog-icon {
          width: 56px; height: 56px; border-radius: 14px;
          background: rgba(239,68,68,0.15);
          display: flex; align-items: center; justify-content: center;
          color: #f87171; margin: 0 auto 1rem;
        }
        .reg-dialog-title {
          font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem;
          color: var(--foreground, #e2e8f0);
        }
        .reg-dialog-body {
          font-size: 0.875rem; color: var(--text-sub, #94a3b8);
          margin: 0 0 1.5rem; line-height: 1.6;
        }
        .reg-dialog-actions {
          display: flex; gap: 0.75rem; justify-content: center;
        }
        .reg-btn-secondary {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--foreground, #e2e8f0);
          padding: 0.55rem 1.25rem; border-radius: 8px;
          font-size: 0.875rem; cursor: pointer; transition: all 0.2s;
        }
        .reg-btn-secondary:hover { background: rgba(255,255,255,0.1); }
        .reg-btn-danger {
          background: #dc2626; color: #fff; border: none;
          padding: 0.55rem 1.25rem; border-radius: 8px;
          font-size: 0.875rem; cursor: pointer;
          display: flex; align-items: center; gap: 0.4rem;
          transition: all 0.2s;
        }
        .reg-btn-danger:hover:not(:disabled) { background: #ef4444; }
        .reg-btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }

        /* ── Spin animation ────────────────────────────── */
        .spin-animation { animation: reg-spin 1s linear infinite; }
        @keyframes reg-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Page Header */}
      <header className="reg-header">
        <div className="reg-header-top">
          <div className="reg-header-icon">
            <Bot size={26} />
          </div>
          <div className="reg-header-text">
            <h1 className="reg-header-title">{t("dashboard:regulations.pageTitle")}</h1>
            <p className="reg-header-subtitle">
              {t("dashboard:regulations.pageSubtitle")}
            </p>
          </div>
          <div className="reg-header-actions">
            <button
              id="btn-refresh-regulations"
              className="reg-refresh-btn"
              onClick={fetchRegulations}
              disabled={loading}
              aria-label={t("dashboard:regulations.refreshBtn")}
            >
              <RefreshCw size={14} className={loading ? "spin-animation" : ""} />
              {t("dashboard:regulations.refreshBtn")}
            </button>
          </div>
        </div>
        {loaded && (
          <div className="reg-stats">
            <span className="reg-stat-chip reg-stat-chip--total">
              <BookOpen size={12} />
              {t("dashboard:regulations.stats.total", { count: regulations.length })}
            </span>
            {activeCount > 0 && (
              <span className="reg-stat-chip reg-stat-chip--active">
                <CheckCircle2 size={12} />
                {t("dashboard:regulations.stats.active", { count: activeCount })}
              </span>
            )}
            {failedCount > 0 && (
              <span className="reg-stat-chip reg-stat-chip--failed">
                <AlertCircle size={12} />
                {t("dashboard:regulations.stats.failed", { count: failedCount })}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Body */}
      <div className="reg-grid">
        {/* Left: Upload panel */}
        <aside className="reg-panel">
          <p className="reg-panel-title">
            <Upload size={14} />
            {t("dashboard:regulations.upload.panelTitle")}
          </p>
          <div className="reg-info-banner">
            <Info size={14} />
            <span
              dangerouslySetInnerHTML={{
                __html: t("dashboard:regulations.upload.infoBanner"),
              }}
            />
          </div>
          <UploadForm onSuccess={fetchRegulations} />
        </aside>

        {/* Right: List panel */}
        <section className="reg-panel">
          <p className="reg-panel-title">
            <ChevronRight size={14} />
            {t("dashboard:regulations.list.panelTitle", { count: regulations.length })}
          </p>

          {loading && !loaded && (
            <div className="reg-loading-row">
              <Loader2 size={18} className="spin-animation" />
              {t("dashboard:regulations.list.loading")}
            </div>
          )}

          {loadError && (
            <div className="reg-error-msg">
              <AlertCircle size={16} />
              {loadError}
            </div>
          )}

          {!loading && !loadError && regulations.length === 0 && (
            <div className="reg-empty">
              <div className="reg-empty-icon">
                <BookOpen size={28} />
              </div>
              <p>{t("dashboard:regulations.list.empty")}</p>
              <p className="reg-empty-hint">
                {t("dashboard:regulations.list.emptyHint")}
              </p>
            </div>
          )}

          {regulations.length > 0 && (
            <div className="reg-cards-list">
              {regulations.map((reg) => (
                <RegulationCard
                  key={reg._id}
                  reg={reg}
                  onDelete={(id) => setToDelete(regulations.find((r) => r._id === id) ?? null)}
                  deleting={deleting && toDelete?._id === reg._id}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Delete confirm dialog */}
      {toDelete && (
        <DeleteConfirmDialog
          reg={toDelete}
          onConfirm={handleDelete}
          onCancel={() => {
            setToDelete(null);
            setDeleteError(null);
          }}
          deleting={deleting}
          error={deleteError}
        />
      )}
    </div>
  );
}
