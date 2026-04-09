"use client";

import { Camera, Upload } from "lucide-react";

export default function PhotosPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Job Photos</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">Before &amp; after photos from completed jobs.</p>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-5">
          <Camera className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">No photos yet</h2>
        <p className="text-sm text-[#6b7280] max-w-sm mb-8">
          Photos are uploaded by your team from the mobile app during job visits. They will appear here once captured.
        </p>
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 max-w-sm w-full">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white mb-1">Photo uploads</p>
              <p className="text-xs text-[#6b7280]">
                File upload integration requires cloud storage configuration (S3 or Supabase Storage). This feature will be enabled in a future update.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
