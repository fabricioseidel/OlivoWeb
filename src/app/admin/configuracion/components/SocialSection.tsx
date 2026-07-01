"use client";

import { ShareIcon } from "@heroicons/react/24/outline";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import type { HandleChange } from "../lib";
import { InputField } from "./fields";

interface SocialSectionProps {
  settings: StoreSettings;
  handleChange: HandleChange;
}

export default function SocialSection({ settings, handleChange }: SocialSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <ShareIcon className="h-5 w-5 text-pink-500" />
          Redes Sociales
        </h2>
        <p className="text-sm text-slate-500 mt-1">Enlaces a tus perfiles</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          label="Facebook"
          value={settings.socialMedia?.facebook || ""}
          onChange={(val) => handleChange(["socialMedia", "facebook"], val)}
          placeholder="https://facebook.com/..."
        />
        <InputField
          label="Instagram"
          value={settings.socialMedia?.instagram || ""}
          onChange={(val) => handleChange(["socialMedia", "instagram"], val)}
          placeholder="https://instagram.com/..."
        />
        <InputField
          label="Twitter / X"
          value={settings.socialMedia?.twitter || ""}
          onChange={(val) => handleChange(["socialMedia", "twitter"], val)}
          placeholder="https://twitter.com/..."
        />
        <InputField
          label="TikTok"
          value={settings.socialMedia?.tiktok || ""}
          onChange={(val) => handleChange(["socialMedia", "tiktok"], val)}
          placeholder="https://tiktok.com/@..."
        />
        <InputField
          label="YouTube"
          value={settings.socialMedia?.youtube || ""}
          onChange={(val) => handleChange(["socialMedia", "youtube"], val)}
          placeholder="https://youtube.com/..."
        />
        <InputField
          label="LinkedIn"
          value={settings.socialMedia?.linkedin || ""}
          onChange={(val) => handleChange(["socialMedia", "linkedin"], val)}
          placeholder="https://linkedin.com/..."
        />
        <InputField
          label="WhatsApp"
          value={settings.socialMedia?.whatsapp || ""}
          onChange={(val) => handleChange(["socialMedia", "whatsapp"], val)}
          placeholder="+56912345678"
        />
      </div>
    </div>
  );
}
