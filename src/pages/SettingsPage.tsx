import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatPeso } from "@/domain/money/format";
import { useAuth } from "@/features/auth/authContext";
import { useMe } from "@/features/me/useMe";
import { canDeleteAccount, updateDisplayName } from "@/features/me/api";
import { usePeople } from "@/features/people/usePeople";
import { InstallSection } from "@/features/pwa/InstallSection";
import { PaymentQrImage } from "@/features/payments/PaymentQrImage";
import { clearPaymentQr, uploadPaymentQr, validatePaymentQrFile } from "@/features/payments/qr";
import { requireSupabase } from "@/data/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/usePageTitle";
import { FileField } from "@/ui/primitives/FileField";
import { Icon } from "@/ui/primitives/Icon";

export function SettingsPage() {
  const { data: me } = useMe();
  const { data: people, isLoading: peopleLoading } = usePeople();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameNotice, setNameNotice] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [qrLabel, setQrLabel] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrNotice, setQrNotice] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const qrInputRef = useRef<HTMLInputElement | null>(null);

  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  usePageTitle("Settings");

  useEffect(() => {
    if (me) setName(me.displayName);
  }, [me]);

  async function saveName() {
    setNameBusy(true);
    setNameError(null);
    setNameNotice(null);
    try {
      await updateDisplayName(name.trim());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["people"] })
      ]);
      setNameNotice("Name saved.");
    } catch (caught) {
      setNameError(getErrorMessage(caught, "Could not save your name"));
    } finally {
      setNameBusy(false);
    }
  }

  async function uploadQr() {
    if (!me || !qrFile) {
      setQrError("Choose a PNG or JPEG image first.");
      return;
    }
    setQrBusy(true);
    setQrError(null);
    setQrNotice(null);
    try {
      validatePaymentQrFile(qrFile);
      await uploadPaymentQr({
        personId: me.id,
        file: qrFile,
        label: qrLabel,
        previousPath: me.paymentQrPath
      });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setQrFile(null);
      setQrLabel("");
      if (qrInputRef.current) qrInputRef.current.value = "";
      setQrNotice("Payment QR saved.");
    } catch (caught) {
      setQrError(getErrorMessage(caught, "Could not save the payment QR"));
    } finally {
      setQrBusy(false);
    }
  }

  async function removeQr() {
    if (!me) return;
    setQrBusy(true);
    setQrError(null);
    setQrNotice(null);
    try {
      await clearPaymentQr(me.id, me.paymentQrPath);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setQrNotice("Payment QR removed.");
    } catch (caught) {
      setQrError(getErrorMessage(caught, "Could not remove the payment QR"));
    } finally {
      setQrBusy(false);
    }
  }

  async function deleteAccount() {
    setAccountBusy(true);
    setAccountError(null);
    try {
      const allowance = await canDeleteAccount();
      if (!allowance.canDelete) {
        setAccountError(
          `Settle ${formatPeso(
            allowance.youOweCentavos + allowance.owedToYouCentavos
          )} before deleting your account.`
        );
        return;
      }
      if (!window.confirm("Delete your account? Your past expenses keep your name.")) {
        return;
      }
      const { error } = await requireSupabase().functions.invoke("delete-account");
      if (error) throw error;
      await signOut();
    } catch (caught) {
      setAccountError(getErrorMessage(caught, "Could not delete your account"));
    } finally {
      setAccountBusy(false);
    }
  }

  return (
    <div className="page page--settings">
      <header className="page-head">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Your profile, people, payment QR, and account.</p>
      </header>

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">Profile</h2>
        </div>
        <label className="field">
          <span>Display name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} />
        </label>
        <label className="field">
          <span>Email</span>
          <input value={me?.email ?? ""} readOnly />
        </label>
        {nameError ? <p className="form-error">{nameError}</p> : null}
        {nameNotice ? <p className="form-notice">{nameNotice}</p> : null}
        <div className="form-actions">
          <button className="primary-action" type="button" onClick={() => void saveName()} disabled={nameBusy}>
            <Icon name="check" />
            {nameBusy ? "Saving." : "Save name"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">People</h2>
        </div>
        <p className="panel-copy">
          People you share an expense with. Not joined means they have not claimed their name
          yet.
        </p>
        {peopleLoading ? <p className="panel-copy">Loading people.</p> : null}

        <div className="member-list">
          {(people ?? []).map((person) => (
            <div className="member-row" key={person.id}>
              <div className="row-main">
                <p className="row-title">
                  {person.displayName}
                  {person.isSelf ? " (you)" : ""}
                </p>
                <p className="row-sub">
                  {person.status === "pending"
                    ? "Not joined yet"
                    : person.status === "former"
                      ? "Former account"
                      : "Active"}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="panel-copy">
          To invite someone, add their name to an expense and share that expense link.
        </p>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">Payment QR</h2>
        </div>
        <p className="panel-copy">
          One private QR for the people who share a debt with you. They scan it with their banking
          app.
        </p>
        {me?.paymentQrPath ? (
          <div className="qr-inline">
            <PaymentQrImage path={me.paymentQrPath} name={me.displayName} full />
            <p className="panel-copy">{me.paymentQrLabel ?? "Payment QR"}</p>
          </div>
        ) : null}
        <label className="field">
          <span>Label</span>
          <input
            value={qrLabel}
            onChange={(event) => setQrLabel(event.target.value)}
            placeholder="GCash"
            maxLength={40}
          />
        </label>
        <FileField
          label="Payment QR image"
          accept="image/png,image/jpeg"
          file={qrFile}
          onSelect={setQrFile}
          hint="PNG or JPEG, up to 2 MB."
          inputRef={qrInputRef}
        />
        {qrError ? <p className="form-error">{qrError}</p> : null}
        {qrNotice ? <p className="form-notice">{qrNotice}</p> : null}
        <div className="form-actions">
          <button className="primary-action" type="button" onClick={() => void uploadQr()} disabled={qrBusy}>
            <Icon name="upload" />
            {qrBusy ? "Saving." : me?.paymentQrPath ? "Replace QR" : "Upload QR"}
          </button>
        </div>
        {me?.paymentQrPath ? (
          <div className="form-actions">
            <button
              className="text-action is-danger"
              type="button"
              onClick={() => void removeQr()}
              disabled={qrBusy}
            >
              <Icon name="trash" />
              {qrBusy ? "Removing." : "Remove QR"}
            </button>
          </div>
        ) : null}
      </section>

      <InstallSection />

      <section className="panel panel--account">
        <div className="section-head">
          <h2 className="panel-title">Account</h2>
        </div>
        <div className="form-actions">
          <button className="secondary-action" type="button" onClick={() => void signOut()}>
            <Icon name="log-out" />
            Sign out
          </button>
          <button
            className="text-action is-danger"
            type="button"
            onClick={() => void deleteAccount()}
            disabled={accountBusy}
          >
            <Icon name="trash" />
            {accountBusy ? "Working." : "Delete account"}
          </button>
        </div>
        {accountError ? <p className="form-error">{accountError}</p> : null}
        <p className="panel-copy">
          Deletion is blocked while you owe or are owed anything. Past expenses keep the name
          recorded on them.
        </p>
      </section>
    </div>
  );
}
