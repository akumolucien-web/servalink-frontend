import { useState, type FormEvent } from "react";
import { Images, Plus, Trash2 } from "lucide-react";
import { api, ApiError, uploadImage } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { ImagePicker } from "../../components/domain/Provider";
import { Button } from "../../components/ui/Button";
import { Banner, CardSkeleton, EmptyState, ErrorState, PageHeader } from "../../components/ui/Display";
import { TextField } from "../../components/ui/Field";
import { Modal, useConfirm, useToast } from "../../components/ui/Overlay";
import { useT } from "../../i18n/I18nProvider";
import { useResource } from "../../lib/useResource";

export function ProviderGalleryPage() {
  const { session } = useAuth();
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const gallery = useResource(() => api.providerGallery(session!.sub), [session?.sub]);
  const [adding, setAdding] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const close = () => { setAdding(false); setFile(null); setCaption(""); setError(undefined); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) { setError(t("pg.errChoose")); return; }
    setBusy(true); setError(undefined);
    try {
      const photo_key = await uploadImage(file, "GALLERY");
      await api.createGalleryItem({ photo_key, caption: caption.trim() });
      toast.success(t("pg.added"));
      close(); await gallery.reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("pg.addFailed"));
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: t("pg.removeTitle"), confirmLabel: t("pg.removePhoto"), tone: "danger", message: t("pg.removeMsg") }))) return;
    try { await api.deleteGalleryItem(id); toast.success(t("pg.removed")); }
    catch (caught) { toast.error(caught instanceof ApiError ? caught.message : t("pg.removeFailed")); }
    await gallery.reload();
  };

  return (
    <>
      <PageHeader title={t("pg.title")} subtitle={t("pg.sub")}
        actions={<Button icon={<Plus size={16} />} onClick={() => setAdding(true)}>{t("pg.add")}</Button>} />
      {gallery.loading && !gallery.data ? <CardSkeleton rows={1} />
        : gallery.error ? <ErrorState error={gallery.error} onRetry={gallery.reload} title={t("pg.error")} />
          : gallery.data!.length === 0 ? (
            <div className="card"><EmptyState icon={<Images size={24} />} title={t("pg.emptyTitle")}
              action={<Button onClick={() => setAdding(true)}>{t("pg.addFirst")}</Button>}>
              {t("pg.emptyText")}
            </EmptyState></div>
          ) : (
            <div className="gallery-grid">
              {gallery.data!.map((item) => (
                <figure key={item.gallery_item_id} className="gallery-item" style={{ margin: 0 }}>
                  {item.photo_url && <img src={item.photo_url} alt={item.caption || t("pp.workAlt")} loading="lazy" />}
                  <Button className="remove" size="sm" variant="light" icon={<Trash2 size={14} />} aria-label={t("pg.removePhoto")} onClick={() => remove(item.gallery_item_id)} />
                  {item.caption && <figcaption>{item.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}
      <Modal open={adding} title={t("pg.addTitle")} onClose={close}>
        <form onSubmit={submit} noValidate>
          <div className="modal-body form stack">
            {error && <Banner tone="danger">{error}</Banner>}
            <ImagePicker label={t("f.photo")} optional={false} file={file} onChange={setFile} />
            <TextField label={t("pg.caption")} optional maxLength={200} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
          <div className="modal-foot"><Button variant="ghost" onClick={close}>{t("common.cancel")}</Button><Button type="submit" loading={busy}>{t("pg.upload")}</Button></div>
        </form>
      </Modal>
    </>
  );
}
