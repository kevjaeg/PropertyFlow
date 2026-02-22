"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface VideoData {
  id: string;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  title: string | null;
  status: string;
}

interface VideoUploaderProps {
  listingId: string;
  videos: VideoData[];
  onVideosChange: () => void;
}

const MAX_VIDEOS = 2;

function VideoStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ready":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="size-3 mr-1" />
          Ready
        </Badge>
      );
    case "processing":
    case "waiting":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Loader2 className="size-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case "error":
    case "errored":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <AlertCircle className="size-3 mr-1" />
          Error
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-200">
          {status}
        </Badge>
      );
  }
}

function VideoCard({
  video,
  listingId,
  onDelete,
  onStatusUpdate,
}: {
  video: VideoData;
  listingId: string;
  onDelete: (id: string) => void;
  onStatusUpdate: (id: string, status: string) => void;
}) {
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Poll for status updates if video is processing
    if (video.status === "processing" || video.status === "waiting") {
      pollingRef.current = setInterval(async () => {
        try {
          const data = await api.fetch(
            `/listings/${listingId}/videos/${video.id}`
          );
          if (data.status !== video.status) {
            onStatusUpdate(video.id, data.status);
            if (data.status === "ready" || data.status === "error" || data.status === "errored") {
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
            }
          }
        } catch {
          // Silently fail on poll errors
        }
      }, 5000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [video.id, video.status, listingId, onStatusUpdate]);

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        <div className="size-12 rounded bg-gray-100 flex items-center justify-center">
          {video.mux_playback_id && video.status === "ready" ? (
            <img
              src={`https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?width=96&height=96&fit_mode=crop`}
              alt={video.title || "Video"}
              className="size-12 rounded object-cover"
            />
          ) : (
            <Video className="size-6 text-gray-400" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {video.title || "Untitled video"}
          </p>
          <VideoStatusBadge status={video.status} />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(video.id)}
        className="text-gray-400 hover:text-red-500"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

export function VideoUploader({
  listingId,
  videos,
  onVideosChange,
}: VideoUploaderProps) {
  const [localVideos, setLocalVideos] = useState<VideoData[]>(videos);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep local state in sync with props
  if (
    videos.length !== localVideos.length ||
    videos.some(
      (v, i) => v.id !== localVideos[i]?.id || v.status !== localVideos[i]?.status
    )
  ) {
    setLocalVideos(videos);
  }

  const handleStatusUpdate = useCallback(
    (videoId: string, newStatus: string) => {
      setLocalVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, status: newStatus } : v))
      );
      if (newStatus === "ready") {
        toast.success("Video is ready!");
        onVideosChange();
      }
    },
    [onVideosChange]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      if (localVideos.length >= MAX_VIDEOS) {
        toast.error(`Maximum ${MAX_VIDEOS} videos per listing`);
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      try {
        // Step 1: Create video record and get upload URL
        const { video_id, upload_url } = await api.post(
          `/listings/${listingId}/videos`,
          { title: file.name }
        );

        // Step 2: Upload to Mux via the upload URL
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", upload_url);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.send(file);
        });

        toast.success("Video uploaded! Processing...");
        onVideosChange();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to upload video"
        );
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [listingId, localVideos.length, onVideosChange]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleUpload(e.target.files[0]);
        e.target.value = "";
      }
    },
    [handleUpload]
  );

  const handleDelete = useCallback(
    async (videoId: string) => {
      if (!window.confirm("Delete this video?")) return;

      try {
        await api.delete(`/listings/${listingId}/videos/${videoId}`);
        toast.success("Video deleted");
        onVideosChange();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete video"
        );
      }
    },
    [listingId, onVideosChange]
  );

  const atLimit = localVideos.length >= MAX_VIDEOS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Videos ({localVideos.length}/{MAX_VIDEOS})
        </h3>
      </div>

      {/* Existing videos */}
      {localVideos.length > 0 && (
        <div className="space-y-3">
          {localVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              listingId={listingId}
              onDelete={handleDelete}
              onStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>
      )}

      {/* Upload button / progress */}
      {!atLimit && (
        <div>
          {uploading ? (
            <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
              <Loader2 className="size-5 text-blue-500 animate-spin" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Uploading video... {uploadProgress}%
                </p>
                <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Video className="size-4" />
              Add Video
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {atLimit && !uploading && (
        <p className="text-sm text-gray-500">
          Maximum {MAX_VIDEOS} videos reached.
        </p>
      )}
    </div>
  );
}
