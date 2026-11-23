import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { computeExpenseShares } from "@/domain/money/computeExpenseShares";
import type { ExpenseDraft } from "@/domain/money/types";
import { todayInManila } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { useBack } from "@/lib/useBack";
import { usePageTitle } from "@/lib/usePageTitle";
import { useOnlineStatus } from "@/features/realtime/useOnlineStatus";
import { AddPersonSheet } from "@/features/people/AddPersonSheet";
import { PersonPicker } from "@/features/people/PersonPicker";
import { usePeople } from "@/features/people/usePeople";
import { useMe } from "@/features/me/useMe";
import { Icon } from "@/ui/primitives/Icon";
import { CoverageEditor } from "./CoverageEditor";
import { ItemEditor, type ExpenseItemDraft } from "./ItemEditor";
import { SharePreview } from "./SharePreview";
import { expenseDetail, saveExpense } from "./api";
import type { ExpenseCoverage } from "./types";

function draftItem(personId: string): ExpenseItemDraft {
  return {
    key: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    amountCentavos: 0,
    assignedPersonId: personId
  };
}

export function ExpenseEditorPage() {
  const { expenseId } = useParams();
  const isEditing = Boolean(expenseId);
  const navigate = useNavigate();
  const back = useBack(isEditing ? `/expenses/${expenseId}` : "/");
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const { data: me } = useMe();
  const { data: people } = usePeople();

  const detailQuery = useQuery({
    queryKey: ["expense", expenseId],
    queryFn: () => expenseDetail(expenseId as string),
    enabled: isEditing
  });
  const detail = detailQuery.data;

  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayInManila());
  const [payer, setPayer] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [items, setItems] = useState<ExpenseItemDraft[]>([]);
  const [coverage, setCoverage] = useState<ExpenseCoverage[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingNames, setPendingNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  usePageTitle(isEditing ? "Edit expense" : "New expense");

  useEffect(() => {
    if (initialized.current) return;
    if (isEditing) {
      if (!detail) return;
      setDescription(detail.expense.description);
      setDate(detail.expense.expenseDate);
      setPayer(detail.expense.payerPersonId);
      setSelected(detail.people.map((person) => person.id));
      setItems(
        detail.items.map((item) => ({
          key: `item-${item.id}`,
          name: item.name,
          amountCentavos: item.amountCentavos,
          assignedPersonId: item.assignedPersonId
        }))
      );
      setCoverage(detail.coverage);
      initialized.current = true;
    } else if (me && people) {
      setSelected([me.id]);
      setPayer(me.id);
      setItems([draftItem(me.id)]);
      setDate(todayInManila());
      initialized.current = true;
    }
  }, [detail, isEditing, me, people]);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const person of people ?? []) map.set(person.id, person.displayName);
    if (me) map.set(me.id, me.displayName);
    for (const [personId, name] of Object.entries(pendingNames)) {
      if (!map.has(personId)) map.set(personId, name);
    }
    return map;
  }, [people, me, pendingNames]);

  const pickerPeople = useMemo(() => {
    const map = new Map((people ?? []).map((person) => [person.id, person]));
    for (const personId of selected) {
      if (!map.has(personId)) {
        map.set(personId, {
          id: personId,
          displayName: names.get(personId) ?? "Invited",
          status: "pending",
          isSelf: personId === me?.id,
          hasQr: false,
          createdByMe: true
        });
      }
    }
    return [...map.values()];
  }, [people, selected, names, me]);

  const draft: ExpenseDraft | null = me
    ? {
        creatorPersonId: me.id,
        payerPersonId: payer,
        people: selected,
        items,
        coverage
      }
    : null;

  function handlePeopleChange(nextIds: string[]) {
    const next = me ? [...new Set([me.id, ...nextIds])] : nextIds;
    setSelected(next);

    if (!next.includes(payer)) {
      setPayer(next[0] ?? "");
    }

    const nextItems = items.filter((item) => next.includes(item.assignedPersonId));
    if (nextItems.length === 0 && next.length > 0) {
      nextItems.push(draftItem(next[0]));
    }
    setItems(nextItems);

    setCoverage(
      coverage.filter(
        (entry) =>
          next.includes(entry.coveredPersonId) && next.includes(entry.covererPersonId)
      )
    );
  }

  async function handleSave() {
    if (!me || !draft) return;
    setError(null);
    setStale(false);

    if (!online) {
      setError("Connect to save the expense.");
      return;
    }
    if (description.trim().length < 1) {
      setError("Enter a description.");
      return;
    }
    if (selected.length < 2) {
      setError("Add at least one other person.");
      return;
    }
    if (!selected.includes(payer)) {
      setError("Choose a payer who is on the expense.");
      return;
    }

    try {
      computeExpenseShares(draft);
    } catch (caught) {
      setError(getErrorMessage(caught, "Check the expense."));
      return;
    }

    setSaving(true);
    try {
      const result = await saveExpense(
        {
          id: isEditing ? expenseId : null,
          description: description.trim(),
          expenseDate: date,
          payerPersonId: payer,
          people: selected,
          items: items.map(({ name, amountCentavos, assignedPersonId }) => ({
            name,
            amountCentavos,
            assignedPersonId
          })),
          coverage
        },
        isEditing ? detail?.expense.version ?? null : null
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["ledger"] }),
        queryClient.invalidateQueries({ queryKey: ["activity", "recent"] }),
        queryClient.invalidateQueries({ queryKey: ["expense", result.expenseId] })
      ]);

      if (isEditing) {
        back();
      } else {
        navigate(`/expenses/${result.expenseId}`, { replace: true });
      }
    } catch (caught) {
      const message = getErrorMessage(caught, "Could not save the expense");
      setError(message);
      if (/changed|reload/i.test(message)) setStale(true);
    } finally {
      setSaving(false);
    }
  }

  if (isEditing && detailQuery.isLoading) {
    return <p className="panel-copy">Loading the expense.</p>;
  }

  if (isEditing && detailQuery.error) {
    return (
      <div className="page">
        <p className="form-error" role="alert">
          {getErrorMessage(detailQuery.error, "Could not open the expense")}
        </p>
        <Link className="text-action" to="/expenses">
          <Icon name="chevron-left" />
          Back to all expenses
        </Link>
      </div>
    );
  }

  if (isEditing && detail && !detail.expense.canEdit) {
    return (
      <div className="page">
        <h1 className="page-title">View only</h1>
        <p className="page-sub">Only the creator or payer can edit this expense.</p>
        <Link className="primary-action" to={`/expenses/${expenseId}`}>
          Open the expense
        </Link>
      </div>
    );
  }

  return (
    <div className="page page--editor">
      <header className="page-head">
        <div>
          <button className="text-action" type="button" onClick={back}>
            <Icon name="chevron-left" />
            Back
          </button>
          <h1 className="page-title">{isEditing ? "Edit expense" : "New expense"}</h1>
          <p className="page-sub">Every line belongs to one person.</p>
        </div>
      </header>

      <section className="panel">
        <label className="field">
          <span>Description</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Dinner at Manam"
            maxLength={120}
          />
        </label>
        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Payer</span>
          <select value={payer} onChange={(event) => setPayer(event.target.value)}>
            {selected.map((personId) => (
              <option key={personId} value={personId}>
                {names.get(personId) ?? "Person"}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">People</h2>
        </div>
        <PersonPicker
          people={pickerPeople}
          selected={selected}
          onChange={handlePeopleChange}
          onAdd={() => setAddOpen(true)}
        />
        <p className="panel-copy">Choose 2 to 12 people, including you.</p>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">Items</h2>
        </div>
        <ItemEditor items={items} people={pickerPeople} onChange={setItems} />
      </section>

      <CoverageEditor
        people={pickerPeople}
        payerPersonId={payer}
        coverage={coverage}
        onChange={setCoverage}
      />

      {draft ? <SharePreview draft={draft} names={names} /> : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {stale ? (
        <button
          className="text-action"
          type="button"
          onClick={() => {
            initialized.current = false;
            void detailQuery.refetch();
          }}
        >
          <Icon name="restore" />
          Reload latest
        </button>
      ) : null}
      {!online ? <p className="form-notice">Saving needs a connection.</p> : null}

      <div className="form-actions">
        <button className="primary-action" type="button" onClick={() => void handleSave()} disabled={saving || !online}>
          <Icon name="check" />
          {saving ? "Saving." : "Save expense"}
        </button>
        <button className="secondary-action" type="button" onClick={back}>
          <Icon name="x" />
          Cancel
        </button>
      </div>

      <AddPersonSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(result) => {
          setSelected((current) => [...new Set([...current, result.personId])]);
          setPendingNames((current) => ({
            ...current,
            [result.personId]: result.displayName
          }));
          void queryClient.invalidateQueries({ queryKey: ["people"] });
        }}
      />
    </div>
  );
}
