"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Label } from "@/components/ui/Label";
import { VideoUploadPreview } from "@/components/admin/content/VideoUploadPreview";
import {
  getVideoBanner,
  saveVideoBanner,
} from "@/app/actions/site-content";
import { VideoBannerContent } from "@/types";

import { useAlert } from "@/contexts/AlertContext";

export default function VideoBannerPage() {
  const [formData, setFormData] = useState<VideoBannerContent>({
    _id: "homepage-custom-cake-video",
    videoUrl: "",
    buttonText: "",
    linkUrl: "",
    isActive: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    const fetchContent = async () => {
      const content = await getVideoBanner();
      if (content) {
        setFormData(content);
      }
      setLoading(false);
    };
    fetchContent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const result = await saveVideoBanner(formData);
    if (result.success) {
      showAlert("Video banner saved successfully!", "success");
    } else {
      showAlert("Failed to save changes.", "error");
    }
    setSaving(false);
  };

  if (loading) return <div className="p-xl">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-lg">
      <div className="flex items-center justify-between mb-xl">
        <h1 className="font-heading text-h2 text-primary">
          Homepage Video Banner
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-xl bg-card-background p-xl rounded-large border border-border"
      >
        {/* Video Upload Section */}
        <div className="space-y-sm">
          <Label className="block font-bold">Video Asset</Label>
          <VideoUploadPreview
            videoUrl={formData.videoUrl}
            onUpload={(url) =>
              setFormData((prev) => ({ ...prev, videoUrl: url }))
            }
            onRemove={() => setFormData((prev) => ({ ...prev, videoUrl: "" }))}
          />
          <p className="text-small text-muted-foreground">
            Supported formats: .mp4, .mov
          </p>
        </div>

        {/* Text Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div className="space-y-sm">
            <Label htmlFor="buttonText" className="block font-bold">
              Button Text
            </Label>
            <Input
              id="buttonText"
              value={formData.buttonText}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, buttonText: e.target.value }))
              }
              placeholder="e.g. Order Custom Cake"
            />
          </div>
          <div className="space-y-sm">
            <Label htmlFor="linkUrl" className="block font-bold">
              Button Link
            </Label>
            <Input
              id="linkUrl"
              value={formData.linkUrl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, linkUrl: e.target.value }))
              }
              placeholder="e.g. /custom-order"
            />
          </div>
        </div>

        {/* Visibility Toggle */}
        <div className="flex items-center gap-md p-md bg-subtleBackground rounded-medium">
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, isActive: checked }))
            }
          />
          <Label
            className="font-bold cursor-pointer"
            onClick={() =>
              setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))
            }
          >
            Activate Banner on Homepage
          </Label>
        </div>

        <div className="pt-md border-t border-border">
          <Button type="submit" disabled={saving} className="w-full md:w-auto">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
