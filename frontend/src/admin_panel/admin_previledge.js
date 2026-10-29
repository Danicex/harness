
import { clearAdminToken, getAdminToken, setAdminToken } from "@/lib/adminApi";
import adminApi from "@/lib/adminApi";
// The TOTP secret never touches the frontend. The admin types the 6-digit
// code from their authenticator app, the backend returns a 15-minute token,
// and adminApi attaches it to every request automatically.

export const admin_logout = () => clearAdminToken();
export const is_admin_logged_in = () => Boolean(getAdminToken());

export const admin_login = async (code) => {
    try {
        const response = await adminApi.post("/admin/login", { code });
        setAdminToken(response.data.access_token);
        return response.data;
    } catch (error) {
        const status = error?.response?.status;
        if (status === 429) throw new Error("Too many attempts. Try again in a few minutes.");
        if (status === 401) throw new Error("Invalid or already-used code.");
        throw new Error("Login failed.");
    }
};

export const get_all_users = async () => {
    const response = await adminApi.get("/admin/all_users");
    return response.data;
};

export const get_user_staff = async (user_id) => {
    const response = await adminApi.get(`/admin/staff/${user_id}`);
    return response.data;
};

export const get_user_sub = async (user_id) => {
    const response = await adminApi.get(`/admin/user_sub/${user_id}`);
    return response.data;
};

// Allowed statuses: active | suspended | deactivated
export const set_user_status = async (user_id, status) => {
    const response = await adminApi.put(`/admin/accounts/${user_id}/status/${status}`);
    return response.data;
};

export const freze_user = (user_id) => set_user_status(user_id, "suspended");
export const freeze_user = freze_user; // correctly spelled alias
export const unfreeze_user = (user_id) => set_user_status(user_id, "active");
export const deactivate_user = (user_id) => set_user_status(user_id, "deactivated");

// add_user_sub and delete_user still have no backend endpoints.