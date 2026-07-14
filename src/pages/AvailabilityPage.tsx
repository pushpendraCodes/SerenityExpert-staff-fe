import { type FormEvent, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProfile, setExpert } from "@/store/slices/authSlice";
import { apiPut, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { AvailabilitySlot, Expert } from "@/types";

const DAYS = [
  { id: "mon", label: "Monday" },
  { id: "tue", label: "Tuesday" },
  { id: "wed", label: "Wednesday" },
  { id: "thu", label: "Thursday" },
  { id: "fri", label: "Friday" },
  { id: "sat", label: "Saturday" },
  { id: "sun", label: "Sunday" },
];

export default function AvailabilityPage() {
  const dispatch = useAppDispatch();
  const expert = useAppSelector((s) => s.auth.expert);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (!expert) return;
    setSlots(
      expert.availabilitySchedule?.length
        ? expert.availabilitySchedule
        : DAYS.map((d) => ({ day: d.id, startTime: "09:00", endTime: "18:00" }))
    );
  }, [expert]);

  const toggleDay = (day: string) => {
    setSlots((prev) => {
      const exists = prev.find((s) => s.day === day);
      if (exists) return prev.filter((s) => s.day !== day);
      return [...prev, { day, startTime: "09:00", endTime: "18:00" }];
    });
  };

  const updateSlot = (day: string, patch: Partial<AvailabilitySlot>) => {
    setSlots((prev) => prev.map((s) => (s.day === day ? { ...s, ...patch } : s)));
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await apiPut<Expert>("/experts/me/availability", {
        availabilitySchedule: slots,
      });
      if (res.data) dispatch(setExpert(res.data));
      setMessage("Availability schedule saved");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Availability schedule</h1>
        <p className="mt-1 text-sm text-muted">
          Set weekly hours. Use the header Online/Busy/Offline toggle for live status.
        </p>
      </div>

      <form onSubmit={onSave} className="card space-y-3 p-5">
        {DAYS.map((day) => {
          const slot = slots.find((s) => s.day === day.id);
          const active = Boolean(slot);
          return (
            <div
              key={day.id}
              className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center"
            >
              <label className="flex min-w-36 items-center gap-2 text-sm font-semibold text-ink">
                <input type="checkbox" checked={active} onChange={() => toggleDay(day.id)} />
                {day.label}
              </label>
              {active && slot && (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(day.id, { startTime: e.target.value })}
                    className="h-10 rounded-lg border border-border px-3 text-sm"
                  />
                  <span className="text-muted">to</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(day.id, { endTime: e.target.value })}
                    className="h-10 rounded-lg border border-border px-3 text-sm"
                  />
                </div>
              )}
            </div>
          );
        })}

        {error && <p className="text-sm text-danger">{error}</p>}
        {message && <p className="text-sm text-mint-text">{message}</p>}

        <Button type="submit" loading={saving}>Save schedule</Button>
      </form>
    </div>
  );
}
