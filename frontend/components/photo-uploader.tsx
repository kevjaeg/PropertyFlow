"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Upload, X, GripVertical, ImagePlus, Loader2 } from "lucide-react";

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string;
  position: number;
}

interface PhotoUploaderProps {
  listingId: string;
  photos: Photo[];
  onPhotosChange: () => void;
}

const MAX_PHOTOS = 50;

function SortablePhoto({
  photo,
  index,
  onDelete,
}: {
  photo: Photo;
  index: number;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white"
    >
      <div className="relative aspect-square">
        <Image
          src={photo.thumbnail_url}
          alt={`Photo ${index + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 33vw, 150px"
        />

        {/* Hero badge for first photo */}
        {index === 0 && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-blue-600 text-white text-xs">Hero</Badge>
          </div>
        )}

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-black/50 rounded p-1"
        >
          <GripVertical className="size-4 text-white" />
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(photo.id)}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 rounded-full p-1"
        >
          <X className="size-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}

export function PhotoUploader({
  listingId,
  photos,
  onPhotosChange,
}: PhotoUploaderProps) {
  const [localPhotos, setLocalPhotos] = useState<Photo[]>(photos);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Keep local photos in sync with props
  useState(() => {
    setLocalPhotos(photos);
  });

  // Update local state when props change
  if (
    photos.length !== localPhotos.length ||
    photos.some((p, i) => p.id !== localPhotos[i]?.id)
  ) {
    setLocalPhotos(photos);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = MAX_PHOTOS - localPhotos.length;

      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_PHOTOS} photos per listing`);
        return;
      }

      if (fileArray.length > remaining) {
        toast.warning(
          `Only uploading ${remaining} of ${fileArray.length} photos (limit: ${MAX_PHOTOS})`
        );
      }

      const filesToUpload = fileArray.slice(0, remaining);
      setUploading(true);
      setUploadCount(filesToUpload.length);

      let successCount = 0;
      for (const file of filesToUpload) {
        try {
          await api.uploadFile(`/listings/${listingId}/photos`, file);
          successCount++;
        } catch (err) {
          toast.error(
            `Failed to upload ${file.name}: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      }

      setUploading(false);
      setUploadCount(0);

      if (successCount > 0) {
        toast.success(
          `${successCount} photo${successCount > 1 ? "s" : ""} uploaded`
        );
        onPhotosChange();
      }
    },
    [listingId, localPhotos.length, onPhotosChange]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(e.target.files);
        // Reset input so the same file can be selected again
        e.target.value = "";
      }
    },
    [uploadFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        // Filter to only image files
        const imageFiles = Array.from(e.dataTransfer.files).filter((f) =>
          f.type.startsWith("image/")
        );
        if (imageFiles.length > 0) {
          uploadFiles(imageFiles);
        } else {
          toast.error("Please drop image files only");
        }
      }
    },
    [uploadFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = localPhotos.findIndex((p) => p.id === active.id);
      const newIndex = localPhotos.findIndex((p) => p.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Optimistic update
      const newPhotos = arrayMove(localPhotos, oldIndex, newIndex);
      setLocalPhotos(newPhotos);

      try {
        await api.put(`/listings/${listingId}/photos/order`, {
          photo_ids: newPhotos.map((p) => p.id),
        });
        onPhotosChange();
      } catch (err) {
        // Revert on error
        setLocalPhotos(localPhotos);
        toast.error(
          err instanceof Error ? err.message : "Failed to reorder photos"
        );
      }
    },
    [localPhotos, listingId, onPhotosChange]
  );

  const handleDelete = useCallback(
    async (photoId: string) => {
      if (!window.confirm("Delete this photo?")) return;

      try {
        await api.delete(`/listings/${listingId}/photos/${photoId}`);
        toast.success("Photo deleted");
        onPhotosChange();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete photo"
        );
      }
    },
    [listingId, onPhotosChange]
  );

  const atLimit = localPhotos.length >= MAX_PHOTOS;
  const nearLimit = localPhotos.length >= MAX_PHOTOS - 5;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Photos ({localPhotos.length}/{MAX_PHOTOS})
        </h3>
        {nearLimit && !atLimit && (
          <span className="text-sm text-amber-600">
            {MAX_PHOTOS - localPhotos.length} remaining
          </span>
        )}
      </div>

      {/* Drop zone */}
      {!atLimit && (
        <div
          ref={dropZoneRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">
                Uploading {uploadCount} photo{uploadCount > 1 ? "s" : ""}...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="size-8 text-gray-400" />
              <p className="text-sm text-gray-600">
                Drag and drop photos here, or click to select
              </p>
              <p className="text-xs text-gray-400">
                JPG, PNG, WebP up to 20MB each
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {atLimit && (
        <p className="text-sm text-amber-600">
          Maximum {MAX_PHOTOS} photos reached. Delete a photo to upload more.
        </p>
      )}

      {/* Photo grid with drag-and-drop */}
      {localPhotos.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localPhotos.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {localPhotos.map((photo, index) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  index={index}
                  onDelete={handleDelete}
                />
              ))}

              {/* Add more button inline */}
              {!atLimit && !uploading && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <ImagePlus className="size-6" />
                  <span className="text-xs">Add</span>
                </button>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
