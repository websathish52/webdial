import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import api, { getSelectedCompanyId } from "@/lib/api";
import { SettingsTopBar } from "./_shared";

function PasswordField({ label, value, onChange, visible, onToggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <Input type={visible ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} className="pr-10" />
        <button type="button" onClick={onToggle} aria-label={visible ? `Hide ${label}` : `Show ${label}`} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function ChangePasswordPage() {
  const [user, setUser] = useState<{ id: string; name?: string; email?: string; username?: string } | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(() => getSelectedCompanyId());
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const [isCompanyAccount, setIsCompanyAccount] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accountError, setAccountError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountUsername, setAccountUsername] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAccountPassword, setShowAccountPassword] = useState(false);

  useEffect(() => {
    const loadAccount = async () => {
      setIsLoading(true);
      setAccountError("");
      try {
        const response = await api.me();
        const companyId = getSelectedCompanyId();
        setSelectedCompanyId(companyId);
        const currentUserIsSuperAdmin = String(response?.user?.role || "").toLowerCase() === "superadmin";
        setIsSuperAdmin(currentUserIsSuperAdmin);
        if (currentUserIsSuperAdmin && companyId) {
          const companyResponse = await api.getCompanyAccount(companyId);
          setSelectedCompanyName(companyResponse?.company?.companyName || "Selected company");
          setUser(companyResponse?.account || null);
          setIsCompanyAccount(true);
          if (!companyResponse?.account) {
            setAccountError("This company does not have an Admin login account yet.");
          }
          return;
        }
        setUser(response?.user || null);
        setIsCompanyAccount(false);
      } catch (err: any) {
        setUser(null);
        setAccountError(err?.message || "Failed to load account details");
        toast.error(err?.message || "Failed to load account details");
      } finally {
        setIsLoading(false);
      }
    };
    void loadAccount();
  }, [selectedCompanyId]);

  if (isLoading) {
    return <div className="p-6"><SettingsTopBar title="Change Password" /><div className="mt-6 rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading account details...</div></div>;
  }

  if (!user) {
    if (!selectedCompanyId || !isSuperAdmin) {
      return <div className="p-6"><SettingsTopBar title="Change Password" /><div className="mt-6 rounded-xl border bg-card p-6 text-sm text-muted-foreground">{accountError || "Account details are unavailable."}</div></div>;
    }

    const createCompanyAccount = async () => {
      if (!accountName.trim() || !accountEmail.trim() || !accountPassword) {
        toast.error("Name, email and password are required");
        return;
      }
      if (accountPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      setIsCreatingAccount(true);
      try {
        const response = await api.registerUser(
          accountName.trim(),
          accountEmail.trim(),
          accountPassword,
          "Admin",
          accountUsername.trim() || undefined,
          undefined,
          selectedCompanyId,
        );
        setUser({
          id: response?.user?.id || "",
          name: accountName.trim(),
          email: accountEmail.trim(),
          username: response?.user?.username || accountUsername.trim() || undefined,
        });
        setIsCompanyAccount(true);
        setAccountError("");
        toast.success("Company login account created");
      } catch (err: any) {
        toast.error(err?.message || "Could not create company login account");
      } finally {
        setIsCreatingAccount(false);
      }
    };

    return (
      <div className="p-6 space-y-6">
        <SettingsTopBar title="Change Password" />
        <div className="bg-card rounded-xl border p-6 space-y-4 max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold">Create Company Login</h2>
          <p className="text-sm text-muted-foreground">{selectedCompanyName || "Selected company"} does not have an Admin login account yet.</p>
          <div><Label>Full name</Label><Input value={accountName} onChange={e => setAccountName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={accountEmail} onChange={e => setAccountEmail(e.target.value)} /></div>
          <div><Label>Username (optional)</Label><Input value={accountUsername} onChange={e => setAccountUsername(e.target.value)} /></div>
          <PasswordField label="Initial password" value={accountPassword} onChange={setAccountPassword} visible={showAccountPassword} onToggle={() => setShowAccountPassword(value => !value)} />
          <Button className="bg-primary" onClick={createCompanyAccount} disabled={isCreatingAccount}>{isCreatingAccount ? "Creating..." : "Create company login"}</Button>
        </div>
      </div>
    );
  }

  const save = async () => {
    if (!currentPassword) {
      toast.error("Current password is required");
      return;
    }
    if (!newPassword) {
      toast.error("New password is required");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      if (isCompanyAccount && selectedCompanyId) {
        await api.changeCompanyAccountPassword(selectedCompanyId, currentPassword, newPassword);
      } else {
        await api.changePassword(currentPassword, newPassword);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully");

    } catch (err: any) {
      const message = String(err?.message || "");
      if (/current password does not match/i.test(message)) {
        toast.error("Current password is wrong. Enter the correct old password.");
      } else if (/password must be at least 6 characters/i.test(message)) {
        toast.error("New password is too short. Use at least 6 characters.");
      } else if (/failed to fetch|networkerror|load failed/i.test(message)) {
        toast.error("Cannot connect to the server. Check that the backend is running and try again.");
      } else if (/unauthorized|not authorized|token/i.test(message)) {
        toast.error("Your session has expired. Please login again.");
      } else {
        toast.error(message || "Unable to change password. Please try again.");
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
        <SettingsTopBar title="Change Password" />
        <div className="bg-card rounded-xl border p-6 space-y-4 max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold">{isCompanyAccount ? `${selectedCompanyName} Login` : "General"}</h2>
            <div><Label>Full name</Label><Input value={user?.name ?? ""} readOnly /></div>
            <div><Label>Email</Label><Input value={user?.email ?? ""} readOnly /></div>
            {user?.username && <div><Label>Username</Label><Input value={user.username} readOnly /></div>}
            <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} visible={showCurrentPassword} onToggle={() => setShowCurrentPassword(value => !value)} />
            <PasswordField label="New password" value={newPassword} onChange={setNewPassword} visible={showNewPassword} onToggle={() => setShowNewPassword(value => !value)} />
            <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword(value => !value)} />
            <Button className="bg-primary" onClick={save}>Save changes</Button>
        </div>
    </div>
  );
}

export default ChangePasswordPage;
