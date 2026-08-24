import { useState, useEffect } from "react";
import { Building2, ShieldCheck, Save, Upload, Trash2, Download, Eye, RefreshCw } from "lucide-react";
import { BRAND, SettingsTopBar } from "./_shared"; // Assuming _shared contains BRAND and SettingsTopBar
import api, { getSelectedCompanyId, resolveFileUrl } from "@/lib/api";
import { toast } from "sonner";
import webdialLogo from "@/assets/webdial-jpg.png";

type CompanyInfo = {
  organizationName: string;
  address: string;
  addressLine2: string;
  website: string;
  description: string;
  country: string;
  currency: string;
  officeHoursStart: string;
  officeHoursEnd: string;
  logoUrl?: string;
};

type KYCDetails = {
  idDocType: string;
  idDocUrl?: string;
  regDocType: string;
  regDocUrl?: string;
};

type FilePreview = {
  url: string;
  type: string;
  name: string;
};

type UniqueContactsSetting = "list" | "system";

function isImageUrl(url?: string) {
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(url);
}

export default function GeneralSettingsPage() {  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    organizationName: "",
    address: "",
    addressLine2: "",
    website: "",
    description: "",
    country: "India",
    currency: "₹",
    officeHoursStart: "10:00",
    officeHoursEnd: "19:00",
    logoUrl: "",
  });
  const [kycDetails, setKycDetails] = useState<KYCDetails>({
    idDocType: "Aadhar Card",
    idDocUrl: "",
    regDocType: "GST Certificate",
    regDocUrl: "",
  });
  const [uniqueMode, setUniqueMode] = useState<UniqueContactsSetting>("list"); // Kept for potential future use

  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingIdDoc, setUploadingIdDoc] = useState(false);
  const [uploadingRegDoc, setUploadingRegDoc] = useState(false);
  const [removingField, setRemovingField] = useState<string | null>(null);
  const [idDocPreview, setIdDocPreview] = useState<FilePreview | null>(null);
  const [regDocPreview, setRegDocPreview] = useState<FilePreview | null>(null);
  const [logoLoadError, setLogoLoadError] = useState(false);

  const selectedCompanyId = getSelectedCompanyId();
  const isCompanySelected = Boolean(selectedCompanyId);

  useEffect(() => {
    setLogoLoadError(false);
  }, [companyInfo.logoUrl]);

  const getKycUploadUrlFromResponse = (res: any, docUrlKey: string, docType: string) => {
    if (!res) return "";
    const normalize = (value: unknown) =>
      typeof value === "string" && value.trim() ? value : undefined;

    return (
      normalize(res?.[docUrlKey]) ??
      normalize(res?.[docType]) ??
      normalize(res?.url) ??
      normalize(res?.fileUrl) ??
      normalize(res?.documentUrl) ??
      normalize(res?.location) ??
      normalize(res?.path) ??
      normalize(res?.data?.[docUrlKey]) ??
      normalize(res?.data?.[docType]) ??
      normalize(res?.data?.url) ??
      normalize(res?.data?.fileUrl) ??
      normalize(res?.data?.documentUrl) ??
      normalize(res?.data?.location) ??
      normalize(res?.data?.path) ??
      ""
    );
  };

  const refreshKycDetails = async () => {
    try {
      const kycRes = await api.getKYCDetails();
      if (kycRes) setKycDetails((prev) => ({ ...prev, ...kycRes }));
      return kycRes;
    } catch {
      return null;
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [companyRes, kycRes, uniqueRes] = await Promise.all([
        api.getCompanyInfo(),
        api.getKYCDetails(),
        api.getUniqueContactsSetting(),
      ]);
  
      if (companyRes) setCompanyInfo((prev) => ({ ...prev, ...companyRes }));
      if (kycRes) setKycDetails((prev) => ({ ...prev, ...kycRes }));
      if (uniqueRes?.mode) setUniqueMode(uniqueRes.mode); // Kept for potential future use
    } catch (err: any) {
      toast.error(err?.message || "Failed to load general settings");
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
    void loadSettings();
    // Reload whenever the selected company changes elsewhere (e.g. sidebar
    // dropdown or Team page) so General always reflects the current tenant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompanySelected]);

  const handleUpdateCompanyInfo = async () => {
    if (!isCompanySelected) {
      toast.error("Select a specific company first");
      return;
    }
    try {
      await api.updateCompanyInfo(companyInfo);
      toast.success("Company information updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update company information");
    }
  };

  const handleUploadLogo = async (file: File) => {
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await api.uploadCompanyLogo(formData);
      if (res?.logoUrl) setCompanyInfo((prev) => ({ ...prev, logoUrl: res.logoUrl }));
      toast.success("Logo uploaded");
      void loadSettings(); // Reload all settings to get the latest logo URL
      localStorage.setItem('ifox_logo_updated', Date.now().toString());
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await api.removeCompanyLogo();
      setCompanyInfo((prev) => ({ ...prev, logoUrl: "" }));
      toast.success("Logo removed");
      void loadSettings(); // Reload all settings to clear the logo URL
      localStorage.setItem('ifox_logo_updated', Date.now().toString());
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove logo");
    }
  };

  const handleUploadKYC = async (
  file: File,
  docType: "idDoc" | "regDoc"
) => {
  if (!isCompanySelected) {
    toast.error("Select a specific company first");
    return;
  }

  const docUrlKey = docType === "idDoc" ? "idDocUrl" : "regDocUrl";

  if (docType === "idDoc") {
    setUploadingIdDoc(true);
  } else {
    setUploadingRegDoc(true);
  }

  try {
    const formData = new FormData();

    formData.append(docType, file);
    formData.append("docType", docType);

    const res =
      docType === "idDoc"
        ? await api.uploadKYCIdDoc(formData)
        : await api.uploadKYCRegDoc(formData);

    let uploadedUrl = getKycUploadUrlFromResponse(res, docUrlKey, docType);

    if (!uploadedUrl) {
      const latestKyc = await api.getKYCDetails();
      uploadedUrl = latestKyc?.[docUrlKey] || latestKyc?.[docType] || "";
    }

    if (!uploadedUrl) {
      throw new Error("Upload succeeded but backend did not return file URL");
    }

    setKycDetails((prev) => ({
      ...prev,
      [docUrlKey]: uploadedUrl,
    }));

    if (docType === "idDoc") {
      setIdDocPreview(null);
    } else {
      setRegDocPreview(null);
    }

    const latestKyc = await api.getKYCDetails();

    if (latestKyc) {
      setKycDetails((prev) => ({
        ...prev,
        ...latestKyc,
        [docUrlKey]: latestKyc[docUrlKey] || prev[docUrlKey] || uploadedUrl,
      }));
    }

    toast.success("Document uploaded successfully");
  } catch (err: any) {
    toast.error(err?.message || "Upload failed");
  } finally {
    if (docType === "idDoc") {
      setUploadingIdDoc(false);
    } else {
      setUploadingRegDoc(false);
    }
  }
};


  const handleRemoveKYC = async (docType: "idDoc" | "regDoc") => {
    if (!isCompanySelected) {
      toast.error("Select a specific company first");
      return;
    }

    const docUrlKey = docType === "idDoc" ? "idDocUrl" : "regDocUrl";
    setRemovingField(docType);

    try {
      await api.removeKYCDocument(docType);
      setKycDetails((prev) => ({ ...prev, [docUrlKey]: "" }));
      docType === "idDoc" ? setIdDocPreview(null) : setRegDocPreview(null);
      toast.success("Document removed");
      await refreshKycDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove document");
    } finally {
      setRemovingField(null);
    }
  };

  const handleUpdateKYC = async () => {
    if (!isCompanySelected) {
      toast.error("Select a specific company first");
      return;
    }
    try {
      await api.updateKYCDetails({
        idDocType: kycDetails.idDocType,
        regDocType: kycDetails.regDocType,
      });
      toast.success("KYC details updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update KYC details");
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SettingsTopBar title="General" />
        <div className="space-y-6 max-w-[1400px] mx-auto">Loading settings...</div>
      </div>
    );
  }

  return (    
    <div className="p-6 space-y-6">
      <SettingsTopBar title="General" />
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {!isCompanySelected && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
            You're viewing your own details ("All Team" selected). Company Information, KYC and
            Unique Contacts here belong to YOU, not any company. Select a specific company from
            the sidebar to view or edit that company's information.
          </div>
        )}

        {/* Company Information */}
        <Section heading="Company Information" icon={<Building2 className="w-5 h-5" />}>
          <div className="flex flex-col items-center mb-6 gap-3">
            <img
              src={companyInfo.logoUrl && !logoLoadError ? resolveFileUrl(companyInfo.logoUrl) : webdialLogo}
              alt={companyInfo.logoUrl && !logoLoadError ? "Logo" : "Web Dial Logo"}
              className="w-28 h-28 object-contain rounded-lg border"
              onError={() => setLogoLoadError(true)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => document.getElementById("logo-upload")?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-medium disabled:opacity-50"
                disabled={uploadingLogo}
                style={{ backgroundColor: BRAND }}
              >
                <Upload className="w-4 h-4" /> {uploadingLogo ? "UPLOADING..." : "UPLOAD LOGO"}
              </button>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUploadLogo(file);
                  e.target.value = "";
                }}
              />
              {companyInfo.logoUrl && (
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-500 text-white text-sm font-medium"
                  onClick={handleRemoveLogo}
                >
                  <Trash2 className="w-4 h-4" /> REMOVE
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 text-center max-w-xs">
              {isCompanySelected
                ? "This logo belongs to the selected company only."
                : "This logo is your own — it won't be shared with any company."}
            </p>
          </div>

          <div className="grid gap-4">
            <Field
              label="Organization Name"
              value={companyInfo.organizationName}
              onChange={(e) => setCompanyInfo({ ...companyInfo, organizationName: e.target.value })}
            />
            <Field
              label="Address"
              value={companyInfo.address}
              onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
              placeholder="Enter address"
            />
            <Field
              label="Address Line 2"
              value={companyInfo.addressLine2}
              onChange={(e) => setCompanyInfo({ ...companyInfo, addressLine2: e.target.value })}
              placeholder="Enter address line 2"
            />
            <Field
              label="Website"
              value={companyInfo.website}
              onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })}
              placeholder="https://www.example.com"
            />
            <Field
              label="Description"
              value={companyInfo.description}
              onChange={(e) => setCompanyInfo({ ...companyInfo, description: e.target.value })}
              placeholder="Enter description"
            />
            <Field
              label="Country"
              value={companyInfo.country}
              onChange={(e) => setCompanyInfo({ ...companyInfo, country: e.target.value })}
            />
            <Field
              label="Currency"
              value={companyInfo.currency}
              onChange={(e) => setCompanyInfo({ ...companyInfo, currency: e.target.value })}
            />
            <div>
              <label className="text-sm text-gray-600">Office Hours</label>
              <div className="grid grid-cols-2 gap-4 mt-1">
                <Field
                  label="Start Time"
                  type="time"
                  value={companyInfo.officeHoursStart}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, officeHoursStart: e.target.value })}
                  small
                />
                <Field
                  label="End Time"
                  type="time"
                  value={companyInfo.officeHoursEnd}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, officeHoursEnd: e.target.value })}
                  small
                />
              </div>
            </div>
            <button
              className="mt-2 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-white text-sm font-semibold mx-auto disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
              disabled={!isCompanySelected}
              onClick={handleUpdateCompanyInfo}
            >
              <Save className="w-4 h-4" /> UPDATE ORGANIZATION
            </button>
          </div>
        </Section>

        {/* KYC Details */}
        <Section heading="KYC Details" icon={<ShieldCheck className="w-5 h-5" />}>
          <p className="text-sm text-gray-600 mb-3">
            Please upload 2 of the following documents to verify your account with us
          </p>

          {/* Personal ID Document */}
          <p className="text-sm font-medium mb-2">Personally identify document (any one)</p>
          <div className="flex flex-wrap gap-4 mb-3 text-sm">
            {["Aadhar Card", "PAN", "Voter Card", "Driving License", "Passport"].map((o) => (
              <label key={o} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="idDoc"
                  checked={kycDetails.idDocType === o}
                  onChange={() => setKycDetails({ ...kycDetails, idDocType: o })}
                  style={{ accentColor: BRAND }}
                  disabled={!isCompanySelected}
                />
                {o}
              </label>
            ))}
          </div>
          <KycFileSlot
            docLabel={kycDetails.idDocType}
            url={kycDetails.idDocUrl}
            preview={idDocPreview}
            uploading={uploadingIdDoc}
            removing={removingField === "idDoc"}
            disabled={!isCompanySelected}
            onFileSelect={(file) =>
              setIdDocPreview({
                url: URL.createObjectURL(file),
                type: file.type,
                name: file.name,
              })
            }
            onUpload={(file) => handleUploadKYC(file, "idDoc")}
            onRemove={() => handleRemoveKYC("idDoc")}
          />

          {/* Company Registration Document */}
          <p className="text-sm font-medium mt-6 mb-2">Company registration information (any one)</p>
          <div className="flex flex-wrap gap-4 mb-3 text-sm">
            {["GST Certificate", "MoA", "Trade License", "Udyam"].map((o) => (
              <label key={o} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="regDoc"
                  checked={kycDetails.regDocType === o}
                  onChange={() => setKycDetails({ ...kycDetails, regDocType: o })}
                  style={{ accentColor: BRAND }}
                  disabled={!isCompanySelected}
                />
                {o}
              </label>
            ))}
          </div>
          <KycFileSlot
            docLabel={kycDetails.regDocType}
            url={kycDetails.regDocUrl}
            preview={regDocPreview}
            uploading={uploadingRegDoc}
            removing={removingField === "regDoc"}
            disabled={!isCompanySelected}
            onFileSelect={(file) =>
              setRegDocPreview({
                url: URL.createObjectURL(file),
                type: file.type,
                name: file.name,
              })
            }
            onUpload={(file) => handleUploadKYC(file, "regDoc")}
            onRemove={() => handleRemoveKYC("regDoc")}
          />
          <button
            className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-white text-sm font-semibold mx-auto block disabled:opacity-50"
            style={{ backgroundColor: BRAND }}
            disabled={!isCompanySelected}
            onClick={handleUpdateKYC}
          >
            <Save className="w-4 h-4 inline mr-1" /> SAVE
          </button>
        </Section>
      </div>
    </div>
  );
}


function KycFileSlot({
  docLabel,
  url,
  preview,
  uploading,
  removing,
  disabled,
  onUpload,
  onFileSelect,
  onRemove,
}: {
  docLabel: string;
  url?: string;
  preview?: FilePreview | null;
  uploading: boolean;
  removing: boolean;
  disabled: boolean;
  onUpload: (file: File) => void;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const remoteUrl = url ? resolveFileUrl(url) : "";
const displayUrl = remoteUrl || preview?.url || "";

  const isImage = preview
    ? preview.type.startsWith("image/")
    : isImageUrl(remoteUrl);

  const isPdf = preview
    ? preview.type === "application/pdf"
    : remoteUrl.toLowerCase().endsWith(".pdf");

  const isDoc = preview
    ? preview.type.includes("msword") ||
      preview.type.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml"
      )
    : remoteUrl.toLowerCase().endsWith(".doc") ||
      remoteUrl.toLowerCase().endsWith(".docx");

  const fileName =
    preview?.name ||
    decodeURIComponent(remoteUrl.split("/").pop() || "") ||
    "Document";

  const downloadUrl = preview?.url || remoteUrl;

  const handleDownload = async () => {
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();

      const objectUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <div className="border rounded-xl bg-white p-4">
      {displayUrl && (
        <div className="mb-4 flex justify-center">
          {isImage ? (
            <img
              src={displayUrl}
              alt={docLabel}
              className="w-72 h-72 object-contain rounded-xl border bg-white shadow-sm"
            />
          ) : (
            <div className="w-full max-w-md border rounded-xl p-4 bg-gray-50 flex items-center gap-4">
              <div className="text-5xl">
                {isPdf ? "📕" : isDoc ? "📝" : "📁"}
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="font-semibold text-sm truncate">
                  {fileName}
                </div>

                <div className="text-xs text-gray-500">
                  {isPdf
                    ? "PDF Document"
                    : isDoc
                    ? "Word Document"
                    : "File"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm">
          {displayUrl ? "Re-upload" : "Upload File"}

          <input
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                onFileSelect(file);
                onUpload(file);
              }

              e.target.value = "";
            }}
          />
        </label>

        {displayUrl && (
          <>
            <a
              href={displayUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View
            </a>

            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>

            <button
              type="button"
              onClick={onRemove}
              disabled={disabled || removing}
              className="px-4 py-2 border rounded-lg text-red-600 text-sm hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              Remove
            </button>
          </>
        )}
      </div>

      {uploading && (
        <div className="mt-3 text-blue-600 text-sm">
          Uploading...
        </div>
      )}
    </div>
  );
}

function Section({
  heading,
  icon,
  children,
}: {
  heading: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div
        className="px-6 py-3 text-white text-sm font-semibold flex items-center justify-between"
        style={{ backgroundColor: BRAND }}
      >
        <div className="flex items-center gap-2">{icon}</div>
        <span>{heading}</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  small,
  type = "text",
  readOnly,
}: {
  label: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  small?: boolean;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type} 
        readOnly={readOnly}
        className={`w-full border rounded-md px-3 ${small ? "py-1.5" : "py-2"} text-sm outline-none focus:border-[${BRAND}]`}
        style={{ borderColor: "#e5e7eb" }}
      />
    </div>
  );
}