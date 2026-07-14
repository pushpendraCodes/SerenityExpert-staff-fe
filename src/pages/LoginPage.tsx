import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, ShieldCheck, Sparkles } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearError, resetOtp, sendOtp, verifyOtp } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/Button";
import { normalizePhone } from "@/lib/utils";

const OTP_LENGTH = 6;

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, otpSent, devOtp, error, isAuthenticated } = useAppSelector((s) => s.auth);
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const otp = otpDigits.join("");

  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (otpSent) inputsRef.current[0]?.focus();
  }, [otpSent]);

  useEffect(() => {
    if (!devOtp) return;
    const digits = devOtp.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
    setOtpDigits(Array.from({ length: OTP_LENGTH }, (_, i) => digits[i] || ""));
  }, [devOtp]);

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    await dispatch(sendOtp(normalizePhone(phone)));
  };

  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(verifyOtp({ phone: normalizePhone(phone), otp }));
    if (verifyOtp.fulfilled.match(result)) navigate("/");
  };

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl items-center gap-12 px-4 py-10 lg:px-6">
      <div className="hidden flex-1 lg:block">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Expert / Staff Portal
        </span>
        <h1 className="mt-5 text-4xl font-bold leading-tight text-ink">
          Manage consultations,<br />earnings & availability.
        </h1>
        <p className="mt-4 max-w-md text-muted">
          Go online, accept calls, chat with users, and track weekly payouts — all from one dashboard.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-ink-soft">
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Approved experts only
          </li>
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> Real-time call & chat requests
          </li>
        </ul>
      </div>

      <div className="card w-full max-w-md overflow-hidden">
        <div className="bg-linear-to-br from-primary to-primary-dark px-8 py-7 text-white">
          <p className="text-sm text-white/80">SerenityExpert Staff</p>
          <h2 className="mt-2 text-2xl font-bold">{otpSent ? "Enter OTP" : "Expert login"}</h2>
        </div>

        <div className="p-8">
          {!otpSent ? (
            <form onSubmit={onSend} className="space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-soft">Registered mobile</span>
                <div className="flex h-12 items-center gap-2 rounded-xl border border-border px-4">
                  <span className="text-sm text-muted">+91</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9200000001"
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    required
                  />
                </div>
              </label>
              {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <Button type="submit" loading={loading} disabled={phone.length < 10} className="w-full" size="lg">
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={onVerify} className="space-y-5">
              <button type="button" onClick={() => dispatch(resetOtp())} className="text-sm text-primary hover:underline">
                Change number
              </button>

              {devOtp && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-amber-700">Dev OTP</p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-amber-900">{devOtp}</p>
                </div>
              )}

              <div className="flex justify-between gap-2">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    value={digit}
                    onChange={(e) => setDigit(i, e.target.value)}
                    inputMode="numeric"
                    maxLength={1}
                    className="h-12 w-11 rounded-xl border border-border text-center text-lg font-semibold outline-none focus:border-primary sm:w-12"
                  />
                ))}
              </div>

              {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <Button type="submit" loading={loading} disabled={otp.length < OTP_LENGTH} className="w-full" size="lg">
                Verify & enter portal
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
