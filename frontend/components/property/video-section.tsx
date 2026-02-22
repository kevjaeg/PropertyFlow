"use client";

import MuxPlayer from "@mux/mux-player-react";

interface Video {
  id: string;
  mux_playback_id: string | null;
  title: string | null;
  status: string;
}

interface VideoSectionProps {
  videos: Video[];
}

export function VideoSection({ videos }: VideoSectionProps) {
  const readyVideos = videos.filter(
    (v) => v.status === "ready" && v.mux_playback_id
  );

  if (readyVideos.length === 0) return null;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Video Tour</h2>
      <div className="space-y-4">
        {readyVideos.map((video) => (
          <div key={video.id} className="overflow-hidden rounded-lg">
            <MuxPlayer
              playbackId={video.mux_playback_id!}
              metadata={{
                video_title: video.title || "Property Video",
              }}
              streamType="on-demand"
              autoPlay={false}
              className="w-full aspect-video"
            />
            {video.title && (
              <p className="mt-2 text-sm text-gray-500">{video.title}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
