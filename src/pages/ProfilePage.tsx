import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProfile, logout, setExpert } from "@/store/slices/authSlice";
import { apiPut, apiUpload, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { Expert } from "@/types";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, expert } = useAppSelector((s) => s.auth);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("0");
  const [languages, setLanguages] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (!user || !expert) return;
    setName(user.name || "");
    setBio(expert.bio || "");
    setExperience(String(expert.experience || 0));
    setLanguages((expert.languages || []).join(", "));
    setAccountName(expert.bankDetails?.accountName || "");
    setAccountNumber(expert.bankDetails?.accountNumber || "");
    setIfsc(expert.bankDetails?.ifscCode || "");
    setBankName(expert.bankDetails?.bankName || "");
    setUpiId(expert.bankDetails?.upiId || "");
  }, [user, expert]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiPut("/users/me", { name: name.trim() });
      const res = await apiPut<Expert>("/experts/me", {
        bio: bio.trim(),
        experience: Number(experience) || 0,
        languages: languages.split(",").map((l) => l.trim()).filter(Boolean),
        bankDetails: {
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifsc.trim(),
          bankName: bankName.trim(),
          upiId: upiId.trim() || undefined,
        },
      });
      if (res.data) dispatch(setExpert(res.data));
      await dispatch(fetchProfile());
      setMessage("Profile updated");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onAvatar = async (file?: File | null) => {
    if (!file) return;
    const form = new FormData();
    form.append("avatar", file);
    try {
      await apiUpload("/users/me/avatar", form);
      await dispatch(fetchProfile());
      setMessage("Photo updated");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Profile</h1>
          <p className="mt-1 text-sm text-muted">
            Public bio, experience, languages & payout details
          </p>
        </div>
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="lg:hidden"
          onClick={async () => {
            await dispatch(logout());
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>

      <form onSubmit={onSave} className="card space-y-5 p-6">
        <div className="flex items-center gap-4">
          <img
            src={user?.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${user?._id || "expert"}`}
            alt=""
            className="h-16 w-16 rounded-full bg-primary-soft"
          />
          <label className="cursor-pointer text-sm font-medium text-primary hover:underline">
            Change photo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} />
          </label>
        </div>

        <Field label="Display name" value={name} onChange={setName} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-soft">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Experience (years)" value={experience} onChange={setExperience} type="number" />
          <Field label="Languages (comma separated)" value={languages} onChange={setLanguages} />
        </div>

        <div className="rounded-xl bg-surface p-4 text-sm text-muted">
          <p>
            Price: <span className="font-semibold text-ink">₹{expert?.pricePerMinute || 0}/min</span> (set by admin)
          </p>
          <p className="mt-1">
            Schedule days configured:{" "}
            {(expert?.availabilitySchedule || []).map((s) => s.day).join(", ") || "none — set under Availability"}
          </p>
          <p className="mt-1 text-xs">Days reference: {DAYS.join(", ")}</p>
        </div>

        <h2 className="pt-2 text-base font-bold text-ink">Bank details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account name" value={accountName} onChange={setAccountName} />
          <Field label="Account number" value={accountNumber} onChange={setAccountNumber} />
          <Field label="IFSC" value={ifsc} onChange={setIfsc} />
          <Field label="Bank name" value={bankName} onChange={setBankName} />
          <Field label="UPI ID (optional)" value={upiId} onChange={setUpiId} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {message && <p className="text-sm text-mint-text">{message}</p>}

        <Button type="submit" loading={saving}>Save profile</Button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border px-4 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
