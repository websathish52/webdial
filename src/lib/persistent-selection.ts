type SelectionMember = {
  _id?: string;
  id?: string;
  username?: string;
  email?: string;
  companyId?: string | { _id?: string; id?: string };
};

function getIdentity(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const item = value as { _id?: string; id?: string };
    return item._id || item.id || "";
  }
  return String(value);
}

export function getSelectionStorageKey(member: SelectionMember | null | undefined, name: string) {
  if (!member || typeof window === "undefined") return "";
  const userKey = member._id || member.id || member.username || member.email || "current";
  const companyKey = window.localStorage.getItem("ifox_selected_company") || getIdentity(member.companyId) || "current";
  return `ifox_selection_${name}_${companyKey}_${userKey}`;
}

export function readSelection(member: SelectionMember | null | undefined, name: string) {
  const key = getSelectionStorageKey(member, name);
  return key ? window.localStorage.getItem(key) || "" : "";
}

export function writeSelection(member: SelectionMember | null | undefined, name: string, value: string) {
  const key = getSelectionStorageKey(member, name);
  if (key && value) window.localStorage.setItem(key, value);
}
