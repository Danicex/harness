import { useState } from "react";
import { admin_login } from "./admin_previledge";
import { useNavigate } from "react-router-dom";

export default function AdminLogin({ onSuccess }) {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate()

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await admin_login(code);
            setCode("");
            onSuccess?.();
            navigate('/admin_panel')
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={submit} style={{ maxWidth: 320, margin: "4rem auto" }}>
            <h2>Admin sign in</h2>
            <label htmlFor="code">Authenticator code</label>
            <input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                autoFocus
                style={{ display: "block", width: "100%", margin: "0.5rem 0" }}
            />
            {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6}>
                {loading ? "Checking..." : "Sign in"}
            </button>
        </form>
    );
}